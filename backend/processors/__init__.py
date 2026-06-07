"""Document processors — route file types to the correct extractor."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from backend.processors.doc import extract_doc
from backend.processors.excel import extract_excel
from backend.processors.ocr import extract_image
from backend.processors.pdf import extract_pdf
from backend.processors.ppt import extract_ppt

ProcessorFn = Callable[[str | Path], dict[str, Any]]

_PROCESSORS: dict[str, ProcessorFn] = {
    "pdf": extract_pdf,
    "excel": extract_excel,
    "ppt": extract_ppt,
    "doc": extract_doc,
    "image": extract_image,
}

_EXTENSION_MAP: dict[str, str] = {
    ".pdf": "pdf",
    ".xlsx": "excel",
    ".xls": "excel",
    ".csv": "excel",
    ".pptx": "ppt",
    ".ppt": "ppt",
    ".docx": "doc",
    ".doc": "doc",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".tiff": "image",
    ".tif": "image",
    ".bmp": "image",
    ".webp": "image",
}


def detect_file_type(filename: str) -> str:
    """Return canonical file type from extension."""
    ext = Path(filename).suffix.lower()
    file_type = _EXTENSION_MAP.get(ext)
    if not file_type:
        raise ValueError(f"Unsupported file type: {ext}")
    return file_type


def get_processor(file_type: str) -> ProcessorFn:
    """Return the processor function for a canonical file type."""
    processor = _PROCESSORS.get(file_type)
    if not processor:
        raise ValueError(f"No processor registered for type: {file_type}")
    return processor


def process_file(filepath: str | Path, file_type: str | None = None) -> dict[str, Any]:
    """Detect type (if needed) and run the appropriate processor."""
    path = Path(filepath)
    resolved_type = file_type or detect_file_type(path.name)
    processor = get_processor(resolved_type)
    result = processor(path)
    result["file_type"] = resolved_type
    return result
