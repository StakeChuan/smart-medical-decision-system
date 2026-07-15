from app.agent.graph.state import GraphRoute, MedicalAgentGraphState


def route_on_error(state: MedicalAgentGraphState) -> GraphRoute:
    return "error" if state.get("error") is not None else "continue"


def route_after_history(state: MedicalAgentGraphState) -> str:
    if state.get("error") is not None:
        return "error"
    return "rag" if state.get("rag_enabled") else "standard"
