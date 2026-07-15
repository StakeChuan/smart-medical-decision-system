import hashlib
import math
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("APP_TOKEN_SECRET", "test-only-token-secret-with-at-least-32-characters")
os.environ.setdefault("DASHSCOPE_MODEL", "test-medical-agent-model")
os.environ.setdefault("MEDICAL_AGENT_ENGINE", "langgraph")
os.environ["MEDICAL_RAG_ENABLED"] = "false"

from app.agent.graph.graph import COMPILED_MEDICAL_AGENT_GRAPH  # noqa: E402
from app.agent.graph.state import MedicalAgentGraphContext, create_initial_graph_state  # noqa: E402
from app.agent.schemas import (  # noqa: E402
    ConsultationContext,
    KnowledgeReportDraft,
    PatientContext,
    PatientHistoryContext,
    RiskAssessment,
)
from app.agent.tools import (  # noqa: E402
    KNOWLEDGE_CONFLICT_TEXT,
    NO_KNOWLEDGE_TEXT,
    finalize_knowledge_report,
)
from app.knowledge.chunker import chunk_document  # noqa: E402
from app.knowledge.errors import (  # noqa: E402
    KnowledgeCitationError,
    KnowledgeConfigurationError,
    KnowledgeIndexError,
    KnowledgeIndexReplaceError,
)
from app.knowledge.index import build_index, load_index_snapshot, validate_index  # noqa: E402
from app.knowledge.loader import load_document  # noqa: E402
from app.knowledge.retriever import retrieve_knowledge  # noqa: E402
from app.knowledge.schemas import (  # noqa: E402
    KnowledgeChunk,
    KnowledgeRetrieval,
    KnowledgeSourceMetadata,
    RetrievedKnowledgeChunk,
)
from app.knowledge.service import KnowledgeService  # noqa: E402
from app.security.config import get_medical_rag_settings  # noqa: E402


def source_text(source_id: str, title: str, body: str) -> str:
    return f'''+++
source_id = "{source_id}"
title = "{title}"
organization = "测试医学机构"
version = "1.0"
published_at = "2026-01-01"
source_url = "https://example.invalid/{source_id}"
scope = "仅用于自动化测试"
+++

{body}
'''


class FakeEmbeddingProvider:
    model = "fake-embedding-v1"

    def __init__(self, dimensions: int = 1024) -> None:
        self.dimensions = dimensions
        self.calls = 0

    def _vector(self, text: str) -> tuple[float, ...]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        values = [((digest[index % len(digest)] / 255.0) - 0.5) for index in range(self.dimensions)]
        values[0] += 1.0
        return tuple(values)

    def embed_texts(self, texts):
        self.calls += len(texts)
        return [self._vector(text) for text in texts]

    def embed_query(self, text: str):
        return self._vector(text)


def valid_draft(reference_ids: list[str] | None = None, full_report: str | None = None):
    return KnowledgeReportDraft(
        patient_summary="患者存在需要医生审核的当前症状",
        key_findings="当前问诊记录包含明确临床信息",
        possible_diseases="需由医生结合检查进行鉴别",
        suggested_checks="建议按临床判断完善相关检查",
        risk_level="中",
        urgency_level="尽快",
        treatment_advice="由医生评估后决定处置方案",
        follow_up_advice="症状变化时及时复诊",
        risk_warning="需要医生进一步审核",
        full_report=full_report or "这是一份针对当前问诊的完整医学报告，仅供医生辅助参考，不能替代医生诊断。",
        knowledge_reference_ids=reference_ids or [],
    )


def retrieval_for(reference_id: str = "REF-ABCDEF123456") -> KnowledgeRetrieval:
    metadata = KnowledgeSourceMetadata(
        source_id="source-1",
        title="测试指南",
        organization="测试医学机构",
        version="1.0",
        published_at="2026-01-01",
        source_url="https://example.invalid/source-1",
        scope="测试范围",
    )
    chunk = KnowledgeChunk(
        chunk_id="a" * 64,
        reference_id=reference_id,
        document_hash="b" * 64,
        metadata=metadata,
        section_path="风险识别 > 处置",
        ordinal=0,
        text="虚构测试知识片段，不包含真实患者资料。",
    )
    return KnowledgeRetrieval(
        matches=(RetrievedKnowledgeChunk(chunk=chunk, score=0.98),),
        context_chars=len(chunk.text),
    )


class KnowledgeIndexTests(unittest.TestCase):
    def test_rag_configuration_is_strict_only_when_enabled(self) -> None:
        disabled = get_medical_rag_settings({"MEDICAL_RAG_ENABLED": "false"})
        self.assertFalse(disabled.enabled)
        with self.assertRaisesRegex(RuntimeError, "MEDICAL_KNOWLEDGE_INDEX_PATH"):
            get_medical_rag_settings({"MEDICAL_RAG_ENABLED": "true"})
        with self.assertRaisesRegex(RuntimeError, "MEDICAL_RAG_TOP_K"):
            get_medical_rag_settings(
                {
                    "MEDICAL_RAG_ENABLED": "true",
                    "MEDICAL_RAG_TOP_K": "0",
                    "MEDICAL_KNOWLEDGE_INDEX_PATH": "x",
                }
            )

    def test_metadata_chunking_and_ids_are_stable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "guide.md"
            path.write_text(
                source_text("guide-1", "测试指南", "# 第一章\n" + "医学测试文本。" * 180),
                encoding="utf-8",
            )
            first = load_document(path)
            second = load_document(path)
            chunks = chunk_document(first)
            self.assertEqual(first.document_hash, second.document_hash)
            self.assertGreater(len(chunks), 1)
            self.assertTrue(all(len(item.text) <= 900 for item in chunks))
            self.assertTrue(all(item.reference_id == f"REF-{item.chunk_id[:12].upper()}" for item in chunks))
            self.assertTrue(all(item.section_path == "第一章" for item in chunks))

    def test_invalid_metadata_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.md"
            path.write_text("+++\nsource_id='x'\n+++\ntext", encoding="utf-8")
            with self.assertRaises(KnowledgeConfigurationError):
                load_document(path)

    def test_build_load_update_delete_and_closed_handle_replace(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sources = root / "sources"
            sources.mkdir()
            first = sources / "first.md"
            second = sources / "second.txt"
            first.write_text(source_text("one", "第一份", "# 内容\n测试内容一。"), encoding="utf-8")
            second.write_text(source_text("two", "第二份", "# 内容\n测试内容二。"), encoding="utf-8")
            index_path = root / "knowledge.sqlite"
            embedder = FakeEmbeddingProvider()
            result = build_index(sources, index_path, embedder)
            self.assertEqual(result["chunk_count"], 2)
            snapshot = load_index_snapshot(index_path, embedder.model, embedder.dimensions)
            self.assertEqual(len(snapshot.chunks), 2)

            moved = root / "moved.sqlite"
            os.replace(index_path, moved)
            os.replace(moved, index_path)

            second.unlink()
            first.write_text(source_text("one", "第一份", "# 内容\n已经更新的测试内容。"), encoding="utf-8")
            build_index(sources, index_path, embedder)
            updated = load_index_snapshot(index_path, embedder.model, embedder.dimensions)
            self.assertEqual(len(updated.chunks), 1)
            self.assertIn("已经更新", updated.chunks[0].chunk.text)

    def test_replace_failure_keeps_old_index_and_cleans_temp(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sources = root / "sources"
            sources.mkdir()
            source = sources / "guide.md"
            source.write_text(source_text("one", "第一份", "# 内容\n旧内容。"), encoding="utf-8")
            index_path = root / "knowledge.sqlite"
            embedder = FakeEmbeddingProvider()
            build_index(sources, index_path, embedder)
            old_hash = hashlib.sha256(index_path.read_bytes()).hexdigest()
            source.write_text(source_text("one", "第一份", "# 内容\n新内容。"), encoding="utf-8")
            with patch("app.knowledge.index.os.replace", side_effect=PermissionError("occupied")):
                with self.assertRaises(KnowledgeIndexReplaceError):
                    build_index(sources, index_path, embedder)
            self.assertEqual(hashlib.sha256(index_path.read_bytes()).hexdigest(), old_hash)
            self.assertEqual(list(root.glob(".knowledge.sqlite.*.tmp")), [])

    def test_corrupt_and_dimension_mismatch_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.sqlite"
            path.write_bytes(b"not sqlite")
            with self.assertRaises(KnowledgeIndexError):
                validate_index(path)

            sources = Path(directory) / "sources"
            sources.mkdir()
            (sources / "a.md").write_text(source_text("a", "A", "text"), encoding="utf-8")
            path = Path(directory) / "valid.sqlite"
            build_index(sources, path, FakeEmbeddingProvider(8))
            with self.assertRaises(KnowledgeConfigurationError):
                load_index_snapshot(path, "fake-embedding-v1", 1024)

    def test_retrieval_threshold_sort_and_context_limit(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sources = root / "sources"
            sources.mkdir()
            (sources / "a.md").write_text(source_text("a", "A", "# A\nalpha"), encoding="utf-8")
            (sources / "b.md").write_text(source_text("b", "B", "# B\nbeta"), encoding="utf-8")
            embedder = FakeEmbeddingProvider(32)
            path = root / "index.sqlite"
            build_index(sources, path, embedder)
            snapshot = load_index_snapshot(path, embedder.model, 32)
            result = retrieve_knowledge(snapshot, embedder.embed_query("alpha"), 1, -1.0, 100)
            self.assertEqual(len(result.matches), 1)
            self.assertLessEqual(result.context_chars, 100)
            empty = retrieve_knowledge(snapshot, embedder.embed_query("alpha"), 4, 1.0, 100)
            self.assertEqual(empty.matches, ())


class CitationSafetyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.risk = RiskAssessment(risk_level="中", urgency="尽快", warning="需要医生审核")

    def test_sources_are_deterministic_and_model_order_is_ignored(self) -> None:
        retrieval = retrieval_for()
        report = finalize_knowledge_report(
            valid_draft([retrieval.reference_ids[0]]), self.risk, retrieval, False
        )
        self.assertIn("标题：测试指南", report.full_report)
        self.assertIn("机构：测试医学机构", report.full_report)
        self.assertIn("章节：风险识别 > 处置", report.full_report)

    def test_unknown_reference_and_fabricated_sources_are_rejected(self) -> None:
        retrieval = retrieval_for()
        with self.assertRaises(KnowledgeCitationError):
            finalize_knowledge_report(valid_draft(["REF-NOT-RETRIEVED"]), self.risk, retrieval, False)
        for unsafe in (
            "正文。参考文献：某指南。仅供医生辅助参考，不能替代医生诊断。",
            "正文 https://made-up.invalid，仅供医生辅助参考，不能替代医生诊断。",
            "正文 [REF-FAKE]，仅供医生辅助参考，不能替代医生诊断。",
        ):
            with self.assertRaises(KnowledgeCitationError):
                finalize_knowledge_report(valid_draft(full_report=unsafe), self.risk, retrieval, False)

    def test_no_match_and_conflict_text_are_fixed(self) -> None:
        empty = KnowledgeRetrieval(matches=(), context_chars=0)
        report = finalize_knowledge_report(valid_draft(), self.risk, empty, False)
        self.assertTrue(report.full_report.endswith(NO_KNOWLEDGE_TEXT))
        conflict = finalize_knowledge_report(valid_draft(), self.risk, empty, True)
        self.assertIn(KNOWLEDGE_CONFLICT_TEXT, conflict.full_report)


class RagGraphTests(unittest.TestCase):
    def setUp(self) -> None:
        self.patient = PatientContext(patient_id=7, name="虚构患者", medical_history="虚构病史")
        self.consultation = ConsultationContext(
            consultation_id=9,
            patient_id=7,
            chief_complaint="虚构主诉",
            symptoms="虚构症状",
        )
        self.history = PatientHistoryContext(patient_id=7, consultations=[])
        self.baseline = RiskAssessment(risk_level="高", urgency="紧急", warning="患者资料提示高风险")
        self.lower = RiskAssessment(risk_level="低", urgency="常规", warning="知识评估较低")
        self.retrieval = retrieval_for()
        self.service = MagicMock(spec=KnowledgeService)
        self.service.retrieve.return_value = self.retrieval

    def test_rag_nodes_run_in_order_and_cannot_lower_risk(self) -> None:
        draft = valid_draft([self.retrieval.reference_ids[0]])
        with (
            patch("app.agent.graph.nodes.get_consultation_context", return_value=(self.patient, self.consultation)),
            patch("app.agent.graph.nodes.get_patient_history", return_value=self.history),
            patch("app.agent.graph.nodes.assess_medical_risk", return_value=self.baseline),
            patch("app.agent.graph.nodes.assess_medical_risk_with_knowledge", return_value=self.lower),
            patch("app.agent.graph.nodes.generate_medical_report_draft", return_value=draft),
        ):
            result = COMPILED_MEDICAL_AGENT_GRAPH.invoke(
                create_initial_graph_state(9, rag_enabled=True),
                context=MedicalAgentGraphContext(
                    db=MagicMock(), client=MagicMock(), knowledge_service=self.service
                ),
            )
        self.assertEqual(
            [item["node"] for item in result["execution_trace"]],
            [
                "load_context", "load_history", "retrieve_knowledge", "patient_only_risk",
                "knowledge_assisted_risk", "merge_risk", "generate_report_draft",
                "validate_citations", "finalize_report",
            ],
        )
        self.assertEqual(result["medical_report"].risk_level, "高")
        self.assertEqual(result["medical_report"].urgency_level, "紧急")
        self.assertIn(KNOWLEDGE_CONFLICT_TEXT, result["medical_report"].full_report)
        self.assertIsNone(result["knowledge_retrieval"])
        self.assertIsNone(result["report_draft"])

    def test_no_match_skips_second_risk_call_and_still_generates(self) -> None:
        self.service.retrieve.return_value = KnowledgeRetrieval(matches=(), context_chars=0)
        with (
            patch("app.agent.graph.nodes.get_consultation_context", return_value=(self.patient, self.consultation)),
            patch("app.agent.graph.nodes.get_patient_history", return_value=self.history),
            patch("app.agent.graph.nodes.assess_medical_risk", return_value=self.baseline),
            patch("app.agent.graph.nodes.assess_medical_risk_with_knowledge") as knowledge_risk,
            patch("app.agent.graph.nodes.generate_medical_report_draft", return_value=valid_draft()),
        ):
            result = COMPILED_MEDICAL_AGENT_GRAPH.invoke(
                create_initial_graph_state(9, rag_enabled=True),
                context=MedicalAgentGraphContext(
                    db=MagicMock(), client=MagicMock(), knowledge_service=self.service
                ),
            )
        knowledge_risk.assert_not_called()
        self.assertIn(NO_KNOWLEDGE_TEXT, result["medical_report"].full_report)


if __name__ == "__main__":
    unittest.main()
