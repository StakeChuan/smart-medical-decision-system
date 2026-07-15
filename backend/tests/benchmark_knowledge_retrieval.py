"""Offline 10,000 x 1024 knowledge retrieval benchmark; no network or patient data."""

import hashlib
import math
import random
import sqlite3
import statistics
import tempfile
import time
from contextlib import closing
from pathlib import Path

from app.knowledge.index import _create_schema, load_index_snapshot, vector_to_bytes
from app.knowledge.retriever import retrieve_knowledge
from app.knowledge.schemas import (
    IndexedKnowledgeChunk,
    KnowledgeChunk,
    KnowledgeIndexSnapshot,
    KnowledgeSourceMetadata,
)


CHUNK_COUNT = 10_000
DIMENSIONS = 1024


def percentile(values: list[float], percentile_value: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, math.ceil(percentile_value * len(ordered)) - 1)
    return ordered[index]


def build_snapshot() -> KnowledgeIndexSnapshot:
    random_source = random.Random(20260715)
    metadata = KnowledgeSourceMetadata(
        source_id="benchmark", title="离线基准", organization="测试机构",
        version="1", published_at="2026-01-01", source_url="", scope="性能测试",
    )
    chunks = []
    for index in range(CHUNK_COUNT):
        values = tuple(random_source.uniform(-1.0, 1.0) for _ in range(DIMENSIONS))
        norm = math.sqrt(sum(value * value for value in values))
        chunk_id = hashlib.sha256(f"benchmark-{index}".encode("ascii")).hexdigest()
        chunk = KnowledgeChunk(
            chunk_id=chunk_id, reference_id=f"REF-{chunk_id[:12].upper()}",
            document_hash="d" * 64, metadata=metadata, section_path="基准",
            ordinal=index, text=f"固定虚构知识块 {index}",
        )
        chunks.append(
            IndexedKnowledgeChunk(chunk=chunk, vector_bytes=vector_to_bytes(values), vector_norm=norm)
        )
    return KnowledgeIndexSnapshot(
        index_version="benchmark", embedding_model="fake", embedding_dimensions=DIMENSIONS,
        chunks=tuple(chunks),
    )


def main() -> None:
    build_started = time.perf_counter()
    snapshot = build_snapshot()
    build_ms = (time.perf_counter() - build_started) * 1000
    query_started = time.perf_counter()
    query = tuple(1.0 if index == 0 else 0.01 for index in range(DIMENSIONS))
    fake_query_embedding_ms = (time.perf_counter() - query_started) * 1000
    with tempfile.TemporaryDirectory() as directory:
        index_path = Path(directory) / "benchmark.sqlite"
        with closing(sqlite3.connect(index_path)) as connection:
            _create_schema(connection)
            connection.executemany(
                "INSERT INTO index_metadata(key, value) VALUES (?, ?)",
                (
                    ("schema_version", "1"),
                    ("index_version", "benchmark"),
                    ("embedding_model", "fake"),
                    ("dimensions", str(DIMENSIONS)),
                ),
            )
            connection.executemany(
                "INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    (
                        item.chunk.chunk_id,
                        item.chunk.reference_id,
                        item.chunk.document_hash,
                        item.chunk.metadata.source_id,
                        item.chunk.metadata.title,
                        item.chunk.metadata.organization,
                        item.chunk.metadata.version,
                        item.chunk.metadata.published_at,
                        item.chunk.metadata.source_url,
                        item.chunk.metadata.scope,
                        item.chunk.section_path,
                        item.chunk.ordinal,
                        item.chunk.text,
                        item.vector_bytes,
                        item.vector_norm,
                    )
                    for item in snapshot.chunks
                ),
            )
            connection.commit()
        load_started = time.perf_counter()
        loaded_snapshot = load_index_snapshot(index_path, "fake", DIMENSIONS)
        index_load_ms = (time.perf_counter() - load_started) * 1000
        assert len(loaded_snapshot.chunks) == CHUNK_COUNT
    snapshot = loaded_snapshot
    timings = []
    for _ in range(7):
        started = time.perf_counter()
        result = retrieve_knowledge(snapshot, query, 4, 0.0, 6000)
        timings.append((time.perf_counter() - started) * 1000)
        assert len(result.matches) <= 4

    # Measure orchestration overhead without model/network work.
    from langgraph.graph import END, START, StateGraph
    graph = StateGraph(dict)
    for name in ("a", "b", "c", "d", "e", "f", "g"):
        graph.add_node(name, lambda state: state)
    graph.add_edge(START, "a")
    for left, right in zip(("a", "b", "c", "d", "e", "f"), ("b", "c", "d", "e", "f", "g")):
        graph.add_edge(left, right)
    graph.add_edge("g", END)
    compiled = graph.compile()
    graph_times = []
    legacy_times = []
    for _ in range(100):
        started = time.perf_counter()
        value = {}
        for _step in range(7):
            value = value
        legacy_times.append((time.perf_counter() - started) * 1000)
        started = time.perf_counter()
        compiled.invoke({})
        graph_times.append((time.perf_counter() - started) * 1000)

    print(f"dataset_chunks={CHUNK_COUNT} dimensions={DIMENSIONS}")
    print(f"snapshot_build_ms={build_ms:.3f}")
    print(f"sqlite_index_load_ms={index_load_ms:.3f}")
    print(f"fake_query_embedding_ms={fake_query_embedding_ms:.6f}")
    print(f"retrieval_p50_ms={statistics.median(timings):.3f}")
    print(f"retrieval_p95_ms={percentile(timings, 0.95):.3f}")
    print(f"legacy_business_orchestration_p50_ms={statistics.median(legacy_times):.6f}")
    print(f"langgraph_orchestration_p50_ms={statistics.median(graph_times):.6f}")
    print(
        "langgraph_additional_orchestration_p50_ms="
        f"{statistics.median(graph_times) - statistics.median(legacy_times):.6f}"
    )


if __name__ == "__main__":
    main()
