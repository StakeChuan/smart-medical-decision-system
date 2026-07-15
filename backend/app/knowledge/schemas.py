from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class KnowledgeSourceMetadata:
    source_id: str
    title: str
    organization: str
    version: str
    published_at: str
    source_url: str
    scope: str


@dataclass(frozen=True)
class KnowledgeDocument:
    metadata: KnowledgeSourceMetadata
    body: str
    document_hash: str


@dataclass(frozen=True)
class KnowledgeChunk:
    chunk_id: str
    reference_id: str
    document_hash: str
    metadata: KnowledgeSourceMetadata
    section_path: str
    ordinal: int
    text: str


@dataclass(frozen=True)
class IndexedKnowledgeChunk:
    chunk: KnowledgeChunk
    vector_bytes: bytes
    vector_norm: float


@dataclass(frozen=True)
class KnowledgeIndexSnapshot:
    index_version: str
    embedding_model: str
    embedding_dimensions: int
    chunks: tuple[IndexedKnowledgeChunk, ...]


@dataclass(frozen=True)
class RetrievedKnowledgeChunk:
    chunk: KnowledgeChunk
    score: float


@dataclass(frozen=True)
class KnowledgeRetrieval:
    matches: tuple[RetrievedKnowledgeChunk, ...]
    context_chars: int

    @property
    def reference_ids(self) -> tuple[str, ...]:
        return tuple(item.chunk.reference_id for item in self.matches)

