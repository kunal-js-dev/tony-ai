"""Local ChromaDB persistent client for document chunk vectors."""

from __future__ import annotations

import logging
from typing import Any

import chromadb
from chromadb.config import Settings

from backend.config import CHROMA_COLLECTION_NAME, CHROMA_PERSIST_DIR

logger = logging.getLogger(__name__)


class ChromaService:
    """Persistent ChromaDB wrapper for add/search/delete operations."""

    def __init__(self) -> None:
        self._client: chromadb.PersistentClient | None = None
        self._collection = None

    @property
    def client(self) -> chromadb.PersistentClient:
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=CHROMA_PERSIST_DIR,
                settings=Settings(anonymized_telemetry=False, allow_reset=True),
            )
        return self._client

    @property
    def collection(self):
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=CHROMA_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def add_chunks(
        self,
        *,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]] | None = None,
    ) -> None:
        if not ids:
            return
        self.collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas or [{} for _ in ids],
        )
        logger.info("Added %d chunks to ChromaDB", len(ids))

    def search(
        self,
        query_embedding: list[float],
        *,
        n_results: int = 5,
        file_id: int | None = None,
        document_id: int | None = None,
    ) -> dict[str, Any]:
        where: dict[str, Any] | None = None
        if file_id is not None:
            where = {"file_id": file_id}
        elif document_id is not None:
            where = {"document_id": document_id}

        kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        return self.collection.query(**kwargs)

    def delete_by_file(self, file_id: int) -> None:
        try:
            self.collection.delete(where={"file_id": file_id})
            logger.info("Deleted ChromaDB chunks for file_id=%s", file_id)
        except Exception as exc:
            logger.warning("Chroma delete_by_file failed: %s", exc)

    def delete_by_ids(self, ids: list[str]) -> None:
        if not ids:
            return
        self.collection.delete(ids=ids)

    def count(self) -> int:
        return self.collection.count()


chroma_service = ChromaService()
