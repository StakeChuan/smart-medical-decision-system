import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


PHONE_PATTERN = re.compile(r"^[0-9+\-\s]{6,20}$")


class AppBaseModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class AppOrmModel(AppBaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


class LoginRequest(AppBaseModel):
    username: str = Field(..., alias="用户名", min_length=1, max_length=50, examples=["luckyizu"])
    password: str = Field(..., alias="密码", min_length=1, max_length=100, examples=["228460"])

    @field_validator("username", "password", mode="before")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("不能为空")
        return normalized


class UserOut(AppOrmModel):
    id: int = Field(..., alias="用户ID")
    username: str = Field(..., alias="用户名")
    real_name: str | None = Field(None, alias="真实姓名")
    role: str = Field(..., alias="角色")
    is_active: bool = Field(True, alias="是否启用")


class LoginResponse(UserOut):
    token: str = Field(..., alias="访问令牌")


class ProfileUpdate(AppBaseModel):
    real_name: str | None = Field(None, alias="真实姓名", max_length=50)

    @field_validator("real_name", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return normalize_text(value)


class PasswordChange(AppBaseModel):
    old_password: str = Field(..., alias="原密码", min_length=1, max_length=100)
    new_password: str = Field(..., alias="新密码", min_length=1, max_length=100)

    @field_validator("old_password", "new_password", mode="before")
    @classmethod
    def validate_password_text(cls, value: str) -> str:
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("密码不能为空")
        return normalized


class DoctorCreate(AppBaseModel):
    username: str = Field(..., alias="用户名", min_length=1, max_length=50)
    password: str = Field(..., alias="初始密码", min_length=1, max_length=100)
    real_name: str | None = Field(None, alias="医生姓名", max_length=50)

    @field_validator("username", "password", mode="before")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("不能为空")
        return normalized

    @field_validator("real_name", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return normalize_text(value)


class DoctorUpdate(AppBaseModel):
    username: str = Field(..., alias="用户名", min_length=1, max_length=50)
    real_name: str | None = Field(None, alias="医生姓名", max_length=50)

    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("用户名不能为空")
        return normalized

    @field_validator("real_name", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return normalize_text(value)


class DoctorPasswordReset(AppBaseModel):
    password: str = Field(..., alias="新密码", min_length=1, max_length=100)

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, value: str) -> str:
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("新密码不能为空")
        return normalized


class DoctorStatusUpdate(AppBaseModel):
    is_active: bool = Field(..., alias="是否启用")


class PatientCreate(AppBaseModel):
    name: str = Field(..., alias="姓名", min_length=1, max_length=50, examples=["张三"])
    gender: str | None = Field(None, alias="性别", examples=["男"])
    age: int | None = Field(None, alias="年龄", examples=[35])
    phone: str | None = Field(None, alias="电话")
    address: str | None = Field(None, alias="地址")
    doctor_id: int | None = Field(None, alias="医生ID")
    medical_history: str | None = Field(None, alias="既往病史")
    allergy_history: str | None = Field(None, alias="过敏史")

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("患者姓名不能为空")
        return normalized

    @field_validator("gender", "phone", "address", "medical_history", "allergy_history", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return normalize_text(value)

    @field_validator("age")
    @classmethod
    def validate_age(cls, value: int | None) -> int | None:
        if value is None:
            return value
        if value < 0 or value > 150:
            raise ValueError("年龄必须在 0 到 150 之间")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not PHONE_PATTERN.match(value):
            raise ValueError("电话格式不正确")
        return value


class PatientUpdate(AppBaseModel):
    name: str | None = Field(None, alias="姓名")
    gender: str | None = Field(None, alias="性别")
    age: int | None = Field(None, alias="年龄")
    phone: str | None = Field(None, alias="电话")
    address: str | None = Field(None, alias="地址")
    doctor_id: int | None = Field(None, alias="医生ID")
    medical_history: str | None = Field(None, alias="既往病史")
    allergy_history: str | None = Field(None, alias="过敏史")

    @field_validator("name", mode="before")
    @classmethod
    def validate_optional_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("患者姓名不能为空")
        return normalized

    @field_validator("gender", "phone", "address", "medical_history", "allergy_history", mode="before")
    @classmethod
    def normalize_optional_update_text(cls, value: str | None) -> str | None:
        return normalize_text(value)

    @field_validator("age")
    @classmethod
    def validate_optional_age(cls, value: int | None) -> int | None:
        return PatientCreate.validate_age(value)

    @field_validator("phone")
    @classmethod
    def validate_optional_phone(cls, value: str | None) -> str | None:
        return PatientCreate.validate_phone(value)


class PatientOut(PatientCreate, AppOrmModel):
    id: int = Field(..., alias="患者ID")
    created_at: datetime = Field(..., alias="创建时间")


class ConsultationCreate(AppBaseModel):
    patient_id: int = Field(..., alias="患者ID")
    doctor_id: int | None = Field(None, alias="医生ID")
    chief_complaint: str | None = Field(None, alias="主诉", examples=["发热、咳嗽三天"])
    symptoms: str | None = Field(None, alias="症状")
    present_illness: str | None = Field(None, alias="现病史")
    past_history: str | None = Field(None, alias="既往史")
    examination: str | None = Field(None, alias="检查结果")

    @field_validator("chief_complaint", "symptoms", "present_illness", "past_history", "examination", mode="before")
    @classmethod
    def normalize_consultation_text(cls, value: str | None) -> str | None:
        return normalize_text(value)


class ConsultationOut(ConsultationCreate, AppOrmModel):
    id: int = Field(..., alias="问诊ID")
    created_at: datetime = Field(..., alias="创建时间")


class AiDecisionRequest(AppBaseModel):
    consultation_id: int = Field(..., alias="问诊ID")


class AiReportOut(AppOrmModel):
    id: int = Field(..., alias="报告ID")
    consultation_id: int = Field(..., alias="问诊ID")
    possible_diseases: str | None = Field(None, alias="可能疾病")
    suggested_checks: str | None = Field(None, alias="建议检查")
    treatment_advice: str | None = Field(None, alias="辅助建议")
    risk_warning: str | None = Field(None, alias="风险提示")
    full_report: str | None = Field(None, alias="完整报告")
    created_at: datetime = Field(..., alias="创建时间")


class PatientConsultationOut(ConsultationOut):
    ai_report: AiReportOut | None = Field(None, alias="AI报告")


class DoctorStatsOut(AppBaseModel):
    doctor_id: int = Field(..., alias="医生ID")
    username: str = Field(..., alias="用户名")
    real_name: str | None = Field(None, alias="医生姓名")
    role: str = Field(..., alias="角色")
    is_active: bool = Field(True, alias="是否启用")
    patient_count: int = Field(..., alias="患者数量")
    consultation_count: int = Field(..., alias="问诊次数")
    ai_report_count: int = Field(0, alias="报告数量")
    last_consultation_time: datetime | None = Field(None, alias="最近问诊时间")


class DoctorPatientOut(PatientOut):
    consultation_count: int = Field(..., alias="问诊次数")
    last_consultation_time: datetime | None = Field(None, alias="最近问诊时间")


class ConsultationTrendPointOut(AppBaseModel):
    date: str = Field(..., alias="日期")
    consultation_count: int = Field(..., alias="问诊数量")


class DashboardPatientOut(AppBaseModel):
    patient_id: int = Field(..., alias="患者ID")
    name: str = Field(..., alias="姓名")
    doctor_name: str = Field(..., alias="医生姓名")
    created_at: datetime | None = Field(None, alias="创建时间")
    consultation_count: int | None = Field(None, alias="问诊次数")
    last_consultation_time: datetime | None = Field(None, alias="最近问诊时间")


class AdminDashboardOut(AppBaseModel):
    doctor_count: int = Field(..., alias="医生总数")
    patient_count: int = Field(..., alias="患者总数")
    consultation_count: int = Field(..., alias="问诊总数")
    ai_report_count: int = Field(..., alias="报告总数")
    today_consultation_count: int = Field(..., alias="今日问诊数")
    consultation_trend: list[ConsultationTrendPointOut] = Field(default_factory=list, alias="近7天问诊趋势")
    top_doctors: list[DoctorStatsOut] = Field(default_factory=list, alias="医生排行")
    recent_patients: list[DashboardPatientOut] = Field(default_factory=list, alias="最近新增患者")
    active_patients: list[DashboardPatientOut] = Field(default_factory=list, alias="活跃患者")


class OperationLogOut(AppOrmModel):
    id: int = Field(..., alias="日志ID")
    user_id: int | None = Field(None, alias="用户ID")
    username: str | None = Field(None, alias="用户名")
    role: str | None = Field(None, alias="角色")
    action: str = Field(..., alias="操作")
    module: str = Field(..., alias="模块")
    target_type: str | None = Field(None, alias="对象类型")
    target_id: str | None = Field(None, alias="对象ID")
    detail: str | None = Field(None, alias="详情")
    created_at: datetime = Field(..., alias="创建时间")


class OperationLogPageOut(AppBaseModel):
    items: list[OperationLogOut] = Field(default_factory=list, alias="日志列表")
    total: int = Field(0, alias="总数")
    page: int = Field(1, alias="页码")
    page_size: int = Field(20, alias="每页数量")
class MessageUserOut(AppOrmModel):
    id: int = Field(..., alias="用户ID")
    username: str = Field(..., alias="用户名")
    real_name: str | None = Field(None, alias="真实姓名")
    role: str = Field(..., alias="角色")
    is_active: bool = Field(True, alias="是否启用")


class MessageSendRequest(AppBaseModel):
    receiver_id: int = Field(..., alias="接收者ID")
    content: str = Field(..., alias="消息内容", min_length=1, max_length=500)

    @field_validator("content", mode="before")
    @classmethod
    def validate_message_content(cls, value: str) -> str:
        normalized = normalize_text(value)
        if not normalized:
            raise ValueError("消息内容不能为空")
        if len(normalized) > 500:
            raise ValueError("消息内容不能超过500字")
        return normalized


class MessageOut(AppOrmModel):
    id: int = Field(..., alias="消息ID")
    conversation_id: int = Field(..., alias="会话ID")
    sender_id: int = Field(..., alias="发送者ID")
    receiver_id: int = Field(..., alias="接收者ID")
    content: str = Field(..., alias="消息内容")
    is_read: bool = Field(..., alias="是否已读")
    created_at: datetime = Field(..., alias="发送时间")


class MessageConversationSummaryOut(AppBaseModel):
    conversation_id: int = Field(..., alias="会话ID")
    peer_user: MessageUserOut = Field(..., alias="聊天对象")
    last_message: str | None = Field(None, alias="最后一条消息")
    last_message_time: datetime | None = Field(None, alias="最后消息时间")
    unread_count: int = Field(0, alias="未读数量")


class MessageFetchResponseOut(AppBaseModel):
    new_message_count: int = Field(0, alias="新消息数量")
    unread_message_count: int = Field(0, alias="未读总数")
    conversations: list[MessageConversationSummaryOut] = Field(default_factory=list, alias="会话列表")
    current_messages: list[MessageOut] = Field(default_factory=list, alias="当前会话消息")
