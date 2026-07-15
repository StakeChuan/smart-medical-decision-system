import json
import os
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ["ENVIRONMENT"] = "production"
os.environ["APP_TOKEN_SECRET"] = "test-only-token-secret-with-at-least-32-characters"
os.environ["DASHSCOPE_MODEL"] = "test-medical-agent-model"

from app import main as main_module  # noqa: E402
from app import models  # noqa: E402
from app.agent.agent import run_medical_agent  # noqa: E402
from app.agent.schemas import AgentResponseError, MedicalReportPayload  # noqa: E402
from app.agent.tools import get_patient_history  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.security.password import hash_password  # noqa: E402


def report_response(
    risk_level: str = "低",
    urgency_level: str = "常规",
    risk_warning: str = "报告中的风险提示",
) -> dict[str, str]:
    return {
        "patient_summary": "患者摘要",
        "key_findings": "关键发现",
        "possible_diseases": "可能疾病",
        "suggested_checks": "建议检查",
        "risk_level": risk_level,
        "urgency_level": urgency_level,
        "treatment_advice": "辅助建议",
        "follow_up_advice": "复诊建议",
        "risk_warning": risk_warning,
        "full_report": "完整报告。仅供医生辅助参考，不能替代医生诊断。",
    }


def report_payload(summary: str = "患者摘要") -> MedicalReportPayload:
    values = report_response(risk_level="高", urgency_level="紧急", risk_warning="立即审核")
    values["patient_summary"] = summary
    return MedicalReportPayload(
        **values,
        structured_summary=json.dumps(values, ensure_ascii=False),
    )


class FakeCompletions:
    def __init__(self, responses: list[str]):
        self.responses = responses
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        content = self.responses.pop(0)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )


class FakeClient:
    def __init__(self, responses: list[str]):
        self.completions = FakeCompletions(responses)
        self.chat = SimpleNamespace(completions=self.completions)


class MedicalAgentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

        def override_get_db():
            db = cls.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        cls.engine.dispose()

    def setUp(self) -> None:
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        now = datetime(2026, 7, 15, 9, 0, 0)
        with self.session_factory() as db:
            doctor = models.User(
                username="agent-doctor",
                password=hash_password("doctor-pass"),
                real_name="Agent Doctor",
                role="doctor",
                is_active=1,
            )
            other_doctor = models.User(
                username="other-doctor",
                password=hash_password("other-pass"),
                real_name="Other Doctor",
                role="doctor",
                is_active=1,
            )
            db.add_all([doctor, other_doctor])
            db.flush()
            patient = models.Patient(
                name="测试患者",
                gender="女",
                age=36,
                phone="13800000000",
                address="不应进入 Agent 上下文",
                doctor_id=doctor.id,
                medical_history="高血压病史",
                allergy_history="青霉素过敏",
            )
            other_patient = models.Patient(name="其他患者", doctor_id=other_doctor.id)
            db.add_all([patient, other_patient])
            db.flush()

            history = []
            for index in range(7):
                consultation = models.Consultation(
                    patient_id=patient.id,
                    doctor_id=doctor.id,
                    chief_complaint=f"历史主诉{index}",
                    symptoms=f"历史症状{index}",
                    created_at=now + timedelta(days=index),
                )
                db.add(consultation)
                db.flush()
                db.add(
                    models.AiReport(
                        consultation_id=consultation.id,
                        patient_summary=f"历史摘要{index}",
                        key_findings=f"历史发现{index}",
                        risk_level="低",
                        urgency_level="常规",
                        full_report=f"PRIVATE_FULL_REPORT_{index}",
                    )
                )
                history.append(consultation)

            current = models.Consultation(
                patient_id=patient.id,
                doctor_id=doctor.id,
                chief_complaint="当前主诉",
                symptoms="当前症状",
                present_illness="当前现病史",
                examination="当前检查结果",
                created_at=now + timedelta(days=10),
            )
            forbidden = models.Consultation(
                patient_id=other_patient.id,
                doctor_id=other_doctor.id,
                chief_complaint="无权访问",
                created_at=now,
            )
            db.add_all([current, forbidden])
            db.commit()
            self.doctor_id = doctor.id
            self.patient_id = patient.id
            self.current_consultation_id = current.id
            self.forbidden_consultation_id = forbidden.id
            self.expected_history_ids = [item.id for item in reversed(history[-5:])]

        with self.session_factory() as db:
            doctor = db.get(models.User, self.doctor_id)
            self.headers = {"Authorization": f"Bearer {main_module.create_access_token(doctor)}"}

    def test_patient_history_is_bounded_ordered_and_excludes_sensitive_fields(self) -> None:
        with self.session_factory() as db:
            history = get_patient_history(
                db,
                self.patient_id,
                exclude_consultation_id=self.current_consultation_id,
                limit=20,
            )
        self.assertEqual([item.consultation_id for item in history.consultations], self.expected_history_ids)
        serialized = history.model_dump_json()
        self.assertNotIn("13800000000", serialized)
        self.assertNotIn("不应进入 Agent 上下文", serialized)
        self.assertNotIn("PRIVATE_FULL_REPORT", serialized)

    def test_agent_uses_two_model_calls_and_locks_risk_result(self) -> None:
        fake_client = FakeClient([
            json.dumps({"risk_level": "高", "urgency": "紧急", "warning": "立即审核"}, ensure_ascii=False),
            json.dumps(report_response(), ensure_ascii=False),
        ])
        previous_model = os.environ.get("DASHSCOPE_MODEL")
        os.environ["DASHSCOPE_MODEL"] = "qwen-agent-test"
        try:
            with self.session_factory() as db:
                result = run_medical_agent(self.current_consultation_id, db, client=fake_client)
        finally:
            if previous_model is None:
                os.environ.pop("DASHSCOPE_MODEL", None)
            else:
                os.environ["DASHSCOPE_MODEL"] = previous_model

        self.assertEqual(len(fake_client.completions.calls), 2)
        self.assertTrue(all(call["model"] == "qwen-agent-test" for call in fake_client.completions.calls))
        self.assertEqual(result.risk_level, "高")
        self.assertEqual(result.urgency_level, "紧急")
        self.assertEqual(result.risk_warning, "立即审核")
        prompts = " ".join(call["messages"][1]["content"] for call in fake_client.completions.calls)
        self.assertIn("历史摘要6", prompts)
        self.assertNotIn("历史摘要0", prompts)
        self.assertNotIn("PRIVATE_FULL_REPORT", prompts)
        self.assertNotIn("13800000000", prompts)

    def test_invalid_json_missing_fields_and_invalid_enum_fail_strictly(self) -> None:
        invalid_responses = [
            ["not-json"],
            [json.dumps({"risk_level": "高", "urgency": "紧急"}, ensure_ascii=False)],
            [json.dumps({"risk_level": "危急", "urgency": "紧急", "warning": "提示"}, ensure_ascii=False)],
        ]
        for responses in invalid_responses:
            with self.subTest(responses=responses):
                with self.session_factory() as db:
                    with self.assertRaises(AgentResponseError):
                        run_medical_agent(self.current_consultation_id, db, client=FakeClient(responses.copy()))
                    self.assertIsNone(
                        db.query(models.AiReport)
                        .filter_by(consultation_id=self.current_consultation_id)
                        .first()
                    )

    def test_common_qwen_aliases_lists_and_extra_fields_are_normalized(self) -> None:
        risk_content = "分析结果如下：\n```json\n" + json.dumps(
            {
                "风险等级": "中风险",
                "urgency_level": "尽快处理",
                "risk_warning": ["持续观察", "症状加重时及时就医"],
                "reason": "额外解释字段不进入 Domain Model",
            },
            ensure_ascii=False,
        ) + "\n```"
        report_content = "```json\n" + json.dumps(
            {
                "患者摘要": "患者摘要",
                "关键发现": ["发现一", "发现二"],
                "可能疾病": ["疾病甲", "疾病乙"],
                "建议检查": ["检查甲", "检查乙"],
                "风险等级": "medium",
                "紧急程度": "soon",
                "处置建议": {"原则": "由医生结合病情审核"},
                "复诊建议": ["按需复诊"],
                "风险提示": "模型报告中的提示",
                "完整报告": "结构化完整报告正文。",
                "confidence": 0.88,
            },
            ensure_ascii=False,
        ) + "\n```"
        fake_client = FakeClient([risk_content, report_content])

        with self.session_factory() as db:
            result = run_medical_agent(self.current_consultation_id, db, client=fake_client)

        self.assertEqual(result.risk_level, "中")
        self.assertEqual(result.urgency_level, "尽快")
        self.assertEqual(result.risk_warning, "持续观察；症状加重时及时就医")
        self.assertEqual(result.key_findings, "发现一；发现二")
        self.assertEqual(result.possible_diseases, "疾病甲；疾病乙")
        self.assertIn("由医生结合病情审核", result.treatment_advice)
        self.assertIn("不能替代医生诊断", result.full_report)

    def test_disclaimer_only_full_report_is_rebuilt_from_structured_fields(self) -> None:
        risk_content = json.dumps(
            {"risk_level": "中", "urgency": "尽快", "warning": "需要医生尽快审核"},
            ensure_ascii=False,
        )
        report = report_response(risk_level="中", urgency_level="尽快")
        report["patient_summary"] = "患者存在持续咳嗽和活动后气短。"
        report["key_findings"] = "症状持续三个月，近期逐渐加重。"
        report["full_report"] = (
            "本报告基于现有临床信息生成，仅供医生辅助参考，不能替代医生诊断。"
        )

        with self.session_factory() as db:
            result = run_medical_agent(
                self.current_consultation_id,
                db,
                client=FakeClient([risk_content, json.dumps(report, ensure_ascii=False)]),
            )

        self.assertIn("患者摘要\n患者存在持续咳嗽和活动后气短。", result.full_report)
        self.assertIn("关键发现\n症状持续三个月，近期逐渐加重。", result.full_report)
        self.assertIn("风险等级\n中", result.full_report)
        self.assertIn("不能替代医生诊断", result.full_report)

    def test_both_api_routes_keep_response_contract(self) -> None:
        for path, body in [
            ("/ai/decision", {"问诊ID": self.current_consultation_id}),
            (f"/ai/decision/{self.current_consultation_id}?force=true", None),
        ]:
            with self.subTest(path=path):
                with patch("app.main.run_medical_agent", return_value=report_payload()):
                    response = self.client.post(path, headers=self.headers, json=body)
                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(payload["问诊ID"], self.current_consultation_id)
                self.assertEqual(payload["风险等级"], "高")
                self.assertIn("完整报告", payload)

    def test_cached_report_skips_agent_without_force(self) -> None:
        with patch("app.main.run_medical_agent", return_value=report_payload("首次报告")) as agent_mock:
            first = self.client.post(
                "/ai/decision",
                headers=self.headers,
                json={"问诊ID": self.current_consultation_id},
            )
            second = self.client.post(
                "/ai/decision",
                headers=self.headers,
                json={"问诊ID": self.current_consultation_id},
            )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(agent_mock.call_count, 1)
        with self.session_factory() as db:
            self.assertEqual(db.query(models.OperationLog).filter_by(module="AI Agent").count(), 1)

    def test_force_failure_preserves_existing_report_and_writes_sanitized_log(self) -> None:
        with patch("app.main.run_medical_agent", return_value=report_payload("原报告")):
            created = self.client.post(
                "/ai/decision",
                headers=self.headers,
                json={"问诊ID": self.current_consultation_id},
            )
        self.assertEqual(created.status_code, 200)

        with patch(
            "app.main.run_medical_agent",
            side_effect=AgentResponseError("PRIVATE_PROMPT API_KEY TOKEN PASSWORD"),
        ):
            failed = self.client.post(
                f"/ai/decision/{self.current_consultation_id}?force=true",
                headers=self.headers,
            )
        self.assertEqual(failed.status_code, 502)
        with self.session_factory() as db:
            report = db.query(models.AiReport).filter_by(consultation_id=self.current_consultation_id).one()
            self.assertEqual(report.patient_summary, "原报告")
            failed_log = (
                db.query(models.OperationLog)
                .filter_by(module="AI Agent", action="失败")
                .order_by(models.OperationLog.id.desc())
                .first()
            )
            self.assertIsNotNone(failed_log)
            self.assertIn("model_response_error", failed_log.detail)
            for secret in ["PRIVATE_PROMPT", "API_KEY", "TOKEN", "PASSWORD"]:
                self.assertNotIn(secret, failed_log.detail)

    def test_permission_is_checked_before_agent_invocation(self) -> None:
        with patch("app.main.run_medical_agent", return_value=report_payload()) as agent_mock:
            response = self.client.post(
                f"/ai/decision/{self.forbidden_consultation_id}",
                headers=self.headers,
            )
        self.assertEqual(response.status_code, 403)
        agent_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
