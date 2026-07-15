from langgraph.graph import END, START, StateGraph

from app.agent.graph.edges import route_on_error
from app.agent.graph.nodes import (
    finalize_report_node,
    generate_report_node,
    load_context_node,
    load_history_node,
    risk_assessment_node,
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

    workflow.add_edge(START, "load_context")
    for current_node, next_node in (
        ("load_context", "load_history"),
        ("load_history", "assess_risk"),
        ("assess_risk", "generate_report"),
        ("generate_report", "finalize_report"),
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
