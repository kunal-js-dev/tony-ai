"""File listing, retrieval, and delete endpoints."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from database.connection import get_db
from backend.services.rag import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["files"])


def _row_to_dict(row) -> dict:
    return dict(row) if row else {}


@router.get("/files")
async def list_files(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    file_type: str | None = Query(default=None),
):
    """List all uploaded files with document metadata."""
    with get_db() as conn:
        base_sql = """
            SELECT f.id, f.filename, f.original_name, f.filesize, f.mime_type,
                   f.file_type, f.status, f.created_at, f.updated_at,
                   d.id AS document_id, d.title, d.word_count, d.page_count,
                   (SELECT COUNT(*) FROM chunks c WHERE c.file_id = f.id) AS chunk_count
            FROM files f
            LEFT JOIN documents d ON d.file_id = f.id
        """
        params: list = []
        if file_type:
            base_sql += " WHERE f.file_type = ?"
            params.append(file_type)
        base_sql += " ORDER BY f.created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(base_sql, params).fetchall()
        count_sql = "SELECT COUNT(*) AS c FROM files" + (
            " WHERE file_type = ?" if file_type else ""
        )
        count_params = [file_type] if file_type else []
        total = conn.execute(count_sql, count_params).fetchone()["c"]

    return {
        "files": [_row_to_dict(r) for r in rows],
        "count": len(rows),
        "total": total,
    }


@router.get("/file/{file_id}")
async def get_file(file_id: int):
    """Get file metadata, document content summary, and chunk count."""
    with get_db() as conn:
        file_row = conn.execute(
            """
            SELECT f.*,
                   d.id AS document_id, d.title, d.summary,
                   d.content AS content,
                   d.word_count, d.page_count, d.metadata_json, d.processed_at
            FROM files f
            LEFT JOIN documents d ON d.file_id = f.id
            WHERE f.id = ?
            """,
            (file_id,),
        ).fetchone()

        if not file_row:
            raise HTTPException(status_code=404, detail="File not found")

        chunks = conn.execute(
            """
            SELECT id, chunk_index, token_count, page_number,
                   substr(content, 1, 200) AS preview
            FROM chunks WHERE file_id = ? ORDER BY chunk_index
            """,
            (file_id,),
        ).fetchall()

    result = _row_to_dict(file_row)
    if result.get("metadata_json"):
        try:
            result["metadata"] = json.loads(result.pop("metadata_json"))
        except json.JSONDecodeError:
            result["metadata"] = {}
    else:
        result.pop("metadata_json", None)
        result["metadata"] = {}

    content = result.pop("content", None)
    if content and len(content) > 2000:
        result["content_preview"] = content[:2000] + "..."
    else:
        result["content_preview"] = content

    result["chunks"] = [_row_to_dict(c) for c in chunks]
    return result


@router.get("/file/{file_id}/download")
async def download_file(file_id: int):
    """Download the original uploaded file."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT filepath, original_name, mime_type FROM files WHERE id = ?",
            (file_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="File not found")

    path = Path(row["filepath"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing from disk")

    return FileResponse(
        path=str(path),
        filename=row["original_name"],
        media_type=row["mime_type"] or "application/octet-stream",
    )


@router.delete("/file/{file_id}")
async def delete_file(file_id: int):
    """Delete file, document, chunks, embeddings, and Chroma vectors."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, filepath FROM files WHERE id = ?",
            (file_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="File not found")

    await rag_service.delete_file_vectors(file_id)

    with get_db() as conn:
        conn.execute("DELETE FROM documents WHERE file_id = ?", (file_id,))
        conn.execute("DELETE FROM files WHERE id = ?", (file_id,))

    filepath = Path(row["filepath"])
    if filepath.exists():
        try:
            filepath.unlink()
        except OSError as exc:
            logger.warning("Could not delete file from disk: %s", exc)

    return {"success": True, "deleted_id": file_id}
