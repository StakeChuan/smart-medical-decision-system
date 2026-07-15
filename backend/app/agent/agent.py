from openai import OpenAI
from sqlalchemy.orm import Session

from app.agent.schemas import MedicalReportPayload
from app.agent.state import MedicalAgentState
from app.agent.tools import (
    assess_medical_risk,
    generate_medical_report,
    get_consultation_context,
    get_dashscope_client,
    get_patient_history,
)


def run_medical_agent(
    consultation_id: int,
    db: Session,
    client: OpenAI | None = None,
) -> MedicalReportPayload:
    state = MedicalAgentState(consultation_id=consultation_id)

    patient_context, consultation_context = get_consultation_context(db, consultation_id)
    state.patient_id = patient_context.patient_id
    state.patient_context = patient_context
    state.consultation_context = consultation_context

    state.patient_history = get_patient_history(
        db,
        patient_id=patient_context.patient_id,
        exclude_consultation_id=consultation_id,
        limit=5,
    )

    model_client = client or get_dashscope_client()
    state.risk_assessment = assess_medical_risk(model_client, state)
    state.final_report = generate_medical_report(model_client, state)
    return state.final_report
