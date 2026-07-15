import os

from openai import OpenAI

DEFAULT_DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DEFAULT_DASHSCOPE_TIMEOUT = 60.0


class DashScopeConfigurationError(RuntimeError):
    pass


def get_dashscope_model() -> str:
    model = os.getenv("DASHSCOPE_MODEL", "").strip()
    if not model:
        raise DashScopeConfigurationError("未配置 DASHSCOPE_MODEL")
    return model


def get_dashscope_embedding_model() -> str:
    model = os.getenv("DASHSCOPE_EMBEDDING_MODEL", "").strip()
    if not model:
        raise DashScopeConfigurationError("未配置 DASHSCOPE_EMBEDDING_MODEL")
    return model


def get_dashscope_client() -> OpenAI:
    api_key = os.getenv("DASHSCOPE_API_KEY", "").strip()
    if not api_key:
        raise DashScopeConfigurationError("未配置阿里云大模型 API")
    base_url = os.getenv("DASHSCOPE_BASE_URL", DEFAULT_DASHSCOPE_BASE_URL).strip()
    try:
        timeout = float(os.getenv("DASHSCOPE_TIMEOUT", str(DEFAULT_DASHSCOPE_TIMEOUT)))
    except ValueError as exc:
        raise DashScopeConfigurationError("DASHSCOPE_TIMEOUT 配置无效") from exc
    return OpenAI(api_key=api_key, base_url=base_url, timeout=timeout)
