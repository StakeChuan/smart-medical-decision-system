import base64
import csv
import hashlib
import hmac
import io
import json
import os
import time
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from openai import APIConnectionError, APIError, APITimeoutError, OpenAI
from sqlalchemy import and_, asc, desc, func, or_, text
from sqlalchemy.orm import Query as SqlAlchemyQuery
from sqlalchemy.orm import Session, selectinload

from app import models, schemas
from app.database import get_db

TOKEN_EXPIRE_SECONDS = int(os.getenv("APP_TOKEN_EXPIRE_SECONDS", "43200"))
TOKEN_SECRET = os.getenv("APP_TOKEN_SECRET", "smart-medical-demo-secret")
TOKEN_ALGORITHM = "HS256"
DASHSCOPE_BASE_URL = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
DASHSCOPE_MODEL = os.getenv("DASHSCOPE_MODEL", "qwen-plus")
DASHSCOPE_TIMEOUT = float(os.getenv("DASHSCOPE_TIMEOUT", "60"))
security = HTTPBearer(auto_error=False)

app = FastAPI(
    title="基于大模型的智慧医疗辅助决策系统",
    description="用于实训展示的智慧医疗辅助决策系统后端接口",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


def raise_http_error(status_code: int, detail: str) -> None:
    raise HTTPException(status_code=status_code, detail=detail)


def format_export_datetime(value: datetime | None) -> str:
    if not value:
        return ""
    return value.strftime("%Y-%m-%d %H:%M:%S")


def csv_export_response(filename: str, headers: list[str], rows: list[list[Any]]) -> Response:
    buffer = io.StringIO(newline="")
    buffer.write("\ufeff")
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def base64_url_encode(raw_text: str) -> str:
    return base64.urlsafe_b64encode(raw_text.encode("utf-8")).decode("utf-8").rstrip("=")


def base64_url_decode(raw_text: str) -> str:
    padding = "=" * (-len(raw_text) % 4)
    return base64.urlsafe_b64decode(f"{raw_text}{padding}".encode("utf-8")).decode("utf-8")


def create_access_token(user: models.User) -> str:
    payload = {
        "user_id": user.id,
        "role": user.role,
        "alg": TOKEN_ALGORITHM,
        "exp": int(time.time()) + TOKEN_EXPIRE_SECONDS,
    }
    payload_text = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    encoded_payload = base64_url_encode(payload_text)
    signature = hmac.new(
        TOKEN_SECRET.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded_payload}.{signature}"


def decode_access_token(token: str) -> dict:
    try:
        encoded_payload, signature = token.split(".", 1)
    except ValueError:
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "登录凭证无效，请重新登录")

    expected_signature = hmac.new(
        TOKEN_SECRET.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "登录凭证无效，请重新登录")

    try:
        payload = json.loads(base64_url_decode(encoded_payload))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "登录凭证无效，请重新登录")

    if payload.get("alg") != TOKEN_ALGORITHM:
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "登录凭证无效，请重新登录")
    if int(payload.get("exp", 0)) < int(time.time()):
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "登录已过期，请重新登录")
    return payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "请先登录后再操作")

    payload = decode_access_token(credentials.credentials)
    user = db.get(models.User, payload.get("user_id"))
    if not user:
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "当前登录用户不存在，请重新登录")
    if not user.is_active:
        raise_http_error(status.HTTP_403_FORBIDDEN, "该账号已被禁用，请联系管理员")
    return user


def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise_http_error(status.HTTP_403_FORBIDDEN, "只有管理员可以访问该功能")
    return current_user


def ensure_doctor_exists(doctor_id: int | None, db: Session) -> models.User | None:
    if doctor_id is None:
        return None
    doctor = db.get(models.User, doctor_id)
    if not doctor or doctor.role != "doctor":
        raise_http_error(status.HTTP_400_BAD_REQUEST, "医生ID无效")
    return doctor


def get_doctor_or_404(doctor_id: int, db: Session) -> models.User:
    doctor = db.get(models.User, doctor_id)
    if not doctor or doctor.role != "doctor":
        raise_http_error(status.HTTP_404_NOT_FOUND, "医生不存在")
    return doctor


def ensure_patient_permission(patient: models.Patient, current_user: models.User) -> None:
    if current_user.role == "admin":
        return
    if patient.doctor_id != current_user.id:
        raise_http_error(status.HTTP_403_FORBIDDEN, "无权访问其他医生的患者数据")


def ensure_consultation_permission(consultation: models.Consultation, current_user: models.User) -> None:
    if current_user.role == "admin":
        return
    patient_doctor_id = consultation.patient.doctor_id if consultation.patient else None
    if consultation.doctor_id != current_user.id and patient_doctor_id != current_user.id:
        raise_http_error(status.HTTP_403_FORBIDDEN, "无权访问其他医生的问诊记录")


def normalize_conversation_user_ids(user_a_id: int, user_b_id: int) -> tuple[int, int]:
    return (user_a_id, user_b_id) if user_a_id < user_b_id else (user_b_id, user_a_id)


def serialize_message_user(user: models.User) -> dict[str, Any]:
    return schemas.MessageUserOut.model_validate(user).model_dump()


def ensure_message_target_permission(target_user: models.User, current_user: models.User) -> None:
    if target_user.id == current_user.id:
        raise_http_error(status.HTTP_400_BAD_REQUEST, "不能给自己发送消息")
    if target_user.role not in {"admin", "doctor"}:
        raise_http_error(status.HTTP_400_BAD_REQUEST, "目标用户不支持消息通讯")
    if not target_user.is_active:
        raise_http_error(status.HTTP_400_BAD_REQUEST, "目标账号已被禁用，无法发送消息")
    if current_user.role == "admin" and target_user.role != "doctor":
        raise_http_error(status.HTTP_403_FORBIDDEN, "管理员只能向医生发送消息")
    if current_user.role == "doctor" and target_user.role not in {"admin", "doctor"}:
        raise_http_error(status.HTTP_403_FORBIDDEN, "只能向管理员或医生发送消息")


def ensure_conversation_permission(conversation: models.MessageConversation, current_user: models.User) -> None:
    if current_user.id not in {conversation.user_one_id, conversation.user_two_id}:
        raise_http_error(status.HTTP_403_FORBIDDEN, "无权访问该会话")


def get_or_create_conversation(
    *,
    db: Session,
    current_user: models.User,
    target_user: models.User,
) -> models.MessageConversation:
    user_one_id, user_two_id = normalize_conversation_user_ids(current_user.id, target_user.id)
    conversation = (
        db.query(models.MessageConversation)
        .filter(models.MessageConversation.user_one_id == user_one_id)
        .filter(models.MessageConversation.user_two_id == user_two_id)
        .first()
    )
    if conversation:
        return conversation

    conversation = models.MessageConversation(user_one_id=user_one_id, user_two_id=user_two_id)
    db.add(conversation)
    db.flush()
    return conversation


def build_conversation_summaries(
    *,
    db: Session,
    current_user: models.User,
) -> list[dict[str, Any]]:
    conversations = (
        db.query(models.MessageConversation)
        .options(
            selectinload(models.MessageConversation.user_one),
            selectinload(models.MessageConversation.user_two),
        )
        .filter(
            or_(
                models.MessageConversation.user_one_id == current_user.id,
                models.MessageConversation.user_two_id == current_user.id,
            )
        )
        .order_by(desc(models.MessageConversation.updated_at), desc(models.MessageConversation.id))
        .all()
    )
    if not conversations:
        return []

    conversation_ids = [item.id for item in conversations]
    message_rows = (
        db.query(models.Message)
        .filter(models.Message.conversation_id.in_(conversation_ids))
        .order_by(
            models.Message.conversation_id.asc(),
            models.Message.created_at.desc(),
            models.Message.id.desc(),
        )
        .all()
    )
    latest_message_map: dict[int, models.Message] = {}
    for message in message_rows:
        latest_message_map.setdefault(message.conversation_id, message)

    unread_rows = (
        db.query(
            models.Message.conversation_id,
            func.count(models.Message.id).label("unread_count"),
        )
        .filter(models.Message.conversation_id.in_(conversation_ids))
        .filter(models.Message.receiver_id == current_user.id)
        .filter(models.Message.is_read == 0)
        .group_by(models.Message.conversation_id)
        .all()
    )
    unread_map = {conversation_id: int(unread_count or 0) for conversation_id, unread_count in unread_rows}

    result = []
    for conversation in conversations:
        peer_user = conversation.user_two if conversation.user_one_id == current_user.id else conversation.user_one
        latest_message = latest_message_map.get(conversation.id)
        result.append(
            {
                "conversation_id": conversation.id,
                "peer_user": serialize_message_user(peer_user),
                "last_message": latest_message.content if latest_message else None,
                "last_message_time": latest_message.created_at if latest_message else conversation.updated_at,
                "unread_count": unread_map.get(conversation.id, 0),
            }
        )
    return result


def build_conversation_messages(
    *,
    db: Session,
    conversation_id: int,
    current_user: models.User,
) -> list[models.Message]:
    conversation = db.get(models.MessageConversation, conversation_id)
    if not conversation:
        raise_http_error(status.HTTP_404_NOT_FOUND, "浼氳瘽涓嶅瓨鍦?")
    ensure_conversation_permission(conversation, current_user)
    return (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc(), models.Message.id.asc())
        .all()
    )


def mark_conversation_read(
    *,
    db: Session,
    conversation_id: int,
    current_user: models.User,
) -> int:
    conversation = db.get(models.MessageConversation, conversation_id)
    if not conversation:
        raise_http_error(status.HTTP_404_NOT_FOUND, "浼氳瘽涓嶅瓨鍦?")
    ensure_conversation_permission(conversation, current_user)

    unread_messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .filter(models.Message.receiver_id == current_user.id)
        .filter(models.Message.is_read == 0)
        .all()
    )
    for message in unread_messages:
        message.is_read = 1
    if unread_messages:
        db.commit()
    return len(unread_messages)


def normalize_patient_payload(
    patient_data: dict,
    current_user: models.User,
    db: Session,
) -> dict:
    if current_user.role == "admin":
        doctor_id = patient_data.get("doctor_id")
        ensure_doctor_exists(doctor_id, db)
        patient_data["doctor_id"] = doctor_id
    else:
        patient_data["doctor_id"] = current_user.id
    return patient_data


def ensure_unique_patient_name(
    *,
    db: Session,
    patient_name: str,
    doctor_id: int | None,
    exclude_patient_id: int | None = None,
) -> None:
    duplicate_query = (
        db.query(models.Patient)
        .filter(models.Patient.name == patient_name)
        .filter(models.Patient.doctor_id == doctor_id)
    )
    if exclude_patient_id is not None:
        duplicate_query = duplicate_query.filter(models.Patient.id != exclude_patient_id)
    if duplicate_query.first():
        raise_http_error(status.HTTP_409_CONFLICT, "该医生名下已存在同名患者")


def find_recent_duplicate_consultation(
    *,
    db: Session,
    patient_id: int,
    doctor_id: int | None,
    chief_complaint: str | None,
    symptoms: str | None,
    present_illness: str | None,
    past_history: str | None,
    examination: str | None,
    window_seconds: int = 30,
) -> models.Consultation | None:
    recent_threshold = datetime.now() - timedelta(seconds=window_seconds)
    return (
        db.query(models.Consultation)
        .filter(models.Consultation.patient_id == patient_id)
        .filter(models.Consultation.doctor_id == doctor_id)
        .filter(models.Consultation.chief_complaint == chief_complaint)
        .filter(models.Consultation.symptoms == symptoms)
        .filter(models.Consultation.present_illness == present_illness)
        .filter(models.Consultation.past_history == past_history)
        .filter(models.Consultation.examination == examination)
        .filter(models.Consultation.created_at >= recent_threshold)
        .order_by(models.Consultation.created_at.desc())
        .first()
    )


def build_doctor_stats_query(
    db: Session,
    keyword: str | None = None,
) -> SqlAlchemyQuery:
    patient_stats = (
        db.query(
            models.Patient.doctor_id.label("doctor_id"),
            func.count(models.Patient.id).label("patient_count"),
        )
        .group_by(models.Patient.doctor_id)
        .subquery()
    )
    consultation_stats = (
        db.query(
            models.Consultation.doctor_id.label("doctor_id"),
            func.count(models.Consultation.id).label("consultation_count"),
            func.max(models.Consultation.created_at).label("last_consultation_time"),
        )
        .group_by(models.Consultation.doctor_id)
        .subquery()
    )
    report_stats = (
        db.query(
            models.Consultation.doctor_id.label("doctor_id"),
            func.count(models.AiReport.id).label("ai_report_count"),
        )
        .join(models.AiReport, models.AiReport.consultation_id == models.Consultation.id)
        .group_by(models.Consultation.doctor_id)
        .subquery()
    )

    query = (
        db.query(
            models.User.id.label("doctor_id"),
            models.User.username.label("username"),
            models.User.real_name.label("real_name"),
            models.User.role.label("role"),
            func.coalesce(patient_stats.c.patient_count, 0).label("patient_count"),
            func.coalesce(consultation_stats.c.consultation_count, 0).label("consultation_count"),
            func.coalesce(report_stats.c.ai_report_count, 0).label("ai_report_count"),
            consultation_stats.c.last_consultation_time.label("last_consultation_time"),
            models.User.is_active.label("is_active"),
        )
        .outerjoin(patient_stats, patient_stats.c.doctor_id == models.User.id)
        .outerjoin(consultation_stats, consultation_stats.c.doctor_id == models.User.id)
        .outerjoin(report_stats, report_stats.c.doctor_id == models.User.id)
        .filter(models.User.role == "doctor")
    )
    if keyword:
        like_keyword = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                models.User.username.like(like_keyword),
                models.User.real_name.like(like_keyword),
            )
        )
    return query


def serialize_doctor_rows(rows) -> list[dict]:
    return [
        {
            "doctor_id": row.doctor_id,
            "username": row.username,
            "real_name": row.real_name,
            "role": row.role,
            "patient_count": int(row.patient_count or 0),
            "consultation_count": int(row.consultation_count or 0),
            "ai_report_count": int(row.ai_report_count or 0),
            "last_consultation_time": row.last_consultation_time,
            "is_active": bool(row.is_active),
        }
        for row in rows
    ]


def get_doctor_stats(
    *,
    db: Session,
    keyword: str | None = None,
    sort_by: str = "consultation_count",
    sort_order: str = "desc",
):
    query = build_doctor_stats_query(db, keyword=keyword)
    sort_map = {
        "doctor_id": query.column_descriptions[0]["expr"],
        "patient_count": query.column_descriptions[4]["expr"],
        "consultation_count": query.column_descriptions[5]["expr"],
        "ai_report_count": query.column_descriptions[6]["expr"],
        "last_consultation_time": query.column_descriptions[7]["expr"],
    }
    selected_column = sort_map.get(sort_by, sort_map["consultation_count"])
    ordering = asc(selected_column) if sort_order == "asc" else desc(selected_column)
    rows = query.order_by(ordering, asc(models.User.id)).all()
    return serialize_doctor_rows(rows)


def get_dashscope_client() -> OpenAI:
    api_key = os.getenv("DASHSCOPE_API_KEY", "").strip()
    if not api_key:
        raise_http_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "未配置阿里云大模型 API，请在 backend/.env 中设置 DASHSCOPE_API_KEY",
        )
    return OpenAI(
        api_key=api_key,
        base_url=DASHSCOPE_BASE_URL,
        timeout=DASHSCOPE_TIMEOUT,
    )


def build_fallback_full_report(
    possible_diseases: str,
    suggested_checks: str,
    treatment_advice: str,
    risk_warning: str,
) -> str:
    return (
        f"可能疾病：{possible_diseases}\n"
        f"建议检查：{suggested_checks}\n"
        f"辅助建议：{treatment_advice}\n"
        f"风险提示：{risk_warning}\n\n"
        "声明：本系统输出仅供医生辅助参考，不能替代医生诊断。"
    )


def parse_json_content(raw_content: str) -> dict[str, Any]:
    content = raw_content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()
    return json.loads(content)


def normalize_report_payload(payload: dict[str, Any]) -> dict[str, str]:
    possible_diseases = str(payload.get("possible_diseases") or payload.get("可能疾病") or "请结合临床信息进一步判断")
    suggested_checks = str(payload.get("suggested_checks") or payload.get("建议检查") or "建议结合常规检查完善判断")
    treatment_advice = str(payload.get("treatment_advice") or payload.get("辅助建议") or "请结合医生判断进行个体化处理")
    risk_warning = str(payload.get("risk_warning") or payload.get("风险提示") or "如症状持续加重，请及时线下就医")
    full_report = str(payload.get("full_report") or payload.get("完整报告") or "").strip()

    if not full_report:
        full_report = build_fallback_full_report(
            possible_diseases,
            suggested_checks,
            treatment_advice,
            risk_warning,
        )

    return {
        "possible_diseases": possible_diseases.strip(),
        "suggested_checks": suggested_checks.strip(),
        "treatment_advice": treatment_advice.strip(),
        "risk_warning": risk_warning.strip(),
        "full_report": full_report.strip(),
    }


def generate_ai_report_with_qwen(consultation: models.Consultation) -> dict[str, str]:
    client = get_dashscope_client()
    patient = consultation.patient
    patient_name = patient.name if patient else "未填写"
    patient_gender = patient.gender if patient and patient.gender else "未填写"
    patient_age = f"{patient.age}岁" if patient and patient.age is not None else "未填写"
    patient_medical_history = patient.medical_history if patient and patient.medical_history else "未填写"
    patient_allergy_history = patient.allergy_history if patient and patient.allergy_history else "未填写"
    prompt = f"""
你是一名严谨的医疗辅助决策助手。请根据以下问诊信息，输出一个 JSON 对象。

要求：
1. 仅输出 JSON，不要输出 Markdown，不要输出额外解释。
2. JSON 必须包含以下字段：
   possible_diseases
   suggested_checks
   treatment_advice
   risk_warning
   full_report
3. full_report 请整理为适合医生阅读的完整中文报告。
4. 内容必须包含“仅供医生辅助参考，不能替代医生诊断”的含义。
5. 必须严格使用患者基础信息中的性别和年龄，不要自行推断或改写患者性别。

患者基础信息：
姓名：{patient_name}
性别：{patient_gender}
年龄：{patient_age}
既往病史：{patient_medical_history}
过敏史：{patient_allergy_history}

患者问诊信息：
主诉：{consultation.chief_complaint or '未填写'}
症状：{consultation.symptoms or '未填写'}
现病史：{consultation.present_illness or '未填写'}
既往史：{consultation.past_history or '未填写'}
检查结果：{consultation.examination or '未填写'}
""".strip()

    try:
        completion = client.chat.completions.create(
            model=DASHSCOPE_MODEL,
            messages=[
                {"role": "system", "content": "你是一个严谨的医疗辅助决策助手。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
    except APITimeoutError:
        raise_http_error(status.HTTP_504_GATEWAY_TIMEOUT, "阿里云大模型调用超时，请稍后重试")
    except APIConnectionError:
        raise_http_error(status.HTTP_502_BAD_GATEWAY, "无法连接阿里云大模型服务，请检查网络或接口地址")
    except APIError as exc:
        message = getattr(exc, "message", None) or str(exc)
        raise_http_error(status.HTTP_502_BAD_GATEWAY, f"阿里云大模型调用失败：{message}")

    content = completion.choices[0].message.content if completion.choices else ""
    if not content:
        raise_http_error(status.HTTP_502_BAD_GATEWAY, "阿里云大模型未返回有效内容")

    try:
        payload = parse_json_content(content)
        return normalize_report_payload(payload)
    except (json.JSONDecodeError, TypeError, ValueError):
        return normalize_report_payload({"full_report": content})


def build_ai_report(consultation_id: int, db: Session, current_user: models.User, force: bool = False):
    consultation = db.get(models.Consultation, consultation_id)
    if not consultation:
        raise_http_error(status.HTTP_404_NOT_FOUND, "问诊记录不存在")
    ensure_consultation_permission(consultation, current_user)

    if consultation.ai_report and not force:
        return consultation.ai_report

    report_payload = generate_ai_report_with_qwen(consultation)

    if consultation.ai_report:
        db_report = consultation.ai_report
        db_report.possible_diseases = report_payload["possible_diseases"]
        db_report.suggested_checks = report_payload["suggested_checks"]
        db_report.treatment_advice = report_payload["treatment_advice"]
        db_report.risk_warning = report_payload["risk_warning"]
        db_report.full_report = report_payload["full_report"]
        db_report.created_at = datetime.now()
    else:
        db_report = models.AiReport(
            consultation_id=consultation.id,
            possible_diseases=report_payload["possible_diseases"],
            suggested_checks=report_payload["suggested_checks"],
            treatment_advice=report_payload["treatment_advice"],
            risk_warning=report_payload["risk_warning"],
            full_report=report_payload["full_report"],
        )
        db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


@app.get("/", summary="后端启动测试", tags=["系统状态"])
def root():
    return {"message": "智慧医疗辅助决策系统后端启动成功"}


@app.get("/health", summary="数据库连接测试", tags=["系统状态"])
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


@app.post("/auth/login", response_model=schemas.LoginResponse, summary="医生/管理员登录", tags=["登录系统"])
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.username == login_data.username)
        .filter(models.User.password == login_data.password)
        .first()
    )
    if not user:
        raise_http_error(status.HTTP_401_UNAUTHORIZED, "用户名或密码错误")
    if not user.is_active:
        raise_http_error(status.HTTP_403_FORBIDDEN, "该账号已被禁用，请联系管理员")

    result = schemas.UserOut.model_validate(user).model_dump()
    result["token"] = create_access_token(user)
    return result


@app.get("/auth/me", response_model=schemas.UserOut, summary="查看当前账号", tags=["登录系统"])
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.put("/auth/profile", response_model=schemas.UserOut, summary="修改当前账号资料", tags=["登录系统"])
def update_profile(
    profile: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.real_name = profile.real_name
    db.commit()
    db.refresh(current_user)
    return current_user


@app.put("/auth/password", summary="修改当前账号密码", tags=["登录系统"])
def change_password(
    password_data: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.password != password_data.old_password:
        raise_http_error(status.HTTP_400_BAD_REQUEST, "原密码错误")
    current_user.password = password_data.new_password
    db.commit()
    return {"message": "密码修改成功"}


@app.get("/patients", response_model=list[schemas.PatientOut], summary="查询患者列表", tags=["患者管理"])
def list_patients(
    doctor_id: int | None = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Patient)
    if current_user.role == "admin":
        if doctor_id is not None:
            query = query.filter(models.Patient.doctor_id == doctor_id)
    else:
        query = query.filter(models.Patient.doctor_id == current_user.id)
    return query.order_by(models.Patient.id.desc()).all()


@app.get("/patients/{patient_id}", response_model=schemas.PatientOut, summary="查询患者详情", tags=["患者管理"])
def get_patient(
    patient_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise_http_error(status.HTTP_404_NOT_FOUND, "患者不存在")
    ensure_patient_permission(patient, current_user)
    return patient


@app.post("/patients", response_model=schemas.PatientOut, summary="新增患者", tags=["患者管理"])
def create_patient(
    patient: schemas.PatientCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient_data = normalize_patient_payload(patient.model_dump(), current_user, db)
    ensure_unique_patient_name(
        db=db,
        patient_name=patient_data["name"],
        doctor_id=patient_data.get("doctor_id"),
    )
    db_patient = models.Patient(**patient_data)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@app.put("/patients/{patient_id}", response_model=schemas.PatientOut, summary="修改患者信息", tags=["患者管理"])
def update_patient(
    patient_id: int,
    patient_update: schemas.PatientUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise_http_error(status.HTTP_404_NOT_FOUND, "患者不存在")
    ensure_patient_permission(patient, current_user)

    update_data = patient_update.model_dump(exclude_unset=True)
    if current_user.role == "doctor":
        update_data["doctor_id"] = current_user.id
    elif "doctor_id" in update_data:
        ensure_doctor_exists(update_data["doctor_id"], db)

    target_doctor_id = update_data.get("doctor_id", patient.doctor_id)
    target_name = update_data.get("name", patient.name)
    ensure_unique_patient_name(
        db=db,
        patient_name=target_name,
        doctor_id=target_doctor_id,
        exclude_patient_id=patient.id,
    )

    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


@app.delete("/patients/{patient_id}", summary="删除患者", tags=["患者管理"])
def delete_patient(
    patient_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise_http_error(status.HTTP_404_NOT_FOUND, "患者不存在")
    ensure_patient_permission(patient, current_user)

    db.delete(patient)
    db.commit()
    return {"message": "患者删除成功", "patient_id": patient_id}


@app.post("/consultations", response_model=schemas.ConsultationOut, summary="新增问诊记录", tags=["问诊管理"])
def create_consultation(
    consultation: schemas.ConsultationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.get(models.Patient, consultation.patient_id)
    if not patient:
        raise_http_error(status.HTTP_404_NOT_FOUND, "患者不存在")
    ensure_patient_permission(patient, current_user)

    consultation_data = consultation.model_dump()
    if current_user.role == "doctor":
        consultation_data["doctor_id"] = current_user.id
    else:
        doctor_id = consultation_data.get("doctor_id") or patient.doctor_id
        if doctor_id is not None:
            ensure_doctor_exists(doctor_id, db)
        consultation_data["doctor_id"] = doctor_id

    if patient.doctor_id is None and consultation_data.get("doctor_id"):
        patient.doctor_id = consultation_data["doctor_id"]

    duplicate_consultation = find_recent_duplicate_consultation(
        db=db,
        patient_id=consultation_data["patient_id"],
        doctor_id=consultation_data.get("doctor_id"),
        chief_complaint=consultation_data.get("chief_complaint"),
        symptoms=consultation_data.get("symptoms"),
        present_illness=consultation_data.get("present_illness"),
        past_history=consultation_data.get("past_history"),
        examination=consultation_data.get("examination"),
    )
    if duplicate_consultation:
        return duplicate_consultation

    db_consultation = models.Consultation(**consultation_data)
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    return db_consultation


@app.delete("/consultations/{consultation_id}", summary="删除问诊记录", tags=["问诊管理"])
def delete_consultation(
    consultation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consultation = db.get(models.Consultation, consultation_id)
    if not consultation:
        raise_http_error(status.HTTP_404_NOT_FOUND, "问诊记录不存在")
    ensure_consultation_permission(consultation, current_user)

    if consultation.ai_report is not None:
        db.delete(consultation.ai_report)
        db.flush()
    db.delete(consultation)
    db.commit()
    return {"message": "问诊记录删除成功", "consultation_id": consultation_id}


@app.get(
    "/patients/{patient_id}/consultations",
    response_model=list[schemas.PatientConsultationOut],
    summary="查询单个患者问诊历史",
    tags=["问诊管理"],
)
def list_patient_consultations(
    patient_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise_http_error(status.HTTP_404_NOT_FOUND, "患者不存在")
    ensure_patient_permission(patient, current_user)

    return (
        db.query(models.Consultation)
        .filter(models.Consultation.patient_id == patient_id)
        .order_by(models.Consultation.created_at.desc())
        .all()
    )


@app.get(
    "/admin/dashboard",
    response_model=schemas.AdminDashboardOut,
    summary="管理员平台概览统计",
    tags=["医生数据"],
)
def admin_dashboard(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    today = date.today()
    start_date = today - timedelta(days=6)
    start_datetime = datetime.combine(start_date, datetime.min.time())

    doctor_count = db.query(func.count(models.User.id)).filter(models.User.role == "doctor").scalar() or 0
    patient_count = db.query(func.count(models.Patient.id)).scalar() or 0
    consultation_count = db.query(func.count(models.Consultation.id)).scalar() or 0
    ai_report_count = db.query(func.count(models.AiReport.id)).scalar() or 0
    today_consultation_count = (
        db.query(func.count(models.Consultation.id))
        .filter(func.date(models.Consultation.created_at) == today)
        .scalar()
        or 0
    )

    trend_rows = (
        db.query(
            func.date(models.Consultation.created_at).label("day"),
            func.count(models.Consultation.id).label("consultation_count"),
        )
        .filter(models.Consultation.created_at >= start_datetime)
        .group_by(func.date(models.Consultation.created_at))
        .order_by(func.date(models.Consultation.created_at))
        .all()
    )
    trend_map = {str(row.day): int(row.consultation_count or 0) for row in trend_rows}
    consultation_trend = []
    for offset in range(7):
        current_day = start_date + timedelta(days=offset)
        consultation_trend.append(
            {
                "date": current_day.isoformat(),
                "consultation_count": trend_map.get(current_day.isoformat(), 0),
            }
        )

    top_doctor_query = build_doctor_stats_query(db)
    top_doctors = serialize_doctor_rows(
        top_doctor_query
        .order_by(
            desc(top_doctor_query.column_descriptions[5]["expr"]),
            desc(top_doctor_query.column_descriptions[4]["expr"]),
            asc(models.User.id),
        )
        .limit(5)
        .all()
    )

    recent_patients_rows = (
        db.query(
            models.Patient.id.label("patient_id"),
            models.Patient.name.label("name"),
            func.coalesce(models.User.real_name, models.User.username, "未分配").label("doctor_name"),
            models.Patient.created_at.label("created_at"),
        )
        .outerjoin(models.User, models.Patient.doctor_id == models.User.id)
        .order_by(models.Patient.created_at.desc())
        .limit(5)
        .all()
    )
    recent_patients = [
        {
            "patient_id": row.patient_id,
            "name": row.name,
            "doctor_name": row.doctor_name,
            "created_at": row.created_at,
        }
        for row in recent_patients_rows
    ]

    active_patient_rows = (
        db.query(
            models.Patient.id.label("patient_id"),
            models.Patient.name.label("name"),
            func.coalesce(models.User.real_name, models.User.username, "未分配").label("doctor_name"),
            func.count(models.Consultation.id).label("consultation_count"),
            func.max(models.Consultation.created_at).label("last_consultation_time"),
        )
        .join(models.Consultation, models.Consultation.patient_id == models.Patient.id)
        .outerjoin(models.User, models.Patient.doctor_id == models.User.id)
        .group_by(models.Patient.id, models.Patient.name, models.User.real_name, models.User.username)
        .order_by(desc("last_consultation_time"), desc("consultation_count"))
        .limit(5)
        .all()
    )
    active_patients = [
        {
            "patient_id": row.patient_id,
            "name": row.name,
            "doctor_name": row.doctor_name,
            "consultation_count": int(row.consultation_count or 0),
            "last_consultation_time": row.last_consultation_time,
        }
        for row in active_patient_rows
    ]

    return {
        "doctor_count": int(doctor_count),
        "patient_count": int(patient_count),
        "consultation_count": int(consultation_count),
        "ai_report_count": int(ai_report_count),
        "today_consultation_count": int(today_consultation_count),
        "consultation_trend": consultation_trend,
        "top_doctors": top_doctors,
        "recent_patients": recent_patients,
        "active_patients": active_patients,
    }


@app.get(
    "/admin/doctors/stats",
    response_model=list[schemas.DoctorStatsOut],
    summary="管理员查询医生绩效统计",
    tags=["医生数据"],
)
def list_doctor_stats(
    keyword: str | None = Query(None),
    sort_by: str = Query("consultation_count"),
    sort_order: str = Query("desc"),
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_doctor_stats(
        db=db,
        keyword=keyword,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@app.get("/admin/doctors", response_model=list[schemas.DoctorStatsOut], summary="管理员查询医生列表", tags=["医生数据"])
def list_doctors(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_doctor_stats(db=db)


@app.get("/admin/export/doctors", summary="导出医生统计数据", tags=["数据导出"])
def export_doctors(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctors = get_doctor_stats(db=db, sort_by="doctor_id", sort_order="asc")
    rows = [
        [
            doctor["doctor_id"],
            doctor["username"],
            doctor.get("real_name") or "",
            "启用" if doctor.get("is_active") else "已禁用",
            doctor.get("patient_count", 0),
            doctor.get("consultation_count", 0),
            doctor.get("ai_report_count", 0),
            format_export_datetime(doctor.get("last_consultation_time")),
        ]
        for doctor in doctors
    ]
    return csv_export_response(
        "admin_doctors.csv",
        ["医生ID", "用户名", "医生姓名", "账号状态", "患者数量", "问诊次数", "AI报告数量", "最近问诊时间"],
        rows,
    )


@app.get("/admin/export/patients", summary="导出患者数据", tags=["数据导出"])
def export_patients(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Patient, models.User.username, models.User.real_name)
        .outerjoin(models.User, models.Patient.doctor_id == models.User.id)
        .order_by(models.Patient.id.asc())
        .all()
    )
    export_rows = [
        [
            patient.id,
            patient.name,
            patient.gender or "",
            patient.age if patient.age is not None else "",
            patient.phone or "",
            patient.address or "",
            patient.doctor_id or "",
            real_name or username or "",
            patient.medical_history or "",
            patient.allergy_history or "",
            format_export_datetime(patient.created_at),
        ]
        for patient, username, real_name in rows
    ]
    return csv_export_response(
        "admin_patients.csv",
        ["患者ID", "姓名", "性别", "年龄", "电话", "地址", "医生ID", "所属医生", "既往病史", "过敏史", "创建时间"],
        export_rows,
    )


@app.get("/admin/export/consultations", summary="导出问诊记录", tags=["数据导出"])
def export_consultations(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            models.Consultation,
            models.Patient.name.label("patient_name"),
            models.User.username.label("doctor_username"),
            models.User.real_name.label("doctor_real_name"),
            models.AiReport.id.label("report_id"),
        )
        .join(models.Patient, models.Consultation.patient_id == models.Patient.id)
        .outerjoin(models.User, models.Consultation.doctor_id == models.User.id)
        .outerjoin(models.AiReport, models.AiReport.consultation_id == models.Consultation.id)
        .order_by(models.Consultation.id.asc())
        .all()
    )
    export_rows = [
        [
            consultation.id,
            consultation.patient_id,
            patient_name or "",
            consultation.doctor_id or "",
            doctor_real_name or doctor_username or "",
            consultation.chief_complaint or "",
            consultation.symptoms or "",
            consultation.present_illness or "",
            consultation.past_history or "",
            consultation.examination or "",
            "是" if report_id else "否",
            format_export_datetime(consultation.created_at),
        ]
        for consultation, patient_name, doctor_username, doctor_real_name, report_id in rows
    ]
    return csv_export_response(
        "admin_consultations.csv",
        ["问诊ID", "患者ID", "患者姓名", "医生ID", "医生姓名", "主诉", "症状", "现病史", "既往史", "检查结果", "是否生成AI报告", "创建时间"],
        export_rows,
    )


@app.get("/admin/export/reports", summary="导出AI报告数据", tags=["数据导出"])
def export_reports(
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            models.AiReport,
            models.Consultation.patient_id.label("patient_id"),
            models.Consultation.doctor_id.label("doctor_id"),
            models.Patient.name.label("patient_name"),
            models.User.username.label("doctor_username"),
            models.User.real_name.label("doctor_real_name"),
        )
        .join(models.Consultation, models.AiReport.consultation_id == models.Consultation.id)
        .join(models.Patient, models.Consultation.patient_id == models.Patient.id)
        .outerjoin(models.User, models.Consultation.doctor_id == models.User.id)
        .order_by(models.AiReport.id.asc())
        .all()
    )
    export_rows = [
        [
            report.id,
            report.consultation_id,
            patient_id,
            patient_name or "",
            doctor_id or "",
            doctor_real_name or doctor_username or "",
            report.possible_diseases or "",
            report.suggested_checks or "",
            report.treatment_advice or "",
            report.risk_warning or "",
            report.full_report or "",
            format_export_datetime(report.created_at),
        ]
        for report, patient_id, doctor_id, patient_name, doctor_username, doctor_real_name in rows
    ]
    return csv_export_response(
        "admin_ai_reports.csv",
        ["报告ID", "问诊ID", "患者ID", "患者姓名", "医生ID", "医生姓名", "可能疾病", "建议检查", "辅助建议", "风险提示", "完整报告", "创建时间"],
        export_rows,
    )


@app.post("/admin/doctors", response_model=schemas.UserOut, summary="管理员新增医生", tags=["医生数据"])
def create_doctor(
    doctor: schemas.DoctorCreate,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing_user = db.query(models.User).filter(models.User.username == doctor.username).first()
    if existing_user:
        raise_http_error(status.HTTP_409_CONFLICT, "用户名已存在，请更换用户名")

    db_doctor = models.User(
        username=doctor.username,
        password=doctor.password,
        real_name=doctor.real_name,
        role="doctor",
        is_active=1,
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor


@app.put("/admin/doctors/{doctor_id}", response_model=schemas.UserOut, summary="管理员编辑医生", tags=["医生数据"])
def update_doctor(
    doctor_id: int,
    doctor_update: schemas.DoctorUpdate,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctor = get_doctor_or_404(doctor_id, db)
    existing_user = (
        db.query(models.User)
        .filter(models.User.username == doctor_update.username)
        .filter(models.User.id != doctor_id)
        .first()
    )
    if existing_user:
        raise_http_error(status.HTTP_409_CONFLICT, "用户名已存在，请更换用户名")

    doctor.username = doctor_update.username
    doctor.real_name = doctor_update.real_name
    db.commit()
    db.refresh(doctor)
    return doctor


@app.put("/admin/doctors/{doctor_id}/password", summary="管理员重置医生密码", tags=["医生数据"])
def reset_doctor_password(
    doctor_id: int,
    payload: schemas.DoctorPasswordReset,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctor = get_doctor_or_404(doctor_id, db)
    doctor.password = payload.password
    db.commit()
    return {"message": "医生密码重置成功", "doctor_id": doctor_id}


@app.put("/admin/doctors/{doctor_id}/status", response_model=schemas.UserOut, summary="管理员启用或禁用医生", tags=["医生数据"])
def update_doctor_status(
    doctor_id: int,
    payload: schemas.DoctorStatusUpdate,
    current_admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if doctor_id == current_admin.id:
        raise_http_error(status.HTTP_400_BAD_REQUEST, "不能禁用当前登录账号")

    doctor = get_doctor_or_404(doctor_id, db)
    doctor.is_active = 1 if payload.is_active else 0
    db.commit()
    db.refresh(doctor)
    return doctor


@app.get(
    "/admin/doctors/{doctor_id}/patients",
    response_model=list[schemas.DoctorPatientOut],
    summary="管理员查询某医生患者名单",
    tags=["医生数据"],
)
def list_doctor_patients(
    doctor_id: int,
    _: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doctor = ensure_doctor_exists(doctor_id, db)
    if not doctor:
        raise_http_error(status.HTTP_404_NOT_FOUND, "医生不存在")

    patient_stats = (
        db.query(
            models.Consultation.patient_id.label("patient_id"),
            func.count(models.Consultation.id).label("consultation_count"),
            func.max(models.Consultation.created_at).label("last_consultation_time"),
        )
        .group_by(models.Consultation.patient_id)
        .subquery()
    )
    rows = (
        db.query(
            models.Patient,
            func.coalesce(patient_stats.c.consultation_count, 0).label("consultation_count"),
            patient_stats.c.last_consultation_time.label("last_consultation_time"),
        )
        .outerjoin(patient_stats, patient_stats.c.patient_id == models.Patient.id)
        .filter(models.Patient.doctor_id == doctor_id)
        .order_by(models.Patient.id.desc())
        .all()
    )

    result = []
    for patient, consultation_count, last_consultation_time in rows:
        item = schemas.PatientOut.model_validate(patient).model_dump()
        item["consultation_count"] = int(consultation_count or 0)
        item["last_consultation_time"] = last_consultation_time
        result.append(item)
    return result


@app.post("/ai/decision", response_model=schemas.AiReportOut, summary="生成AI辅助决策报告", tags=["AI辅助决策"])
def create_ai_decision(
    request: schemas.AiDecisionRequest,
    force: bool = Query(False),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_ai_report(request.consultation_id, db, current_user, force=force)


@app.post(
    "/ai/decision/{consultation_id}",
    response_model=schemas.AiReportOut,
    summary="根据问诊ID生成AI辅助决策报告",
    tags=["AI辅助决策"],
)
def create_ai_decision_by_id(
    consultation_id: int,
    force: bool = Query(False),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_ai_report(consultation_id, db, current_user, force=force)


@app.get(
    "/messages/users",
    response_model=list[schemas.MessageUserOut],
    response_model_by_alias=False,
    summary="获取可聊天用户列表",
    tags=["消息中心"],
)
def list_message_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.User).filter(models.User.id != current_user.id)
    if current_user.role == "admin":
        query = query.filter(models.User.role == "doctor")
    else:
        query = query.filter(models.User.role.in_(["admin", "doctor"]))
    users = query.order_by(asc(models.User.role), asc(models.User.id)).all()
    return [serialize_message_user(user) for user in users]


@app.get(
    "/messages/conversations",
    response_model=list[schemas.MessageConversationSummaryOut],
    response_model_by_alias=False,
    summary="获取当前用户会话列表",
    tags=["消息中心"],
)
def list_message_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_conversation_summaries(db=db, current_user=current_user)


@app.get(
    "/messages/conversations/{conversation_id}",
    response_model=list[schemas.MessageOut],
    response_model_by_alias=False,
    summary="获取会话消息记录",
    tags=["消息中心"],
)
def list_conversation_messages(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_conversation_messages(
        db=db,
        conversation_id=conversation_id,
        current_user=current_user,
    )


@app.post(
    "/messages",
    response_model=schemas.MessageOut,
    response_model_by_alias=False,
    summary="发送消息",
    tags=["消息中心"],
)
def send_message(
    payload: schemas.MessageSendRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_user = db.get(models.User, payload.receiver_id)
    if not target_user:
        raise_http_error(status.HTTP_404_NOT_FOUND, "接收者不存在")
    ensure_message_target_permission(target_user, current_user)

    conversation = get_or_create_conversation(
        db=db,
        current_user=current_user,
        target_user=target_user,
    )
    message = models.Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        receiver_id=target_user.id,
        content=payload.content,
        is_read=0,
    )
    conversation.updated_at = datetime.now()
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@app.post(
    "/messages/fetch",
    response_model=schemas.MessageFetchResponseOut,
    response_model_by_alias=False,
    summary="手动收取消息",
    tags=["消息中心"],
)
def fetch_messages(
    conversation_id: int | None = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_message_count = (
        db.query(func.count(models.Message.id))
        .filter(models.Message.receiver_id == current_user.id)
        .filter(models.Message.is_read == 0)
        .scalar()
        or 0
    )
    current_messages: list[models.Message] = []
    if conversation_id is not None:
        current_messages = build_conversation_messages(
            db=db,
            conversation_id=conversation_id,
            current_user=current_user,
        )
        mark_conversation_read(
            db=db,
            conversation_id=conversation_id,
            current_user=current_user,
        )
        current_messages = build_conversation_messages(
            db=db,
            conversation_id=conversation_id,
            current_user=current_user,
        )

    conversations = build_conversation_summaries(db=db, current_user=current_user)
    unread_message_count = sum(item["unread_count"] for item in conversations)
    return {
        "new_message_count": int(new_message_count),
        "unread_message_count": int(unread_message_count),
        "conversations": conversations,
        "current_messages": current_messages,
    }


@app.post(
    "/messages/conversations/{conversation_id}/read",
    summary="标记会话消息为已读",
    tags=["消息中心"],
)
def read_conversation_messages(
    conversation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated_count = mark_conversation_read(
        db=db,
        conversation_id=conversation_id,
        current_user=current_user,
    )
    return {"message": "消息已更新为已读", "updated_count": updated_count}
