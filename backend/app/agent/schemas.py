from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


RiskLevel = Literal["低", "中", "高", "待评估"]
UrgencyLevel = Literal["常规", "尽快", "紧急"]


class AgentBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PatientContext(AgentBaseModel):
    patient_id: int
    name: str
    gender: str | None = None
    age: int | None = None
    medical_history: str | None = None
    allergy_history: str | None = None


class ConsultationContext(AgentBaseModel):
    consultation_id: int
    patient_id: int
    chief_complaint: str | None = None
    symptoms: str | None = None
    present_illness: str | None = None
    past_history: str | None = None
    examination: str | None = None
    created_at: datetime | None = None


class HistoricalReportSummary(AgentBaseModel):
    patient_summary: str | None = None
    key_findings: str | None = None
    risk_level: str | None = None
    urgency_level: str | None = None


class HistoricalConsultation(AgentBaseModel):
    consultation_id: int
    chief_complaint: str | None = None
    symptoms: str | None = None
    present_illness: str | None = None
    past_history: str | None = None
    examination: str | None = None
    created_at: datetime | None = None
    report_summary: HistoricalReportSummary | None = None


class PatientHistoryContext(AgentBaseModel):
    patient_id: int
    consultations: list[HistoricalConsultation] = Field(default_factory=list)


class RiskAssessment(AgentBaseModel):
    risk_level: RiskLevel
    urgency: UrgencyLevel
    warning: str = Field(min_length=1)


class GeneratedMedicalReport(AgentBaseModel):
    patient_summary: str = Field(min_length=1)
    key_findings: str = Field(min_length=1)
    possible_diseases: str = Field(min_length=1)
    suggested_checks: str = Field(min_length=1)
    risk_level: RiskLevel
    urgency_level: UrgencyLevel
    treatment_advice: str = Field(min_length=1)
    follow_up_advice: str = Field(min_length=1)
    risk_warning: str = Field(min_length=1)
    full_report: str = Field(min_length=1)

    @field_validator("full_report")
    @classmethod
    def validate_disclaimer(cls, value: str) -> str:
        disclaimer_phrases = (
            "不能替代医生诊断",
            "不可替代医生诊断",
            "不能取代医生诊断",
            "不可取代医生诊断",
        )
        if not any(phrase in value for phrase in disclaimer_phrases):
            raise ValueError("完整报告缺少医疗辅助免责声明")
        return value


class MedicalReportPayload(GeneratedMedicalReport):
    structured_summary: str = Field(min_length=1)


class MedicalAgentError(Exception):
    category = "agent_error"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ConsultationNotFoundError(MedicalAgentError):
    category = "consultation_not_found"


class AgentConfigurationError(MedicalAgentError):
    category = "configuration_error"


class AgentTimeoutError(MedicalAgentError):
    category = "model_timeout"


class AgentConnectionError(MedicalAgentError):
    category = "model_connection_error"


class AgentServiceError(MedicalAgentError):
    category = "model_service_error"


class AgentResponseError(MedicalAgentError):
    category = "model_response_error"


class RiskAssessmentResponseError(AgentResponseError):
    category = "risk_response_error"


class ReportResponseError(AgentResponseError):
    category = "report_response_error"


class AgentToolError(MedicalAgentError):
    category = "tool_error"
