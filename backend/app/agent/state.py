from pydantic import BaseModel, ConfigDict

from app.agent.schemas import (
    ConsultationContext,
    MedicalReportPayload,
    PatientContext,
    PatientHistoryContext,
    RiskAssessment,
)


class MedicalAgentState(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    consultation_id: int
    patient_id: int | None = None
    patient_context: PatientContext | None = None
    consultation_context: ConsultationContext | None = None
    patient_history: PatientHistoryContext | None = None
    risk_assessment: RiskAssessment | None = None
    final_report: MedicalReportPayload | None = None
