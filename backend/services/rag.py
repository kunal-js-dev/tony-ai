"""RAG pipeline — chunk, embed, store, and retrieve context."""

from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any

from database.connection import get_db

from backend.config import CHUNK_OVERLAP, CHUNK_SIZE, RAG_TOP_K
from backend.services.chroma_service import chroma_service
from backend.services.ollama import OllamaError, ollama_service

logger = logging.getLogger(__name__)


def chunk_text(
    text: str,
    *,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    """Split text into overlapping chunks."""
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return []

    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(0, end - overlap)

    return chunks


class RAGService:
    """End-to-end retrieval-augmented generation helpers."""

    async def ingest_document(
        self,
        *,
        file_id: int,
        document_id: int,
        text: str,
        embed_model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Chunk text, embed via Ollama, persist to SQLite + ChromaDB."""
        chunks = chunk_text(text)
        if not chunks:
            return {"chunks": 0, "embeddings": 0}

        chroma_ids: list[str] = []
        documents: list[str] = []
        embeddings: list[list[float]] = []
        metadatas: list[dict[str, Any]] = []

        with get_db() as conn:
            for idx, content in enumerate(chunks):
                cur = conn.execute(
                    """
                    INSERT INTO chunks (document_id, file_id, chunk_index, content, token_count, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        document_id,
                        file_id,
                        idx,
                        content,
                        len(content.split()),
                        json.dumps(metadata or {}),
                    ),
                )
                chunk_id = cur.lastrowid
                chroma_id = f"chunk_{file_id}_{chunk_id}_{uuid.uuid4().hex[:8]}"
                vector = await ollama_service.embeddings(content, model=embed_model)
                model_name = await ollama_service.resolve_embed_model(embed_model)

                conn.execute(
                    """
                    INSERT INTO embeddings (chunk_id, document_id, file_id, chroma_id, model, dimensions)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        chunk_id,
                        document_id,
                        file_id,
                        chroma_id,
                        model_name,
                        len(vector),
                    ),
                )

                chroma_ids.append(chroma_id)
                documents.append(content)
                embeddings.append(vector)
                metadatas.append(
                    {
                        "file_id": file_id,
                        "document_id": document_id,
                        "chunk_id": chunk_id,
                        "chunk_index": idx,
                    }
                )

        chroma_service.add_chunks(
            ids=chroma_ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return {"chunks": len(chunks), "embeddings": len(embeddings)}

    async def retrieve_context(
        self,
        query: str,
        *,
        file_id: int | None = None,
        document_id: int | None = None,
        top_k: int = RAG_TOP_K,
        embed_model: str | None = None,
    ) -> list[dict[str, Any]]:
        """Search ChromaDB and return ranked context chunks."""
        if not query.strip():
            return []

        try:
            query_vector = await ollama_service.embeddings(query, model=embed_model)
        except OllamaError as exc:
            logger.warning("Embedding failed, falling back to SQLite: %s", exc)
            return self._sqlite_fallback(query, file_id=file_id, top_k=top_k)

        results = chroma_service.search(
            query_vector,
            n_results=top_k,
            file_id=file_id,
            document_id=document_id,
        )

        contexts: list[dict[str, Any]] = []
        docs = (results.get("documents") or [[]])[0]
        metas = (results.get("metadatas") or [[]])[0]
        dists = (results.get("distances") or [[]])[0]

        for doc, meta, dist in zip(docs, metas, dists):
            contexts.append(
                {
                    "content": doc,
                    "metadata": meta or {},
                    "score": 1.0 - float(dist) if dist is not None else 0.0,
                }
            )

        return contexts

    def _sqlite_fallback(
        self,
        query: str,
        *,
        file_id: int | None,
        top_k: int,
    ) -> list[dict[str, Any]]:
        """Keyword fallback when embeddings are unavailable."""
        terms = [t for t in re.findall(r"\w+", query.lower()) if len(t) > 2]
        if not terms:
            return []

        like_clauses = " OR ".join(["content LIKE ?" for _ in terms])
        params: list[Any] = [f"%{t}%" for t in terms]

        sql = f"""
            SELECT content, chunk_index, file_id, document_id
            FROM chunks
            WHERE ({like_clauses})
        """
        if file_id is not None:
            sql += " AND file_id = ?"
            params.append(file_id)
        sql += " ORDER BY chunk_index ASC LIMIT ?"
        params.append(top_k)

        with get_db() as conn:
            rows = conn.execute(sql, params).fetchall()

        return [
            {
                "content": row["content"],
                "metadata": {
                    "chunk_index": row["chunk_index"],
                    "file_id": row["file_id"],
                    "document_id": row["document_id"],
                },
                "score": 0.5,
            }
            for row in rows
        ]

    def build_prompt(self, query: str, contexts: list[dict[str, Any]]) -> str:
        """Format retrieved chunks into a grounded prompt."""
        if not contexts:
            return query

        context_block = "\n\n".join(
            f"[Source {i + 1}]\n{c['content']}"
            for i, c in enumerate(contexts)
        )
        return (
            "Use the following document context to answer the question.\n"
            "If the answer is not in the context, say you cannot find it.\n\n"
            f"CONTEXT:\n{context_block}\n\n"
            f"QUESTION: {query}"
        )

    async def delete_file_vectors(self, file_id: int) -> None:
        """Remove all embeddings for a file from SQLite and ChromaDB."""
        chroma_ids: list[str] = []
        with get_db() as conn:
            rows = conn.execute(
                "SELECT chroma_id FROM embeddings WHERE file_id = ?",
                (file_id,),
            ).fetchall()
            chroma_ids = [r["chroma_id"] for r in rows]
            conn.execute("DELETE FROM embeddings WHERE file_id = ?", (file_id,))
            conn.execute("DELETE FROM chunks WHERE file_id = ?", (file_id,))

        if chroma_ids:
            chroma_service.delete_by_ids(chroma_ids)
        else:
            chroma_service.delete_by_file(file_id)


rag_service = RAGService()
