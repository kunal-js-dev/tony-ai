"""OCR extraction using pytesseract + Pillow with graceful fallback."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path
from typing import Any

from PIL import Image

logger = logging.getLogger(__name__)

_tesseract_available: bool | None = None


def _check_tesseract() -> bool:
    global _tesseract_available
    if _tesseract_available is not None:
        return _tesseract_available

    try:
        import pytesseract

        if shutil.which("tesseract") or Path(
            r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        ).exists():
            _tesseract_available = True
        else:
            _tesseract_available = bool(pytesseract.get_tesseract_version())
    except Exception:
        _tesseract_available = False

    if not _tesseract_available:
        logger.warning(
            "Tesseract OCR not installed. Image text extraction will return metadata only."
        )

    return _tesseract_available


def extract_image(filepath: str | Path) -> dict[str, Any]:
    """Run OCR on an image file; gracefully degrade if Tesseract is missing."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")

    with Image.open(path) as img:
        img = img.convert("RGB")
        width, height = img.size
        format_name = img.format or path.suffix.lstrip(".").upper()
        text = ""
        ocr_used = False
        error: str | None = None

        if _check_tesseract():
            try:
                import pytesseract

                tesseract_cmd = shutil.which("tesseract")
                win_path = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
                if not tesseract_cmd and win_path.exists():
                    pytesseract.pytesseract.tesseract_cmd = str(win_path)

                text = (pytesseract.image_to_string(img) or "").strip()
                ocr_used = True
            except Exception as exc:
                error = str(exc)
                logger.warning("OCR failed: %s", exc)
        else:
            error = (
                "Tesseract not installed. Install from https://github.com/tesseract-ocr/tesseract "
                "or set PATH to tesseract.exe."
            )

    return {
        "type": "image",
        "title": path.stem,
        "text": text,
        "word_count": len(text.split()) if text else 0,
        "ocr_available": _check_tesseract(),
        "ocr_used": ocr_used,
        "error": error,
        "metadata": {
            "width": width,
            "height": height,
            "format": format_name,
            "filename": path.name,
        },
        "summary": {
            "ocr_used": ocr_used,
            "words": len(text.split()) if text else 0,
            "dimensions": f"{width}x{height}",
        },
    }
