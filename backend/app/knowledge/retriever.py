import math
import operator
import sys
from array import array

from app.knowledge.errors import KnowledgeIndexError
from app.knowledge.schemas import (
    KnowledgeIndexSnapshot,
    KnowledgeRetrieval,
    RetrievedKnowledgeChunk,
)


def _view_vector(data: bytes) -> memoryview:
    if sys.byteorder != "little":
        values = array("f")
        values.frombytes(data)
        values.byteswap()
        return memoryview(values)
    return memoryview(data).cast("f")


def retrieve_knowledge(
    snapshot: KnowledgeIndexSnapshot,
    query_vector: tuple[float, ...],
    top_k: int,
    min_score: float,
    max_context_chars: int,
) -> KnowledgeRetrieval:
    if len(query_vector) != snapshot.embedding_dimensions:
        raise KnowledgeIndexError("Query embedding dimension does not match knowledge index")
    query_norm = math.sqrt(sum(value * value for value in query_vector))
    if not math.isfinite(query_norm) or query_norm <= 0:
        raise KnowledgeIndexError("Query embedding norm is invalid")
    scored: list[RetrievedKnowledgeChunk] = []
    for indexed in snapshot.chunks:
        dot = sum(map(operator.mul, query_vector, _view_vector(indexed.vector_bytes)))
        score = dot / (query_norm * indexed.vector_norm)
        if math.isfinite(score) and score >= min_score:
            scored.append(RetrievedKnowledgeChunk(chunk=indexed.chunk, score=score))
    scored.sort(key=lambda item: (-item.score, item.chunk.chunk_id))
    selected: list[RetrievedKnowledgeChunk] = []
    used_chars = 0
    for item in scored:
        if len(selected) >= top_k:
            break
        size = len(item.chunk.text)
        if selected and used_chars + size > max_context_chars:
            continue
        if not selected and size > max_context_chars:
            continue
        selected.append(item)
        used_chars += size
    return KnowledgeRetrieval(matches=tuple(selected), context_chars=used_chars)

