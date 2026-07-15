import json
import os
from typing import Any

from openai import APIConnectionError, APIError, APITimeoutError, OpenAI
from pydantic import ValidationError
from sqlalchemy.orm import Session, selectinload

from app import models
from app.agent.prompts import (
    REPORT_SYSTEM_PROMPT,
    RISK_SYSTEM_PROMPT,
    build_medical_report_prompt,
    build_risk_assessment_prompt,
)
from app.agent.schemas import (
    AgentConfigurationError,
    AgentConnectionError,
    AgentResponseError,
    AgentServiceError,
    AgentTimeoutError,
    AgentToolError,
    ConsultationContext,
    ConsultationNotFoundError,
    GeneratedMedicalReport,
    HistoricalConsultation,
    HistoricalReportSummary,
    MedicalReportPayload,
    PatientContext,
    PatientHistoryContext,
    ReportResponseError,
    RiskAssessment,
    RiskAssessmentResponseError,
)
from app.agent.state import MedicalAgentState


DEFAULT_DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DEFAULT_DASHSCOPE_TIMEOUT = 60.0


def get_dashscope_model() -> str:
    model = os.getenv("DASHSCOPE_MODEL", "").strip()
    if not model:
        raise AgentConfigurationError("未配置 DASHSCOPE_MODEL")
    return model


def get_dashscope_client() -> OpenAI:
    api_key = os.getenv("DASHSCOPE_API_KEY", "").strip()
    if not api_key:
        raise AgentConfigurationError("未配置阿里云大模型 API")
    base_url = os.getenv("DASHSCOPE_BASE_URL", DEFAULT_DASHSCOPE_BASE_URL).strip()
    try:
        timeout = float(os.getenv("DASHSCOPE_TIMEOUT", str(DEFAULT_DASHSCOPE_TIMEOUT)))
    except ValueError as exc:
        raise AgentConfigurationError("DASHSCOPE_TIMEOUT 配置无效") from exc
    return OpenAI(api_key=api_key, base_url=base_url, timeout=timeout)


def get_consultation_context(
    db: Session,
    consultation_id: int,
) -> tuple[PatientContext, ConsultationContext]:
    try:
        consultation = db.get(models.Consultation, consultation_id)
        if not consultation:
            raise ConsultationNotFoundError("问诊记录不存在")
        patient = consultation.patient
        if not patient:
            raise AgentToolError("问诊记录缺少患者信息")
        return (
            PatientContext(
                patient_id=patient.id,
                name=patient.name,
                gender=patient.gender,
                age=patient.age,
                medical_history=patient.medical_history,
                allergy_history=patient.allergy_history,
            ),
            ConsultationContext(
                consultation_id=consultation.id,
                patient_id=consultation.patient_id,
                chief_complaint=consultation.chief_complaint,
                symptoms=consultation.symptoms,
                present_illness=consultation.present_illness,
                past_history=consultation.past_history,
                examination=consultation.examination,
                created_at=consultation.created_at,
            ),
        )
    except (ConsultationNotFoundError, AgentToolError):
        raise
    except Exception as exc:
        raise AgentToolError("读取当前问诊失败") from exc


def get_patient_history(
    db: Session,
    patient_id: int,
    exclude_consultation_id: int,
    limit: int = 5,
) -> PatientHistoryContext:
    safe_limit = max(1, min(limit, 5))
    try:
        consultations = (
            db.query(models.Consultation)
            .options(selectinload(models.Consultation.ai_report))
            .filter(
                models.Consultation.patient_id == patient_id,
                models.Consultation.id != exclude_consultation_id,
            )
            .order_by(models.Consultation.created_at.desc(), models.Consultation.id.desc())
            .limit(safe_limit)
            .all()
        )
    except Exception as exc:
        raise AgentToolError("读取患者历史失败") from exc

    history: list[HistoricalConsultation] = []
    for consultation in consultations:
        report = consultation.ai_report
        report_summary = None
        if report:
            report_summary = HistoricalReportSummary(
                patient_summary=report.patient_summary,
                key_findings=report.key_findings,
                risk_level=report.risk_level,
                urgency_level=report.urgency_level,
            )
        history.append(
            HistoricalConsultation(
                consultation_id=consultation.id,
                chief_complaint=consultation.chief_complaint,
                symptoms=consultation.symptoms,
                present_illness=consultation.present_illness,
                past_history=consultation.past_history,
                examination=consultation.examination,
                created_at=consultation.created_at,
                report_summary=report_summary,
            )
        )
    return PatientHistoryContext(patient_id=patient_id, consultations=history)


def _parse_json_object(
    raw_content: str,
    error_type: type[AgentResponseError] = AgentResponseError,
) -> dict[str, Any]:
    content = raw_content.strip()
    if content.startswith("```json") and content.endswith("```"):
        content = content[7:-3].strip()
    elif content.startswith("```") and content.endswith("```"):
        content = content[3:-3].strip()
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as initial_error:
        start = content.find("{")
        end = content.rfind("}")
        if start < 0 or end <= start:
            raise error_type("大模型返回的 JSON 无法解析") from initial_error
        try:
            payload = json.loads(content[start : end + 1])
        except json.JSONDecodeError as exc:
            raise error_type("大模型返回的 JSON 无法解析") from exc
    if not isinstance(payload, dict):
        raise error_type("大模型返回内容不是 JSON 对象")
    return payload


def _request_json_completion(
    client: OpenAI,
    system_prompt: str,
    user_prompt: str,
    error_type: type[AgentResponseError],
) -> dict[str, Any]:
    try:
        completion = client.chat.completions.create(
            model=get_dashscope_model(),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
    except APITimeoutError as exc:
        raise AgentTimeoutError("阿里云大模型调用超时") from exc
    except APIConnectionError as exc:
        raise AgentConnectionError("无法连接阿里云大模型服务") from exc
    except APIError as exc:
        raise AgentServiceError("阿里云大模型调用失败") from exc

    content = completion.choices[0].message.content if completion.choices else ""
    if not content:
        raise error_type("阿里云大模型未返回有效内容")
    return _parse_json_object(content, error_type=error_type)


def _clean_text_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple, set)):
        parts = [_clean_text_value(item) for item in value]
        return "；".join(part for part in parts if part)
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    return str(value).strip()


def _first_value(payload: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


def _normalize_risk_level(value: Any) -> str:
    text = _clean_text_value(value)
    lowered = text.lower()
    if "待评估" in text or "pending" in lowered or "unknown" in lowered:
        return "待评估"
    if "高" in text or "high" in lowered:
        return "高"
    if "中" in text or "medium" in lowered or "moderate" in lowered:
        return "中"
    if "低" in text or "low" in lowered:
        return "低"
    return text


def _normalize_urgency_level(value: Any) -> str:
    text = _clean_text_value(value)
    lowered = text.lower()
    if "紧急" in text or "急诊" in text or "立即" in text or "emergency" in lowered or "urgent" in lowered:
        return "紧急"
    if "尽快" in text or "较急" in text or "soon" in lowered:
        return "尽快"
    if "常规" in text or "routine" in lowered:
        return "常规"
    return text


def _normalize_risk_payload(payload: dict[str, Any]) -> dict[str, str]:
    return {
        "risk_level": _normalize_risk_level(_first_value(payload, "risk_level", "风险等级")),
        "urgency": _normalize_urgency_level(
            _first_value(payload, "urgency", "urgency_level", "紧急程度")
        ),
        "warning": _clean_text_value(
            _first_value(payload, "warning", "risk_warning", "风险提示")
        ),
    }


def _normalize_report_payload(payload: dict[str, Any]) -> dict[str, str]:
    normalized = {
        "patient_summary": _clean_text_value(
            _first_value(payload, "patient_summary", "患者摘要")
        ),
        "key_findings": _clean_text_value(
            _first_value(payload, "key_findings", "关键发现", "主要问题")
        ),
        "possible_diseases": _clean_text_value(
            _first_value(payload, "possible_diseases", "可能疾病")
        ),
        "suggested_checks": _clean_text_value(
            _first_value(payload, "suggested_checks", "建议检查")
        ),
        "risk_level": _normalize_risk_level(
            _first_value(payload, "risk_level", "风险等级")
        ),
        "urgency_level": _normalize_urgency_level(
            _first_value(payload, "urgency_level", "urgency", "紧急程度")
        ),
        "treatment_advice": _clean_text_value(
            _first_value(payload, "treatment_advice", "辅助建议", "处置建议")
        ),
        "follow_up_advice": _clean_text_value(
            _first_value(payload, "follow_up_advice", "复诊建议", "转诊建议")
        ),
        "risk_warning": _clean_text_value(
            _first_value(payload, "risk_warning", "warning", "风险提示")
        ),
    }
    full_report = _clean_text_value(_first_value(payload, "full_report", "完整报告"))
    disclaimer_phrases = (
        "不能替代医生诊断",
        "不可替代医生诊断",
        "不能取代医生诊断",
        "不可取代医生诊断",
    )
    if full_report and not any(phrase in full_report for phrase in disclaimer_phrases):
        full_report = f"{full_report}\n\n声明：本报告仅供医生辅助参考，不能替代医生诊断。"

    specific_values = [
        normalized["patient_summary"],
        normalized["key_findings"],
        normalized["possible_diseases"],
        normalized["suggested_checks"],
        normalized["treatment_advice"],
        normalized["follow_up_advice"],
    ]
    has_specific_content = any(
        len(value) >= 6 and value in full_report for value in specific_values if value
    )
    if full_report and not has_specific_content:
        sections = [
            ("患者摘要", normalized["patient_summary"]),
            ("关键发现", normalized["key_findings"]),
            ("可能疾病", normalized["possible_diseases"]),
            ("建议检查", normalized["suggested_checks"]),
            ("风险等级", normalized["risk_level"]),
            ("紧急程度", normalized["urgency_level"]),
            ("风险提示", normalized["risk_warning"]),
            ("辅助建议", normalized["treatment_advice"]),
            ("复诊建议", normalized["follow_up_advice"]),
        ]
        full_report = "\n\n".join(
            f"{title}\n{value}" for title, value in sections if value
        )
        full_report += "\n\n声明：本报告仅供医生辅助参考，不能替代医生诊断。"

    return {**normalized, "full_report": full_report}


def assess_medical_risk(client: OpenAI, state: MedicalAgentState) -> RiskAssessment:
    payload = _request_json_completion(
        client,
        RISK_SYSTEM_PROMPT,
        build_risk_assessment_prompt(state),
        RiskAssessmentResponseError,
    )
    try:
        return RiskAssessment.model_validate(_normalize_risk_payload(payload))
    except ValidationError as exc:
        raise RiskAssessmentResponseError("风险评估结果字段无效") from exc


def generate_medical_report(client: OpenAI, state: MedicalAgentState) -> MedicalReportPayload:
    if state.risk_assessment is None:
        raise AgentToolError("生成报告前缺少风险评估结果")
    payload = _request_json_completion(
        client,
        REPORT_SYSTEM_PROMPT,
        build_medical_report_prompt(state),
        ReportResponseError,
    )
    try:
        generated = GeneratedMedicalReport.model_validate(_normalize_report_payload(payload))
    except ValidationError as exc:
        raise ReportResponseError("医疗报告字段无效或不完整") from exc

    final_values = generated.model_dump()
    final_values["risk_level"] = state.risk_assessment.risk_level
    final_values["urgency_level"] = state.risk_assessment.urgency
    final_values["risk_warning"] = state.risk_assessment.warning
    structured_summary = json.dumps(final_values, ensure_ascii=False)
    return MedicalReportPayload(**final_values, structured_summary=structured_summary)
