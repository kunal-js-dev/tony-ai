"""File upload, processing, chunking, and embedding pipeline."""

from __future__ import annotations

import json
import logging
import mimetypes
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from database.connection import get_db
from backend.config import ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, UPLOADS_DIR
from backend.processors import detect_file_type, process_file
from backend.services.rag import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["upload"])


async def _save_upload(upload: UploadFile) -> tuple[Path, str, int]:
    """Validate and persist an uploaded file to disk."""
    if not upload.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(upload.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    content = await upload.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / safe_name
    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)

    mime_type = upload.content_type or mimetypes.guess_type(upload.filename)[0]
    return dest, mime_type or "application/octet-stream", len(content)


async def _background_process(
    file_id: int,
    document_id: int,
    dest: Path,
    original_name: str,
    file_type: str,
) -> None:
    """Run text extraction + RAG ingestion in the background (non-blocking)."""
    try:
        processed = process_file(dest, file_type)
    except Exception as exc:
        logger.exception("Background processing failed for file_id=%s", file_id)
        with get_db() as conn:
            conn.execute("UPDATE files SET status = ? WHERE id = ?", ("embedding_failed", file_id))
        return

    text = processed.get("text") or ""

    with get_db() as conn:
        conn.execute(
            """UPDATE documents
               SET content = ?, title = ?, summary = ?, page_count = ?, word_count = ?, metadata_json = ?
               WHERE id = ?""",
            (
                text,
                processed.get("title") or original_name,
                json.dumps(processed.get("summary", {})),
                processed.get("page_count") or processed.get("slide_count") or 0,
                processed.get("word_count") or len(text.split()),
                json.dumps({k: v for k, v in processed.items() if k != "text"}),
                document_id,
            ),
        )
        conn.execute(
            "UPDATE files SET status = ?, word_count = ? WHERE id = ?",
            ("processed" if text.strip() else "empty", len(text.split()), file_id),
        )

    if not text.strip():
        logger.warning("No text extracted from file_id=%s", file_id)
        return

    try:
        await rag_service.ingest_document(
            file_id=file_id,
            document_id=document_id,
            text=text,
            metadata={"filename": original_name, "file_type": file_type},
        )
    except Exception as exc:
        logger.exception("RAG ingestion failed for file_id=%s", file_id)
        with get_db() as conn:
            conn.execute("UPDATE files SET status = ? WHERE id = ?", ("embedding_failed", file_id))


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    """
    Upload a document. Returns INSTANTLY with file metadata.
    Text extraction and embedding run as a background task.
    Poll GET /file/{id} to track processing status.
    """
    dest, mime_type, filesize = await _save_upload(file)

    try:
        file_type = detect_file_type(file.filename)
    except ValueError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Insert DB records immediately so UI can reference file_id
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO files (filename, original_name, filepath, filesize, mime_type, file_type, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (dest.name, file.filename, str(dest), filesize, mime_type, file_type, "processing"),
        )
        file_id = cur.lastrowid

        doc_cur = conn.execute(
            """INSERT INTO documents (file_id, title, content, summary, page_count, word_count, metadata_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (file_id, file.filename, "", "{}", 0, 0, "{}"),
        )
        document_id = doc_cur.lastrowid

    # Kick off processing in background — upload returns immediately
    if background_tasks is not None:
        background_tasks.add_task(
            _background_process,
            file_id=file_id,
            document_id=document_id,
            dest=dest,
            original_name=file.filename,
            file_type=file_type,
        )

    return {
        "success": True,
        "file": {
            "id": file_id,
            "file_id": file_id,
            "document_id": document_id,
            "filename": file.filename,
            "original_name": file.filename,
            "file_type": file_type,
            "filesize": filesize,
            "status": "processing",
        },
        "message": f"File '{file.filename}' accepted. Processing in background.",
        "status": "processing",
    }
