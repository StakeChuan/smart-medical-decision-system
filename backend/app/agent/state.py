from pydantic import BaseModel, ConfigDict

from app.agent.schemas import (
    ConsultationContext,
    MedicalReportPayload,
    PatientContext,
    PatientHistoryContext,
    RiskAssessment,
    KnowledgeReportDraft,
)
from app.knowledge.schemas import KnowledgeRetrieval


class MedicalAgentState(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    consultation_id: int
    patient_id: int | None = None
    patient_context: PatientContext | None = None
    consultation_context: ConsultationContext | None = None
    patient_history: PatientHistoryContext | None = None
    risk_assessment: RiskAssessment | None = None
    baseline_risk_assessment: RiskAssessment | None = None
    knowledge_risk_assessment: RiskAssessment | None = None
    knowledge_retrieval: KnowledgeRetrieval | None = None
    knowledge_conflict: bool = False
    report_draft: KnowledgeReportDraft | None = None
    final_report: MedicalReportPayload | None = None
