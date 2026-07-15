import logging
import time
from collections.abc import Callable
from typing import Any

from langgraph.runtime import Runtime

from app.agent.graph.state import (
    GraphError,
    MedicalAgentGraphContext,
    MedicalAgentGraphState,
    NodeTrace,
)
from app.agent.schemas import AgentWorkflowError, MedicalAgentError, MedicalReportPayload
from app.agent.state import MedicalAgentState
from app.agent.tools import (
    assess_medical_risk,
    generate_medical_report,
    get_consultation_context,
    get_dashscope_client,
    get_patient_history,
)


logger = logging.getLogger(__name__)
NodeOperation = Callable[[], dict[str, Any]]


def _run_node(
    node_name: str,
    operation: NodeOperation,
) -> dict[str, Any]:
    started_at = time.perf_counter()
    error_category: str | None = None
    try:
        result = operation()
    except MedicalAgentError as exc:
        error_category = exc.category
        result = {"error": GraphError(category=exc.category, message=exc.message)}
    except Exception:
        error_category = AgentWorkflowError.category
        result = {
            "error": GraphError(
                category=AgentWorkflowError.category,
                message="Medical Agent workflow execution failed",
            )
        }
    finally:
        duration_ms = (time.perf_counter() - started_at) * 1000
        trace: NodeTrace = {
            "node": node_name,
            "duration_ms": duration_ms,
            "error_category": error_category,
        }
        logger.info(
            "medical_agent_node node=%s duration_ms=%.3f error_category=%s",
            node_name,
            duration_ms,
            error_category or "none",
        )
    result["execution_trace"] = [trace]
    return result


def _domain_state(state: MedicalAgentGraphState) -> MedicalAgentState:
    return MedicalAgentState(
        consultation_id=state["consultation_id"],
        patient_id=state.get("patient_id"),
        patient_context=state.get("patient_context"),
        consultation_context=state.get("consultation_context"),
        patient_history=state.get("history_context"),
        risk_assessment=state.get("risk_assessment"),
        final_report=state.get("medical_report"),
    )


def load_context_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        patient, consultation = get_consultation_context(
            runtime.context.db,
            state["consultation_id"],
        )
        return {
            "patient_id": patient.patient_id,
            "patient_context": patient,
            "consultation_context": consultation,
            "current_step": "load_context",
        }

    return _run_node("load_context", operation)


def load_history_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        patient_id = state.get("patient_id")
        if patient_id is None:
            raise AgentWorkflowError("Medical Agent workflow is missing patient context")
        history = get_patient_history(
            runtime.context.db,
            patient_id=patient_id,
            exclude_consultation_id=state["consultation_id"],
            limit=5,
        )
        return {"history_context": history, "current_step": "load_history"}

    return _run_node("load_history", operation)


def risk_assessment_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        if runtime.context.client is None:
            runtime.context.client = get_dashscope_client()
        risk = assess_medical_risk(runtime.context.client, _domain_state(state))
        return {"risk_assessment": risk, "current_step": "assess_risk"}

    return _run_node("assess_risk", operation)


def generate_report_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        if runtime.context.client is None:
            runtime.context.client = get_dashscope_client()
        report = generate_medical_report(runtime.context.client, _domain_state(state))
        return {"medical_report": report, "current_step": "generate_report"}

    return _run_node("generate_report", operation)


def finalize_report_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    del runtime
    def operation() -> dict[str, Any]:
        report = state.get("medical_report")
        if report is None:
            raise AgentWorkflowError("Medical Agent workflow did not produce a report")
        finalized = MedicalReportPayload.model_validate(report.model_dump())
        return {
            "medical_report": finalized,
            "patient_context": None,
            "consultation_context": None,
            "history_context": None,
            "risk_assessment": None,
            "current_step": "completed",
        }

    return _run_node("finalize_report", operation)
