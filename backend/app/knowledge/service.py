from __future__ import annotations

from dataclasses import dataclass

from app.knowledge.embeddings import DashScopeEmbeddingProvider, EmbeddingProvider
from app.knowledge.index import load_index_snapshot
from app.knowledge.retriever import retrieve_knowledge
from app.knowledge.schemas import KnowledgeIndexSnapshot, KnowledgeRetrieval
from app.security.config import MedicalRagSettings


@dataclass(frozen=True)
class KnowledgeService:
    snapshot: KnowledgeIndexSnapshot
    embedder: EmbeddingProvider
    top_k: int
    min_score: float
    max_context_chars: int

    def retrieve(self, query: str) -> KnowledgeRetrieval:
        if not query.strip():
            return KnowledgeRetrieval(matches=(), context_chars=0)
        vector = self.embedder.embed_query(query)
        return retrieve_knowledge(
            self.snapshot,
            vector,
            self.top_k,
            self.min_score,
            self.max_context_chars,
        )


def build_clinical_query(values: list[str | None]) -> str:
    return "\n".join(value.strip() for value in values if value and value.strip())


def load_knowledge_service(
    settings: MedicalRagSettings,
    embedder: EmbeddingProvider | None = None,
) -> KnowledgeService:
    if not settings.enabled or settings.index_path is None:
        raise RuntimeError("Knowledge service cannot load while RAG is disabled")
    snapshot = load_index_snapshot(
        settings.index_path,
        settings.embedding_model,
        settings.embedding_dimensions,
    )
    provider = embedder or DashScopeEmbeddingProvider(
        model=settings.embedding_model,
        dimensions=settings.embedding_dimensions,
    )
    return KnowledgeService(
        snapshot=snapshot,
        embedder=provider,
        top_k=settings.top_k,
        min_score=settings.min_score,
        max_context_chars=settings.max_context_chars,
    )
