import hashlib
import re

from app.knowledge.schemas import KnowledgeChunk, KnowledgeDocument


HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


def _sections(document: KnowledgeDocument) -> list[tuple[str, str]]:
    headings: list[str] = []
    current: list[str] = []
    result: list[tuple[str, str]] = []

    def flush() -> None:
        text = "\n".join(current).strip()
        if text:
            result.append((" > ".join(headings) or document.metadata.title, text))
        current.clear()

    for line in document.body.splitlines():
        match = HEADING_RE.match(line)
        if match:
            flush()
            level = len(match.group(1))
            headings[:] = headings[: level - 1]
            headings.append(match.group(2).strip())
        else:
            current.append(line)
    flush()
    return result


def _window_text(text: str, max_chars: int, overlap: int) -> list[str]:
    compact = re.sub(r"[ \t]+", " ", text).strip()
    if not compact:
        return []
    windows: list[str] = []
    start = 0
    while start < len(compact):
        end = min(len(compact), start + max_chars)
        if end < len(compact):
            boundary = max(compact.rfind("\n", start, end), compact.rfind("。", start, end))
            if boundary > start + max_chars // 2:
                end = boundary + 1
        chunk = compact[start:end].strip()
        if chunk:
            windows.append(chunk)
        if end >= len(compact):
            break
        start = max(start + 1, end - overlap)
    return windows


def chunk_document(
    document: KnowledgeDocument,
    max_chars: int = 900,
    overlap: int = 120,
) -> list[KnowledgeChunk]:
    if max_chars <= 0 or overlap < 0 or overlap >= max_chars:
        raise ValueError("Invalid chunk size or overlap")
    chunks: list[KnowledgeChunk] = []
    ordinal = 0
    for section_path, section_text in _sections(document):
        for text in _window_text(section_text, max_chars, overlap):
            payload = "\n".join(
                (document.metadata.source_id, document.document_hash, section_path, str(ordinal), text)
            ).encode("utf-8")
            chunk_id = hashlib.sha256(payload).hexdigest()
            chunks.append(
                KnowledgeChunk(
                    chunk_id=chunk_id,
                    reference_id=f"REF-{chunk_id[:12].upper()}",
                    document_hash=document.document_hash,
                    metadata=document.metadata,
                    section_path=section_path,
                    ordinal=ordinal,
                    text=text,
                )
            )
            ordinal += 1
    return chunks


def chunk_documents(documents: list[KnowledgeDocument]) -> list[KnowledgeChunk]:
    chunks = [chunk for document in documents for chunk in chunk_document(document)]
    if len(chunks) > 10_000:
        raise ValueError("Knowledge index limit is 10,000 chunks")
    return chunks
