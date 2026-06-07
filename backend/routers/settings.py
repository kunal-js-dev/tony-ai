"""Application settings GET/POST endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["settings"])

ALLOWED_KEYS = {
    "chat_model",
    "embed_model",
    "chunk_size",
    "chunk_overlap",
    "rag_top_k",
    "system_prompt",
}


class SettingsUpdate(BaseModel):
    settings: dict[str, Any] = Field(default_factory=dict)

    model_config = {"extra": "allow"}


def _normalize_settings_payload(payload: SettingsUpdate | dict) -> dict[str, Any]:
    if isinstance(payload, SettingsUpdate):
        if payload.settings:
            return payload.settings
        extra = payload.model_dump(exclude={"settings"}, exclude_none=True)
        return extra
    return payload.get("settings") or {
        k: v for k, v in payload.items() if k in ALLOWED_KEYS
    }


@router.get("/settings")
async def get_settings():
    """Return all application settings."""
    defaults = {
        "chat_model": "llama3.2",
        "embed_model": "nomic-embed-text",
        "chunk_size": "800",
        "chunk_overlap": "120",
        "rag_top_k": "5",
        "system_prompt": "You are a helpful offline document assistant.",
    }
    with get_db() as conn:
        rows = conn.execute("SELECT key, value, updated_at FROM settings").fetchall()
    stored = {row["key"]: row["value"] for row in rows}
    merged = {**defaults, **stored}
    return merged


@router.put("/settings")
@router.post("/settings")
async def update_settings(payload: SettingsUpdate):
    """Update one or more settings (partial update supported)."""
    settings_map = _normalize_settings_payload(payload)
    if not settings_map:
        raise HTTPException(status_code=400, detail="No settings provided")

    invalid = set(settings_map.keys()) - ALLOWED_KEYS
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid setting keys: {sorted(invalid)}",
        )

    with get_db() as conn:
        for key, value in settings_map.items():
            conn.execute(
                """
                INSERT INTO settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (key, str(value)),
            )

    return await get_settings()
