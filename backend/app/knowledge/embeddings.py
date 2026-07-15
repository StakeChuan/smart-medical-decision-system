import math
from collections.abc import Sequence
from typing import Protocol

from openai import APIConnectionError, APIError, APITimeoutError, OpenAI

from app.integrations.dashscope import DashScopeConfigurationError, get_dashscope_client
from app.knowledge.errors import (
    KnowledgeEmbeddingConnectionError,
    KnowledgeEmbeddingServiceError,
    KnowledgeEmbeddingTimeoutError,
    KnowledgeConfigurationError,
)


class EmbeddingProvider(Protocol):
    model: str
    dimensions: int

    def embed_texts(self, texts: Sequence[str]) -> list[tuple[float, ...]]: ...

    def embed_query(self, text: str) -> tuple[float, ...]: ...


class DashScopeEmbeddingProvider:
    def __init__(
        self,
        model: str,
        dimensions: int,
        client: OpenAI | None = None,
    ) -> None:
        self.model = model
        self.dimensions = dimensions
        try:
            self._client = client or get_dashscope_client()
        except DashScopeConfigurationError as exc:
            raise KnowledgeConfigurationError("DashScope Embedding 配置无效") from exc

    def _embed(self, texts: Sequence[str]) -> list[tuple[float, ...]]:
        try:
            response = self._client.embeddings.create(
                model=self.model,
                input=list(texts),
                dimensions=self.dimensions,
                encoding_format="float",
            )
        except APITimeoutError as exc:
            raise KnowledgeEmbeddingTimeoutError("知识 Embedding 调用超时") from exc
        except APIConnectionError as exc:
            raise KnowledgeEmbeddingConnectionError("无法连接知识 Embedding 服务") from exc
        except APIError as exc:
            raise KnowledgeEmbeddingServiceError("知识 Embedding 服务调用失败") from exc
        vectors = [tuple(float(value) for value in item.embedding) for item in response.data]
        if len(vectors) != len(texts):
            raise KnowledgeEmbeddingServiceError("知识 Embedding 返回数量不匹配")
        for vector in vectors:
            if len(vector) != self.dimensions or not all(math.isfinite(value) for value in vector):
                raise KnowledgeEmbeddingServiceError("知识 Embedding 维度或数值无效")
        return vectors

    def embed_texts(self, texts: Sequence[str]) -> list[tuple[float, ...]]:
        return self._embed(texts)

    def embed_query(self, text: str) -> tuple[float, ...]:
        return self._embed([text])[0]
