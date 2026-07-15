import importlib

from openai import OpenAI
from sqlalchemy.orm import Session

from app.agent.schemas import AgentWorkflowError, MedicalReportPayload
from app.agent.state import MedicalAgentState
from app.agent.tools import (
    assess_medical_risk,
    generate_medical_report,
    get_consultation_context,
    get_dashscope_client,
    get_patient_history,
)
from app.security.config import get_medical_agent_engine


MEDICAL_AGENT_ENGINE = get_medical_agent_engine()
COMPILED_MEDICAL_AGENT_GRAPH = None


def _load_compiled_medical_agent_graph():
    try:
        graph_module = importlib.import_module("app.agent.graph.graph")
        return graph_module.COMPILED_MEDICAL_AGENT_GRAPH
    except Exception as exc:
        raise RuntimeError("Medical Agent graph initialization failed") from exc


if MEDICAL_AGENT_ENGINE == "langgraph":
    COMPILED_MEDICAL_AGENT_GRAPH = _load_compiled_medical_agent_graph()


def _run_medical_agent_legacy(
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


def _run_medical_agent_graph(
    consultation_id: int,
    db: Session,
    client: OpenAI | None = None,
) -> MedicalReportPayload:
    if COMPILED_MEDICAL_AGENT_GRAPH is None:
        raise AgentWorkflowError("Medical Agent graph is not loaded")

    from app.agent.graph.state import MedicalAgentGraphContext, create_initial_graph_state

    try:
        result = COMPILED_MEDICAL_AGENT_GRAPH.invoke(
            create_initial_graph_state(consultation_id),
            context=MedicalAgentGraphContext(db=db, client=client),
        )
    except AgentWorkflowError:
        raise
    except Exception as exc:
        raise AgentWorkflowError("Medical Agent workflow execution failed") from exc

    error = result.get("error")
    if error is not None:
        raise error.to_exception()

    report = result.get("medical_report")
    if not isinstance(report, MedicalReportPayload):
        raise AgentWorkflowError("Medical Agent workflow did not produce a report")
    return report


def run_medical_agent(
    consultation_id: int,
    db: Session,
    client: OpenAI | None = None,
) -> MedicalReportPayload:
    if MEDICAL_AGENT_ENGINE == "legacy":
        return _run_medical_agent_legacy(consultation_id, db, client=client)
    return _run_medical_agent_graph(consultation_id, db, client=client)


def verify_medical_agent_engine() -> dict[str, str | bool]:
    return {
        "engine": MEDICAL_AGENT_ENGINE,
        "graph_loaded": COMPILED_MEDICAL_AGENT_GRAPH is not None,
        "legacy_available": callable(_run_medical_agent_legacy),
    }
