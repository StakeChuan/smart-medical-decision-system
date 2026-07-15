class KnowledgeError(Exception):
    category = "knowledge_error"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class KnowledgeConfigurationError(KnowledgeError):
    category = "knowledge_configuration_error"


class KnowledgeIndexError(KnowledgeError):
    category = "knowledge_index_error"


class KnowledgeIndexReplaceError(KnowledgeIndexError):
    category = "knowledge_index_replace_error"


class KnowledgeEmbeddingTimeoutError(KnowledgeError):
    category = "knowledge_embedding_timeout"


class KnowledgeEmbeddingConnectionError(KnowledgeError):
    category = "knowledge_embedding_connection_error"


class KnowledgeEmbeddingServiceError(KnowledgeError):
    category = "knowledge_embedding_service_error"


class KnowledgeCitationError(KnowledgeError):
    category = "knowledge_citation_error"

