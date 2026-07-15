import os
from collections.abc import Mapping
from typing import Literal


DEVELOPMENT_TOKEN_SECRET = "smart-medical-development-only-secret-change-before-production"
INSECURE_DEMO_SECRET = "smart-medical-demo-secret"
MedicalAgentEngine = Literal["langgraph", "legacy"]


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
