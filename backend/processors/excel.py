"""Excel/CSV extraction and statistical summary using pandas."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def extract_excel(filepath: str | Path) -> dict[str, Any]:
    """Read xlsx/xls/csv and produce text + stats summary."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Spreadsheet not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".csv":
        sheets = {"Sheet1": pd.read_csv(path)}
    else:
        sheets = pd.read_excel(path, sheet_name=None, engine="openpyxl")

    sheet_summaries: list[dict[str, Any]] = []
    text_parts: list[str] = []

    for sheet_name, df in sheets.items():
        df = df.fillna("")
        rows, cols = df.shape
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        stats: dict[str, Any] = {}

        if numeric_cols:
            desc = df[numeric_cols].describe().round(4)
            stats = desc.to_dict()

        preview = df.head(20).to_string(index=False)
        sheet_text = (
            f"Sheet: {sheet_name}\n"
            f"Dimensions: {rows} rows x {cols} columns\n"
            f"Columns: {', '.join(str(c) for c in df.columns)}\n\n"
            f"Preview (first 20 rows):\n{preview}"
        )
        if stats:
            sheet_text += f"\n\nNumeric statistics:\n{pd.DataFrame(stats).round(4).to_string()}"

        text_parts.append(sheet_text)
        sheet_summaries.append(
            {
                "sheet_name": sheet_name,
                "rows": int(rows),
                "columns": int(cols),
                "column_names": [str(c) for c in df.columns],
                "numeric_columns": [str(c) for c in numeric_cols],
                "stats": stats,
            }
        )

    full_text = "\n\n".join(text_parts)
    total_rows = sum(s["rows"] for s in sheet_summaries)

    return {
        "type": "excel",
        "title": path.stem,
        "sheet_count": len(sheet_summaries),
        "row_count": total_rows,
        "word_count": len(full_text.split()),
        "text": full_text,
        "sheets": sheet_summaries,
        "summary": {
            "sheets": len(sheet_summaries),
            "total_rows": total_rows,
            "words": len(full_text.split()),
        },
    }
