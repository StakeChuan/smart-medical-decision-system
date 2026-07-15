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
    assess_medical_risk_with_knowledge,
    finalize_knowledge_report,
    generate_medical_report,
    generate_medical_report_draft,
    get_consultation_context,
    get_dashscope_client,
    get_patient_history,
)
from app.knowledge.errors import (
    KnowledgeCitationError,
    KnowledgeConfigurationError,
    KnowledgeEmbeddingConnectionError,
    KnowledgeEmbeddingServiceError,
    KnowledgeEmbeddingTimeoutError,
    KnowledgeError,
)
from app.knowledge.schemas import KnowledgeRetrieval
from app.knowledge.service import build_clinical_query
from app.agent.schemas import (
    AgentConfigurationError,
    AgentConnectionError,
    AgentResponseError,
    AgentServiceError,
    AgentTimeoutError,
    AgentToolError,
    RiskAssessment,
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
        baseline_risk_assessment=state.get("baseline_risk_assessment"),
        knowledge_risk_assessment=state.get("knowledge_risk_assessment"),
        knowledge_retrieval=state.get("knowledge_retrieval"),
        knowledge_conflict=state.get("knowledge_conflict", False),
        report_draft=state.get("report_draft"),
        final_report=state.get("medical_report"),
    )


def _raise_agent_knowledge_error(exc: KnowledgeError) -> None:
    if isinstance(exc, KnowledgeEmbeddingTimeoutError):
        raise AgentTimeoutError("知识 Embedding 调用超时") from exc
    if isinstance(exc, KnowledgeEmbeddingConnectionError):
        raise AgentConnectionError("无法连接知识 Embedding 服务") from exc
    if isinstance(exc, KnowledgeEmbeddingServiceError):
        raise AgentServiceError("知识 Embedding 服务调用失败") from exc
    if isinstance(exc, KnowledgeCitationError):
        raise AgentResponseError("知识引用校验失败") from exc
    if isinstance(exc, KnowledgeConfigurationError):
        raise AgentConfigurationError("医学知识库配置无效") from exc
    raise AgentToolError("医学知识检索失败") from exc


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
            "baseline_risk_assessment": None,
            "knowledge_risk_assessment": None,
            "knowledge_retrieval": None,
            "report_draft": None,
            "knowledge_conflict": False,
            "current_step": "completed",
        }

    return _run_node("finalize_report", operation)


def retrieve_knowledge_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        service = runtime.context.knowledge_service
        patient = state.get("patient_context")
        consultation = state.get("consultation_context")
        if service is None or patient is None or consultation is None:
            raise AgentConfigurationError("医学知识服务尚未加载")
        query = build_clinical_query(
            [
                patient.medical_history,
                patient.allergy_history,
                consultation.chief_complaint,
                consultation.symptoms,
                consultation.present_illness,
                consultation.past_history,
                consultation.examination,
            ]
        )
        try:
            retrieval = service.retrieve(query)
        except KnowledgeError as exc:
            _raise_agent_knowledge_error(exc)
            raise AssertionError("unreachable")
        return {"knowledge_retrieval": retrieval, "current_step": "retrieve_knowledge"}

    return _run_node("retrieve_knowledge", operation)


def baseline_risk_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        if runtime.context.client is None:
            runtime.context.client = get_dashscope_client()
        risk = assess_medical_risk(runtime.context.client, _domain_state(state))
        return {"baseline_risk_assessment": risk, "current_step": "patient_only_risk"}

    return _run_node("patient_only_risk", operation)


def knowledge_risk_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        retrieval = state.get("knowledge_retrieval")
        if retrieval is None:
            raise AgentWorkflowError("Medical Agent workflow is missing knowledge retrieval")
        if not retrieval.matches:
            return {"knowledge_risk_assessment": None, "current_step": "knowledge_assisted_risk"}
        if runtime.context.client is None:
            runtime.context.client = get_dashscope_client()
        risk = assess_medical_risk_with_knowledge(runtime.context.client, _domain_state(state))
        return {"knowledge_risk_assessment": risk, "current_step": "knowledge_assisted_risk"}

    return _run_node("knowledge_assisted_risk", operation)


def merge_risk_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    del runtime

    def operation() -> dict[str, Any]:
        baseline = state.get("baseline_risk_assessment")
        knowledge = state.get("knowledge_risk_assessment")
        if baseline is None:
            raise AgentWorkflowError("Medical Agent workflow is missing baseline risk")
        if knowledge is None:
            return {"risk_assessment": baseline, "knowledge_conflict": False, "current_step": "merge_risk"}
        risk_rank = {"待评估": -1, "低": 0, "中": 1, "高": 2}
        urgency_rank = {"常规": 0, "尽快": 1, "紧急": 2}
        conflict = (
            risk_rank[knowledge.risk_level] < risk_rank[baseline.risk_level]
            or urgency_rank[knowledge.urgency] < urgency_rank[baseline.urgency]
        )
        chosen_risk = knowledge.risk_level if risk_rank[knowledge.risk_level] > risk_rank[baseline.risk_level] else baseline.risk_level
        chosen_urgency = knowledge.urgency if urgency_rank[knowledge.urgency] > urgency_rank[baseline.urgency] else baseline.urgency
        warning = knowledge.warning if (chosen_risk == knowledge.risk_level and chosen_urgency == knowledge.urgency and not conflict) else baseline.warning
        if conflict:
            warning = f"{warning.rstrip('。')}。患者资料与知识依据存在冲突，请由医生判断。"
        merged = RiskAssessment(risk_level=chosen_risk, urgency=chosen_urgency, warning=warning)
        return {"risk_assessment": merged, "knowledge_conflict": conflict, "current_step": "merge_risk"}

    return _run_node("merge_risk", operation)


def generate_report_draft_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    def operation() -> dict[str, Any]:
        if runtime.context.client is None:
            runtime.context.client = get_dashscope_client()
        draft = generate_medical_report_draft(runtime.context.client, _domain_state(state))
        return {"report_draft": draft, "current_step": "generate_report_draft"}

    return _run_node("generate_report_draft", operation)


def validate_citations_node(
    state: MedicalAgentGraphState,
    runtime: Runtime[MedicalAgentGraphContext],
) -> dict[str, Any]:
    del runtime

    def operation() -> dict[str, Any]:
        draft = state.get("report_draft")
        risk = state.get("risk_assessment")
        retrieval = state.get("knowledge_retrieval") or KnowledgeRetrieval(matches=(), context_chars=0)
        if draft is None or risk is None:
            raise AgentWorkflowError("Medical Agent workflow is missing report draft or risk")
        try:
            report = finalize_knowledge_report(
                draft,
                risk,
                retrieval,
                state.get("knowledge_conflict", False),
            )
        except KnowledgeError as exc:
            _raise_agent_knowledge_error(exc)
            raise AssertionError("unreachable")
        return {"medical_report": report, "current_step": "validate_citations"}

    return _run_node("validate_citations", operation)
