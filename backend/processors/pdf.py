"""PDF text and table extraction using PyMuPDF and pdfplumber."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
import pdfplumber

logger = logging.getLogger(__name__)


def extract_pdf(filepath: str | Path) -> dict[str, Any]:
    """Extract text, tables, and metadata from a PDF file."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    pages: list[dict[str, Any]] = []
    full_text_parts: list[str] = []
    all_tables: list[dict[str, Any]] = []

    # PyMuPDF — fast text extraction
    with fitz.open(path) as doc:
        page_count = doc.page_count
        metadata = dict(doc.metadata or {})

        for i, page in enumerate(doc):
            text = (page.get_text("text") or "").strip()
            pages.append({"page_number": i + 1, "text": text, "char_count": len(text)})
            if text:
                full_text_parts.append(f"--- Page {i + 1} ---\n{text}")

    # pdfplumber — table extraction
    try:
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages):
                tables = page.extract_tables() or []
                for t_idx, table in enumerate(tables):
                    if not table:
                        continue
                    rows = [[cell or "" for cell in row] for row in table]
                    all_tables.append(
                        {
                            "page_number": i + 1,
                            "table_index": t_idx,
                            "rows": rows,
                            "row_count": len(rows),
                            "col_count": len(rows[0]) if rows else 0,
                        }
                    )
                    table_text = _table_to_text(rows)
                    if table_text:
                        full_text_parts.append(
                            f"--- Page {i + 1} Table {t_idx + 1} ---\n{table_text}"
                        )
    except Exception as exc:
        logger.warning("pdfplumber table extraction failed: %s", exc)

    full_text = "\n\n".join(full_text_parts)
    word_count = len(full_text.split()) if full_text else 0

    return {
        "type": "pdf",
        "title": metadata.get("title") or path.stem,
        "page_count": page_count,
        "word_count": word_count,
        "text": full_text,
        "pages": pages,
        "tables": all_tables,
        "metadata": metadata,
        "summary": {
            "pages": page_count,
            "tables_found": len(all_tables),
            "words": word_count,
            "chars": len(full_text),
        },
    }


def _table_to_text(rows: list[list[str]]) -> str:
    lines = []
    for row in rows:
        lines.append(" | ".join(str(c).strip() for c in row))
    return "\n".join(lines)
