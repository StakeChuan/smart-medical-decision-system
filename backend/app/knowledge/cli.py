import argparse
import json
from pathlib import Path

from app.knowledge.embeddings import DashScopeEmbeddingProvider
from app.knowledge.index import build_index, validate_index
from app.security.config import get_medical_rag_settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Build or validate the medical knowledge index")
    subparsers = parser.add_subparsers(dest="command", required=True)
    build_parser = subparsers.add_parser("build")
    build_parser.add_argument("--source", type=Path, required=True)
    build_parser.add_argument("--index", type=Path, required=True)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--index", type=Path, required=True)
    args = parser.parse_args()
    settings = get_medical_rag_settings()
    if args.command == "build":
        provider = DashScopeEmbeddingProvider(
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
        )
        result = build_index(args.source, args.index, provider)
    else:
        result = validate_index(
            args.index,
            settings.embedding_model,
            settings.embedding_dimensions,
        )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
