from __future__ import annotations

import operator
from dataclasses import dataclass
from typing import Annotated, Literal, TypedDict

from openai import OpenAI
from sqlalchemy.orm import Session

from app.agent.schemas import (
    AgentConfigurationError,
    AgentConnectionError,
    AgentResponseError,
    AgentServiceError,
    AgentTimeoutError,
    AgentToolError,
    AgentWorkflowError,
    ConsultationContext,
    ConsultationNotFoundError,
    MedicalAgentError,
    MedicalReportPayload,
    PatientContext,
    PatientHistoryContext,
    ReportResponseError,
    RiskAssessment,
    RiskAssessmentResponseError,
)


class NodeTrace(TypedDict):
    node: str
    duration_ms: float
    error_category: str | None


@dataclass(frozen=True)
class GraphError:
    category: str
    message: str

    def to_exception(self) -> MedicalAgentError:
        error_types: dict[str, type[MedicalAgentError]] = {
            ConsultationNotFoundError.category: ConsultationNotFoundError,
            AgentConfigurationError.category: AgentConfigurationError,
            AgentTimeoutError.category: AgentTimeoutError,
            AgentConnectionError.category: AgentConnectionError,
            AgentServiceError.category: AgentServiceError,
            AgentResponseError.category: AgentResponseError,
            RiskAssessmentResponseError.category: RiskAssessmentResponseError,
            ReportResponseError.category: ReportResponseError,
            AgentToolError.category: AgentToolError,
            AgentWorkflowError.category: AgentWorkflowError,
        }
        error_type = error_types.get(self.category, AgentWorkflowError)
        return error_type(self.message)


class MedicalAgentGraphState(TypedDict):
    consultation_id: int
    patient_id: int | None
    patient_context: PatientContext | None
    consultation_context: ConsultationContext | None
    history_context: PatientHistoryContext | None
    risk_assessment: RiskAssessment | None
    medical_report: MedicalReportPayload | None
    error: GraphError | None
    current_step: str
    execution_trace: Annotated[list[NodeTrace], operator.add]


@dataclass
class MedicalAgentGraphContext:
    db: Session
    client: OpenAI | None = None


GraphRoute = Literal["continue", "error"]


def create_initial_graph_state(consultation_id: int) -> MedicalAgentGraphState:
    return {
        "consultation_id": consultation_id,
        "patient_id": None,
        "patient_context": None,
        "consultation_context": None,
        "history_context": None,
        "risk_assessment": None,
        "medical_report": None,
        "error": None,
        "current_step": "start",
        "execution_trace": [],
    }
