import json
import os
import sys
import statistics
import time
from pathlib import Path
from unittest.mock import MagicMock, patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ["ENVIRONMENT"] = "production"
os.environ["APP_TOKEN_SECRET"] = "benchmark-only-token-secret-with-at-least-32-characters"
os.environ["DASHSCOPE_MODEL"] = "benchmark-model"
os.environ["MEDICAL_AGENT_ENGINE"] = "langgraph"

from app.agent import agent as agent_module  # noqa: E402
from app.agent.schemas import (  # noqa: E402
    ConsultationContext,
    MedicalReportPayload,
    PatientContext,
    PatientHistoryContext,
    RiskAssessment,
)


ITERATIONS = 500
WARMUP = 20


patient = PatientContext(patient_id=1, name="Synthetic")
consultation = ConsultationContext(consultation_id=1, patient_id=1)
history = PatientHistoryContext(patient_id=1, consultations=[])
risk = RiskAssessment(risk_level="低", urgency="常规", warning="Synthetic warning")
report = MedicalReportPayload(
    patient_summary="Synthetic summary",
    key_findings="Synthetic findings",
    possible_diseases="Synthetic possibilities",
    suggested_checks="Synthetic checks",
    risk_level="低",
    urgency_level="常规",
    treatment_advice="Synthetic advice",
    follow_up_advice="Synthetic follow up",
    risk_warning="Synthetic warning",
    full_report="Synthetic report. 仅供医生辅助参考，不能替代医生诊断。",
    structured_summary="{}",
)
db = MagicMock(name="benchmark_db")
client = MagicMock(name="benchmark_client")


def percentile(values: list[float], ratio: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((len(ordered) - 1) * ratio))
    return ordered[index]


def measure(operation) -> dict[str, float]:
    for _ in range(WARMUP):
        operation()
    values = []
    for _ in range(ITERATIONS):
        started_at = time.perf_counter()
        operation()
        values.append((time.perf_counter() - started_at) * 1000)
    return {
        "mean_ms": statistics.fmean(values),
        "p50_ms": percentile(values, 0.50),
        "p95_ms": percentile(values, 0.95),
    }


with (
    patch.object(agent_module, "get_consultation_context", return_value=(patient, consultation)),
    patch.object(agent_module, "get_patient_history", return_value=history),
    patch.object(agent_module, "assess_medical_risk", return_value=risk),
    patch.object(agent_module, "generate_medical_report", return_value=report),
    patch("app.agent.graph.nodes.get_consultation_context", return_value=(patient, consultation)),
    patch("app.agent.graph.nodes.get_patient_history", return_value=history),
    patch("app.agent.graph.nodes.assess_medical_risk", return_value=risk),
    patch("app.agent.graph.nodes.generate_medical_report", return_value=report),
):
    legacy = measure(lambda: agent_module._run_medical_agent_legacy(1, db, client=client))
    langgraph = measure(lambda: agent_module._run_medical_agent_graph(1, db, client=client))

result = {
    "iterations": ITERATIONS,
    "warmup": WARMUP,
    "legacy_business_time": legacy,
    "langgraph_total_time": langgraph,
    "langgraph_orchestration_overhead_ms": langgraph["mean_ms"] - legacy["mean_ms"],
    "includes_llm_network": False,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
