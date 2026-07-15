import inspect
import os
import unittest
from unittest.mock import MagicMock, patch


os.environ["ENVIRONMENT"] = "production"
os.environ["APP_TOKEN_SECRET"] = "test-only-token-secret-with-at-least-32-characters"
os.environ["DASHSCOPE_MODEL"] = "test-medical-agent-model"
os.environ["MEDICAL_AGENT_ENGINE"] = "langgraph"

from app.agent import agent as agent_module  # noqa: E402
from app.agent.graph.graph import COMPILED_MEDICAL_AGENT_GRAPH  # noqa: E402
from app.agent.graph.state import (  # noqa: E402
    MedicalAgentGraphContext,
    create_initial_graph_state,
)
from app.agent.schemas import (  # noqa: E402
    AgentToolError,
    AgentWorkflowError,
    ConsultationContext,
    MedicalReportPayload,
    PatientContext,
    PatientHistoryContext,
    RiskAssessment,
)
from app.security.config import get_medical_agent_engine  # noqa: E402


def report_payload() -> MedicalReportPayload:
    return MedicalReportPayload(
        patient_summary="患者摘要",
        key_findings="关键发现",
        possible_diseases="可能疾病",
        suggested_checks="建议检查",
        risk_level="中",
        urgency_level="尽快",
        treatment_advice="辅助建议",
        follow_up_advice="复诊建议",
        risk_warning="需要医生审核",
        full_report="完整报告正文。仅供医生辅助参考，不能替代医生诊断。",
        structured_summary='{"risk_level":"中"}',
    )


class MedicalAgentGraphTests(unittest.TestCase):
    def setUp(self) -> None:
        self.patient = PatientContext(
            patient_id=21,
            name="敏感患者姓名",
            medical_history="敏感既往病史",
        )
        self.consultation = ConsultationContext(
            consultation_id=26,
            patient_id=21,
            chief_complaint="敏感主诉",
        )
        self.history = PatientHistoryContext(patient_id=21, consultations=[])
        self.risk = RiskAssessment(risk_level="中", urgency="尽快", warning="需要医生审核")
        self.report = report_payload()
        self.db = MagicMock(name="db")
        self.client = MagicMock(name="client")

    def invoke_graph(self):
        with (
            patch(
                "app.agent.graph.nodes.get_consultation_context",
                return_value=(self.patient, self.consultation),
            ) as context_mock,
            patch(
                "app.agent.graph.nodes.get_patient_history",
                return_value=self.history,
            ) as history_mock,
            patch(
                "app.agent.graph.nodes.assess_medical_risk",
                return_value=self.risk,
            ) as risk_mock,
            patch(
                "app.agent.graph.nodes.generate_medical_report",
                return_value=self.report,
            ) as report_mock,
        ):
            result = COMPILED_MEDICAL_AGENT_GRAPH.invoke(
                create_initial_graph_state(26),
                context=MedicalAgentGraphContext(db=self.db, client=self.client),
            )
        return result, (context_mock, history_mock, risk_mock, report_mock)

    def test_graph_executes_in_order_and_clears_clinical_context(self) -> None:
        result, mocks = self.invoke_graph()
        self.assertTrue(all(mock.call_count == 1 for mock in mocks))
        self.assertEqual(
            [item["node"] for item in result["execution_trace"]],
            ["load_context", "load_history", "assess_risk", "generate_report", "finalize_report"],
        )
        self.assertEqual(result["current_step"], "completed")
        self.assertIsInstance(result["medical_report"], MedicalReportPayload)
        self.assertIsNone(result["patient_context"])
        self.assertIsNone(result["consultation_context"])
        self.assertIsNone(result["history_context"])
        self.assertIsNone(result["risk_assessment"])

    def test_compiled_graph_is_reused(self) -> None:
        graph_id = id(COMPILED_MEDICAL_AGENT_GRAPH)
        self.invoke_graph()
        self.invoke_graph()
        self.assertEqual(id(agent_module.COMPILED_MEDICAL_AGENT_GRAPH), graph_id)

    def test_tool_error_stops_following_nodes_and_restores_domain_error(self) -> None:
        with (
            patch(
                "app.agent.graph.nodes.get_consultation_context",
                return_value=(self.patient, self.consultation),
            ),
            patch(
                "app.agent.graph.nodes.get_patient_history",
                side_effect=AgentToolError("读取患者历史失败"),
            ),
            patch("app.agent.graph.nodes.assess_medical_risk") as risk_mock,
            patch("app.agent.graph.nodes.generate_medical_report") as report_mock,
        ):
            result = COMPILED_MEDICAL_AGENT_GRAPH.invoke(
                create_initial_graph_state(26),
                context=MedicalAgentGraphContext(db=self.db, client=self.client),
            )
        self.assertEqual(result["error"].category, "tool_error")
        self.assertIsInstance(result["error"].to_exception(), AgentToolError)
        risk_mock.assert_not_called()
        report_mock.assert_not_called()

    def test_unknown_node_error_becomes_workflow_error(self) -> None:
        with patch(
            "app.agent.graph.nodes.get_consultation_context",
            side_effect=RuntimeError("private internal details"),
        ):
            result = COMPILED_MEDICAL_AGENT_GRAPH.invoke(
                create_initial_graph_state(26),
                context=MedicalAgentGraphContext(db=self.db, client=self.client),
            )
        error = result["error"].to_exception()
        self.assertIsInstance(error, AgentWorkflowError)
        self.assertNotIn("private internal details", str(error))

    def test_info_logs_only_node_duration_and_error_category(self) -> None:
        with self.assertLogs("app.agent.graph.nodes", level="INFO") as captured:
            self.invoke_graph()
        logs = " ".join(captured.output)
        self.assertIn("node=load_context", logs)
        self.assertIn("duration_ms=", logs)
        self.assertIn("error_category=none", logs)
        for private_value in ["敏感患者姓名", "敏感既往病史", "敏感主诉", "患者摘要"]:
            self.assertNotIn(private_value, logs)

    def test_executors_share_signature_and_health_is_non_clinical(self) -> None:
        self.assertEqual(
            inspect.signature(agent_module._run_medical_agent_legacy),
            inspect.signature(agent_module._run_medical_agent_graph),
        )
        health = agent_module.verify_medical_agent_engine()
        self.assertEqual(
            health,
            {"engine": "langgraph", "graph_loaded": True, "legacy_available": True},
        )
        self.assertNotIn("patient", str(health).lower())

    def test_legacy_and_graph_return_the_same_schema_and_error_type(self) -> None:
        with (
            patch.object(
                agent_module,
                "get_consultation_context",
                return_value=(self.patient, self.consultation),
            ),
            patch.object(agent_module, "get_patient_history", return_value=self.history),
            patch.object(agent_module, "assess_medical_risk", return_value=self.risk),
            patch.object(agent_module, "generate_medical_report", return_value=self.report),
            patch(
                "app.agent.graph.nodes.get_consultation_context",
                return_value=(self.patient, self.consultation),
            ),
            patch("app.agent.graph.nodes.get_patient_history", return_value=self.history),
            patch("app.agent.graph.nodes.assess_medical_risk", return_value=self.risk),
            patch("app.agent.graph.nodes.generate_medical_report", return_value=self.report),
        ):
            legacy_result = agent_module._run_medical_agent_legacy(
                26,
                self.db,
                client=self.client,
            )
            graph_result = agent_module._run_medical_agent_graph(
                26,
                self.db,
                client=self.client,
            )
        self.assertIsInstance(legacy_result, MedicalReportPayload)
        self.assertIsInstance(graph_result, MedicalReportPayload)
        self.assertEqual(legacy_result.model_dump(), graph_result.model_dump())

        with patch.object(
            agent_module,
            "get_consultation_context",
            side_effect=AgentToolError("读取当前问诊失败"),
        ):
            with self.assertRaises(AgentToolError):
                agent_module._run_medical_agent_legacy(26, self.db, client=self.client)
        with patch(
            "app.agent.graph.nodes.get_consultation_context",
            side_effect=AgentToolError("读取当前问诊失败"),
        ):
            with self.assertRaises(AgentToolError):
                agent_module._run_medical_agent_graph(26, self.db, client=self.client)

    def test_invalid_engine_and_graph_initialization_failure_are_explicit(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "MEDICAL_AGENT_ENGINE"):
            get_medical_agent_engine({"MEDICAL_AGENT_ENGINE": "invalid"})
        with patch.object(
            agent_module.importlib,
            "import_module",
            side_effect=RuntimeError("compile failed"),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "Medical Agent graph initialization failed",
            ):
                agent_module._load_compiled_medical_agent_graph()


if __name__ == "__main__":
    unittest.main()
