from langgraph.graph import END, START, StateGraph

from app.agent.graph.edges import route_after_history, route_on_error
from app.agent.graph.nodes import (
    baseline_risk_node,
    finalize_report_node,
    generate_report_node,
    generate_report_draft_node,
    knowledge_risk_node,
    load_context_node,
    load_history_node,
    merge_risk_node,
    retrieve_knowledge_node,
    risk_assessment_node,
    validate_citations_node,
)
from app.agent.graph.state import MedicalAgentGraphContext, MedicalAgentGraphState


def build_medical_agent_graph():
    workflow = StateGraph(
        MedicalAgentGraphState,
        context_schema=MedicalAgentGraphContext,
    )
    workflow.add_node("load_context", load_context_node)
    workflow.add_node("load_history", load_history_node)
    workflow.add_node("assess_risk", risk_assessment_node)
    workflow.add_node("generate_report", generate_report_node)
    workflow.add_node("finalize_report", finalize_report_node)
    workflow.add_node("retrieve_knowledge", retrieve_knowledge_node)
    workflow.add_node("patient_only_risk", baseline_risk_node)
    workflow.add_node("knowledge_assisted_risk", knowledge_risk_node)
    workflow.add_node("merge_risk", merge_risk_node)
    workflow.add_node("generate_report_draft", generate_report_draft_node)
    workflow.add_node("validate_citations", validate_citations_node)

    workflow.add_edge(START, "load_context")
    workflow.add_conditional_edges(
        "load_context", route_on_error, {"continue": "load_history", "error": END}
    )
    workflow.add_conditional_edges(
        "load_history",
        route_after_history,
        {"standard": "assess_risk", "rag": "retrieve_knowledge", "error": END},
    )
    for current_node, next_node in (
        ("assess_risk", "generate_report"),
        ("generate_report", "finalize_report"),
        ("retrieve_knowledge", "patient_only_risk"),
        ("patient_only_risk", "knowledge_assisted_risk"),
        ("knowledge_assisted_risk", "merge_risk"),
        ("merge_risk", "generate_report_draft"),
        ("generate_report_draft", "validate_citations"),
        ("validate_citations", "finalize_report"),
    ):
        workflow.add_conditional_edges(
            current_node,
            route_on_error,
            {"continue": next_node, "error": END},
        )
    workflow.add_edge("finalize_report", END)
    return workflow.compile(name="medical-agent")


try:
    COMPILED_MEDICAL_AGENT_GRAPH = build_medical_agent_graph()
except Exception as exc:
    raise RuntimeError("Medical Agent graph initialization failed") from exc
