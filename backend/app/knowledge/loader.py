import hashlib
import json
import tomllib
from pathlib import Path

from app.knowledge.errors import KnowledgeConfigurationError
from app.knowledge.schemas import KnowledgeDocument, KnowledgeSourceMetadata


REQUIRED_METADATA_KEYS = (
    "source_id",
    "title",
    "organization",
    "version",
    "published_at",
    "source_url",
    "scope",
)


def _split_front_matter(content: str, path: Path) -> tuple[dict[str, object], str]:
    normalized = content.replace("\r\n", "\n")
    if not normalized.startswith("+++\n"):
        raise KnowledgeConfigurationError(f"Knowledge source lacks TOML front matter: {path.name}")
    end = normalized.find("\n+++\n", 4)
    if end < 0:
        raise KnowledgeConfigurationError(f"Knowledge source front matter is not closed: {path.name}")
    try:
        metadata = tomllib.loads(normalized[4:end])
    except tomllib.TOMLDecodeError as exc:
        raise KnowledgeConfigurationError(f"Knowledge source metadata is invalid: {path.name}") from exc
    return metadata, normalized[end + 5 :].strip()


def load_document(path: Path) -> KnowledgeDocument:
    if path.suffix.lower() not in {".md", ".txt"}:
        raise KnowledgeConfigurationError(f"Unsupported knowledge source: {path.name}")
    metadata_values, body = _split_front_matter(path.read_text(encoding="utf-8"), path)
    missing = [key for key in REQUIRED_METADATA_KEYS if key not in metadata_values]
    if missing:
        raise KnowledgeConfigurationError(
            f"Knowledge source metadata is incomplete ({', '.join(missing)}): {path.name}"
        )
    clean = {key: str(metadata_values[key]).strip() for key in REQUIRED_METADATA_KEYS}
    if any(not clean[key] for key in ("source_id", "title", "organization", "scope")):
        raise KnowledgeConfigurationError(f"Knowledge source contains empty required metadata: {path.name}")
    if not clean["version"] and not clean["published_at"]:
        raise KnowledgeConfigurationError(f"Knowledge source requires version or published_at: {path.name}")
    if not body:
        raise KnowledgeConfigurationError(f"Knowledge source has no body: {path.name}")
    metadata = KnowledgeSourceMetadata(**clean)
    hash_payload = json.dumps(
        {"metadata": clean, "body": body}, ensure_ascii=False, sort_keys=True
    ).encode("utf-8")
    return KnowledgeDocument(
        metadata=metadata,
        body=body,
        document_hash=hashlib.sha256(hash_payload).hexdigest(),
    )


def load_documents(source_dir: Path) -> list[KnowledgeDocument]:
    if not source_dir.is_dir():
        raise KnowledgeConfigurationError("Knowledge source directory does not exist")
    paths = sorted(
        path for path in source_dir.rglob("*") if path.is_file() and path.suffix.lower() in {".md", ".txt"}
    )
    if len(paths) > 100:
        raise KnowledgeConfigurationError("Knowledge source limit is 100 documents")
    documents = [load_document(path) for path in paths]
    source_ids = [item.metadata.source_id for item in documents]
    if len(source_ids) != len(set(source_ids)):
        raise KnowledgeConfigurationError("Knowledge source_id values must be unique")
    return documents

