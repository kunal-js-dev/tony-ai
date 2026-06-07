"""Document analysis endpoints by file type."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from backend.processors.doc import extract_doc
from backend.processors.excel import extract_excel
from backend.processors.ocr import extract_image
from backend.processors.pdf import extract_pdf
from backend.processors.ppt import extract_ppt
from backend.routers.upload import _save_upload

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])


async def _analyze_upload(processor_fn, upload: UploadFile) -> dict:
    dest, mime_type, filesize = await _save_upload(upload)
    try:
        result = processor_fn(dest)
        result["filepath"] = str(dest)
        result["mime_type"] = mime_type
        result["filesize"] = filesize
        result["original_name"] = upload.filename
        return result
    except Exception as exc:
        dest.unlink(missing_ok=True)
        logger.exception("Analysis failed for %s", upload.filename)
        raise HTTPException(status_code=422, detail=str(exc)) from exc


async def _analyze_by_file_id(file_id: int, processor_fn, expected_type: str) -> dict:
    from database.connection import get_db

    with get_db() as conn:
        row = conn.execute(
            "SELECT filepath, original_name, file_type FROM files WHERE id = ?",
            (file_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="File not found")
    if row["file_type"] != expected_type:
        raise HTTPException(
            status_code=400,
            detail=f"File type is '{row['file_type']}', expected '{expected_type}'",
        )

    path = Path(row["filepath"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing from disk")

    result = processor_fn(path)
    result["file_id"] = file_id
    result["original_name"] = row["original_name"]
    return result


@router.post("/pdf")
async def analyze_pdf(
    file: UploadFile | None = File(None),
    file_id: int | None = Query(None),
):
    """Analyze a PDF — upload new file or reference existing file_id."""
    if file:
        return await _analyze_upload(extract_pdf, file)
    if file_id is not None:
        return await _analyze_by_file_id(file_id, extract_pdf, "pdf")
    raise HTTPException(status_code=400, detail="Provide a file upload or file_id")


@router.post("/excel")
async def analyze_excel(
    file: UploadFile | None = File(None),
    file_id: int | None = Query(None),
):
    """Analyze a spreadsheet — xlsx, xls, or csv."""
    if file:
        return await _analyze_upload(extract_excel, file)
    if file_id is not None:
        return await _analyze_by_file_id(file_id, extract_excel, "excel")
    raise HTTPException(status_code=400, detail="Provide a file upload or file_id")


@router.post("/ppt")
async def analyze_ppt(
    file: UploadFile | None = File(None),
    file_id: int | None = Query(None),
):
    """Analyze a PowerPoint presentation."""
    if file:
        return await _analyze_upload(extract_ppt, file)
    if file_id is not None:
        return await _analyze_by_file_id(file_id, extract_ppt, "ppt")
    raise HTTPException(status_code=400, detail="Provide a file upload or file_id")


@router.post("/doc")
async def analyze_doc(
    file: UploadFile | None = File(None),
    file_id: int | None = Query(None),
):
    """Analyze a Word document."""
    if file:
        return await _analyze_upload(extract_doc, file)
    if file_id is not None:
        return await _analyze_by_file_id(file_id, extract_doc, "doc")
    raise HTTPException(status_code=400, detail="Provide a file upload or file_id")


@router.post("/image")
@router.post("/ocr")
async def analyze_image(
    file: UploadFile | None = File(None),
    file_id: int | None = Query(None),
):
    """Analyze an image with OCR (graceful fallback if Tesseract unavailable)."""
    if file:
        return await _analyze_upload(extract_image, file)
    if file_id is not None:
        return await _analyze_by_file_id(file_id, extract_image, "image")
    raise HTTPException(status_code=400, detail="Provide a file upload or file_id")
