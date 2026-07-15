from __future__ import annotations

import hashlib
import json
import math
import os
import sqlite3
import sys
import uuid
from array import array
from contextlib import closing
from pathlib import Path

from app.knowledge.chunker import chunk_documents
from app.knowledge.embeddings import EmbeddingProvider
from app.knowledge.errors import (
    KnowledgeConfigurationError,
    KnowledgeIndexError,
    KnowledgeIndexReplaceError,
)
from app.knowledge.loader import load_documents
from app.knowledge.schemas import (
    IndexedKnowledgeChunk,
    KnowledgeChunk,
    KnowledgeIndexSnapshot,
    KnowledgeSourceMetadata,
)


INDEX_SCHEMA_VERSION = "1"


def vector_to_bytes(values: tuple[float, ...]) -> bytes:
    packed = array("f", values)
    if sys.byteorder != "little":
        packed.byteswap()
    return packed.tobytes()


def vector_from_bytes(data: bytes, dimensions: int) -> tuple[float, ...]:
    values = array("f")
    values.frombytes(data)
    if sys.byteorder != "little":
        values.byteswap()
    if len(values) != dimensions:
        raise KnowledgeIndexError("Knowledge vector dimension does not match index metadata")
    return tuple(values)


def _vector_norm(data: bytes, dimensions: int) -> float:
    vector = vector_from_bytes(data, dimensions)
    norm = math.sqrt(sum(value * value for value in vector))
    if not math.isfinite(norm) or norm <= 0:
        raise KnowledgeIndexError("Knowledge vector norm is invalid")
    return norm


def _create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE index_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE chunks (
            chunk_id TEXT PRIMARY KEY,
            reference_id TEXT NOT NULL UNIQUE,
            document_hash TEXT NOT NULL,
            source_id TEXT NOT NULL,
            title TEXT NOT NULL,
            organization TEXT NOT NULL,
            version TEXT NOT NULL,
            published_at TEXT NOT NULL,
            source_url TEXT NOT NULL,
            scope TEXT NOT NULL,
            section_path TEXT NOT NULL,
            ordinal INTEGER NOT NULL,
            text TEXT NOT NULL,
            vector BLOB NOT NULL,
            vector_norm REAL NOT NULL
        );
        """
    )


def _read_metadata(connection: sqlite3.Connection) -> dict[str, str]:
    with closing(connection.cursor()) as cursor:
        cursor.execute("SELECT key, value FROM index_metadata")
        return {str(key): str(value) for key, value in cursor.fetchall()}


def _load_reusable_vectors(
    index_path: Path,
    model: str,
    dimensions: int,
) -> dict[str, bytes]:
    if not index_path.is_file():
        return {}
    try:
        with closing(sqlite3.connect(index_path)) as connection:
            metadata = _read_metadata(connection)
            if metadata.get("embedding_model") != model or int(metadata.get("dimensions", "0")) != dimensions:
                return {}
            with closing(connection.cursor()) as cursor:
                cursor.execute("SELECT chunk_id, vector FROM chunks")
                return {str(chunk_id): bytes(vector) for chunk_id, vector in cursor.fetchall()}
    except (sqlite3.Error, ValueError):
        return {}


def validate_index(
    index_path: Path,
    expected_model: str | None = None,
    expected_dimensions: int | None = None,
) -> dict[str, str | int]:
    try:
        with closing(sqlite3.connect(index_path)) as connection:
            with closing(connection.cursor()) as cursor:
                cursor.execute("PRAGMA integrity_check")
                integrity = cursor.fetchone()
                if not integrity or integrity[0] != "ok":
                    raise KnowledgeIndexError("Knowledge index integrity check failed")
                metadata = _read_metadata(connection)
                required = {"schema_version", "index_version", "embedding_model", "dimensions"}
                if not required.issubset(metadata):
                    raise KnowledgeIndexError("Knowledge index metadata is incomplete")
                dimensions = int(metadata["dimensions"])
                if expected_model is not None and metadata["embedding_model"] != expected_model:
                    raise KnowledgeConfigurationError("Knowledge index embedding model does not match configuration")
                if expected_dimensions is not None and dimensions != expected_dimensions:
                    raise KnowledgeConfigurationError("Knowledge index dimensions do not match configuration")
                cursor.execute("SELECT vector, vector_norm FROM chunks")
                count = 0
                for vector, norm in cursor.fetchall():
                    if len(bytes(vector)) != dimensions * 4 or float(norm) <= 0:
                        raise KnowledgeIndexError("Knowledge index contains an invalid vector")
                    count += 1
                return {
                    "index_version": metadata["index_version"],
                    "embedding_model": metadata["embedding_model"],
                    "dimensions": dimensions,
                    "chunk_count": count,
                }
    except KnowledgeIndexError:
        raise
    except (sqlite3.Error, OSError, ValueError) as exc:
        raise KnowledgeIndexError("Knowledge index could not be validated") from exc


def load_index_snapshot(
    index_path: Path,
    expected_model: str,
    expected_dimensions: int,
) -> KnowledgeIndexSnapshot:
    validate_index(index_path, expected_model, expected_dimensions)
    try:
        with closing(sqlite3.connect(index_path)) as connection:
            metadata = _read_metadata(connection)
            with closing(connection.cursor()) as cursor:
                cursor.execute(
                    """SELECT chunk_id, reference_id, document_hash, source_id, title,
                    organization, version, published_at, source_url, scope, section_path,
                    ordinal, text, vector, vector_norm FROM chunks ORDER BY chunk_id"""
                )
                rows = cursor.fetchall()
        chunks: list[IndexedKnowledgeChunk] = []
        for row in rows:
            source = KnowledgeSourceMetadata(
                source_id=row[3], title=row[4], organization=row[5], version=row[6],
                published_at=row[7], source_url=row[8], scope=row[9],
            )
            chunk = KnowledgeChunk(
                chunk_id=row[0], reference_id=row[1], document_hash=row[2], metadata=source,
                section_path=row[10], ordinal=int(row[11]), text=row[12],
            )
            chunks.append(
                IndexedKnowledgeChunk(
                    chunk=chunk,
                    vector_bytes=bytes(row[13]),
                    vector_norm=float(row[14]),
                )
            )
        return KnowledgeIndexSnapshot(
            index_version=metadata["index_version"],
            embedding_model=metadata["embedding_model"],
            embedding_dimensions=int(metadata["dimensions"]),
            chunks=tuple(chunks),
        )
    except (sqlite3.Error, OSError, ValueError) as exc:
        raise KnowledgeIndexError("Knowledge index could not be loaded") from exc


def build_index(
    source_dir: Path,
    index_path: Path,
    embedder: EmbeddingProvider,
    batch_size: int = 20,
) -> dict[str, str | int]:
    documents = load_documents(source_dir)
    chunks = chunk_documents(documents)
    reusable = _load_reusable_vectors(index_path, embedder.model, embedder.dimensions)
    vectors: dict[str, bytes] = {
        chunk.chunk_id: reusable[chunk.chunk_id]
        for chunk in chunks
        if chunk.chunk_id in reusable
    }
    missing = [chunk for chunk in chunks if chunk.chunk_id not in vectors]
    for start in range(0, len(missing), batch_size):
        batch = missing[start : start + batch_size]
        embedded = embedder.embed_texts([item.text for item in batch])
        for chunk, vector in zip(batch, embedded, strict=True):
            if len(vector) != embedder.dimensions:
                raise KnowledgeIndexError("Embedding dimension does not match configuration")
            vectors[chunk.chunk_id] = vector_to_bytes(vector)

    version_payload = "\n".join(
        [INDEX_SCHEMA_VERSION, embedder.model, str(embedder.dimensions)]
        + [chunk.chunk_id for chunk in chunks]
    ).encode("utf-8")
    index_version = hashlib.sha256(version_payload).hexdigest()
    index_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = index_path.with_name(f".{index_path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with closing(sqlite3.connect(temp_path)) as connection:
            _create_schema(connection)
            metadata = {
                "schema_version": INDEX_SCHEMA_VERSION,
                "index_version": index_version,
                "embedding_model": embedder.model,
                "dimensions": str(embedder.dimensions),
            }
            connection.executemany(
                "INSERT INTO index_metadata(key, value) VALUES (?, ?)", metadata.items()
            )
            rows = []
            for chunk in chunks:
                vector_bytes = vectors[chunk.chunk_id]
                rows.append(
                    (
                        chunk.chunk_id, chunk.reference_id, chunk.document_hash,
                        chunk.metadata.source_id, chunk.metadata.title,
                        chunk.metadata.organization, chunk.metadata.version,
                        chunk.metadata.published_at, chunk.metadata.source_url,
                        chunk.metadata.scope, chunk.section_path, chunk.ordinal, chunk.text,
                        vector_bytes, _vector_norm(vector_bytes, embedder.dimensions),
                    )
                )
            connection.executemany(
                """INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                rows,
            )
            connection.commit()
        result = validate_index(temp_path, embedder.model, embedder.dimensions)
        try:
            os.replace(temp_path, index_path)
        except (PermissionError, OSError) as exc:
            raise KnowledgeIndexReplaceError(
                "Knowledge index replacement failed; the existing index remains unchanged"
            ) from exc
        return result
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass

