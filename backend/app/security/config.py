import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Literal


DEVELOPMENT_TOKEN_SECRET = "smart-medical-development-only-secret-change-before-production"
INSECURE_DEMO_SECRET = "smart-medical-demo-secret"
MedicalAgentEngine = Literal["langgraph", "legacy"]


@dataclass(frozen=True)
class MedicalRagSettings:
    enabled: bool
    top_k: int
    min_score: float
    max_context_chars: int
    index_path: Path | None
    embedding_model: str
    embedding_dimensions: int


def _environment(source: Mapping[str, str]) -> str:
    return source.get("ENVIRONMENT", "production").strip().lower() or "production"


def get_token_secret(environ: Mapping[str, str] | None = None) -> str:
    source = os.environ if environ is None else environ
    environment = _environment(source)
    secret = source.get("APP_TOKEN_SECRET", "").strip()

    if environment == "development":
        return secret or DEVELOPMENT_TOKEN_SECRET
    if not secret:
        raise RuntimeError("APP_TOKEN_SECRET is required in production")
    if secret == INSECURE_DEMO_SECRET:
        raise RuntimeError("APP_TOKEN_SECRET must not use the demo value in production")
    if len(secret) < 32:
        raise RuntimeError("APP_TOKEN_SECRET must contain at least 32 characters in production")
    return secret


def get_token_expire_seconds(environ: Mapping[str, str] | None = None) -> int:
    source = os.environ if environ is None else environ
    raw_value = source.get("TOKEN_EXPIRE_SECONDS") or source.get("APP_TOKEN_EXPIRE_SECONDS") or "43200"
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError("TOKEN_EXPIRE_SECONDS must be an integer") from exc
    if value <= 0:
        raise RuntimeError("TOKEN_EXPIRE_SECONDS must be greater than zero")
    return value


def get_medical_agent_engine(
    environ: Mapping[str, str] | None = None,
) -> MedicalAgentEngine:
    source = os.environ if environ is None else environ
    engine = source.get("MEDICAL_AGENT_ENGINE", "langgraph").strip().lower() or "langgraph"
    if engine not in {"langgraph", "legacy"}:
        raise RuntimeError("MEDICAL_AGENT_ENGINE must be 'langgraph' or 'legacy'")
    return engine


def _parse_bool(value: str, name: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off", ""}:
        return False
    raise RuntimeError(f"{name} must be true or false")


def get_medical_rag_settings(
    environ: Mapping[str, str] | None = None,
) -> MedicalRagSettings:
    source = os.environ if environ is None else environ
    enabled = _parse_bool(source.get("MEDICAL_RAG_ENABLED", "false"), "MEDICAL_RAG_ENABLED")
    try:
        top_k = int(source.get("MEDICAL_RAG_TOP_K", "4"))
        min_score = float(source.get("MEDICAL_RAG_MIN_SCORE", "0.72"))
        max_context_chars = int(source.get("MEDICAL_RAG_MAX_CONTEXT_CHARS", "6000"))
        dimensions = int(source.get("DASHSCOPE_EMBEDDING_DIMENSIONS", "1024"))
    except ValueError as exc:
        raise RuntimeError("Medical RAG numeric configuration is invalid") from exc
    if not 1 <= top_k <= 20:
        raise RuntimeError("MEDICAL_RAG_TOP_K must be between 1 and 20")
    if not 0 <= min_score <= 1:
        raise RuntimeError("MEDICAL_RAG_MIN_SCORE must be between 0 and 1")
    if max_context_chars <= 0:
        raise RuntimeError("MEDICAL_RAG_MAX_CONTEXT_CHARS must be greater than zero")
    if dimensions <= 0:
        raise RuntimeError("DASHSCOPE_EMBEDDING_DIMENSIONS must be greater than zero")

    raw_path = source.get("MEDICAL_KNOWLEDGE_INDEX_PATH", "").strip()
    model = source.get("DASHSCOPE_EMBEDDING_MODEL", "text-embedding-v4").strip()
    if enabled and not raw_path:
        raise RuntimeError("MEDICAL_KNOWLEDGE_INDEX_PATH is required when RAG is enabled")
    if enabled and not model:
        raise RuntimeError("DASHSCOPE_EMBEDDING_MODEL is required when RAG is enabled")
    return MedicalRagSettings(
        enabled=enabled,
        top_k=top_k,
        min_score=min_score,
        max_context_chars=max_context_chars,
        index_path=Path(raw_path).expanduser().resolve() if raw_path else None,
        embedding_model=model,
        embedding_dimensions=dimensions,
    )
