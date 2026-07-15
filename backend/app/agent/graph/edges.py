from app.agent.graph.state import GraphRoute, MedicalAgentGraphState


def route_on_error(state: MedicalAgentGraphState) -> GraphRoute:
    return "error" if state.get("error") is not None else "continue"
