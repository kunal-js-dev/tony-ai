"""Chat endpoint with RAG context, streaming, and SQLite session memory."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from database.connection import get_db
from backend.config import SYSTEM_PROMPT
from backend.services.ollama import OllamaError, ollama_service
from backend.services.rag import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    file_id: int | None = None
    file_ids: list[int] | None = None  # multi-document support
    stream: bool = False
    use_rag: bool = True
    top_k: int = Field(default=5, ge=1, le=20)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_session(conn, session_id: str, file_id: int | None, title: str) -> None:
    conn.execute(
        """
        INSERT INTO chat_sessions (id, title, file_id)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            updated_at = CURRENT_TIMESTAMP,
            file_id = COALESCE(excluded.file_id, chat_sessions.file_id)
        """,
        (session_id, title[:120], file_id),
    )


def _save_message(
    conn,
    session_id: str,
    role: str,
    content: str,
    source: str = "ollama",
    metadata: dict[str, Any] | None = None,
) -> int:
    cur = conn.execute(
        """
        INSERT INTO chat_messages (session_id, role, content, source, metadata_json)
        VALUES (?, ?, ?, ?, ?)
        """,
        (session_id, role, content, source, json.dumps(metadata or {})),
    )
    conn.execute(
        "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (session_id,),
    )
    return cur.lastrowid


def _load_history(conn, session_id: str, limit: int = 20) -> list[dict[str, str]]:
    rows = conn.execute(
        """
        SELECT role, content
        FROM chat_messages
        WHERE session_id = ? AND role IN ('user', 'assistant')
        ORDER BY created_at ASC
        LIMIT ?
        """,
        (session_id, limit),
    ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in rows]


def _get_setting(conn, key: str, default: str = "") -> str:
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def _resolve_file_id(request: ChatRequest) -> int | None:
    """Return first file_id — prefer single, fall back to first of multi-list."""
    if request.file_id is not None:
        return request.file_id
    if request.file_ids:
        return request.file_ids[0]
    return None


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat with RAG-augmented context. Supports streaming via SSE when stream=true.
    Persists session and messages to SQLite.
    """
    message = (request.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = request.session_id or str(uuid.uuid4())
    primary_file_id = _resolve_file_id(request)

    with get_db() as conn:
        _ensure_session(conn, session_id, primary_file_id, message[:60])
        _save_message(conn, session_id, "user", message, source="user")
        history = _load_history(conn, session_id)
        chat_model = _get_setting(conn, "chat_model") or None
        embed_model = _get_setting(conn, "embed_model") or None
        system_prompt = _get_setting(conn, "system_prompt") or SYSTEM_PROMPT
        top_k = int(_get_setting(conn, "rag_top_k", str(request.top_k)) or request.top_k)

    # RAG: collect context from all selected files
    contexts: list[dict[str, Any]] = []
    if request.use_rag:
        file_ids_to_query = request.file_ids if request.file_ids else (
            [primary_file_id] if primary_file_id else []
        )
        if file_ids_to_query:
            for fid in file_ids_to_query[:5]:  # limit to 5 docs
                partial = await rag_service.retrieve_context(
                    message,
                    file_id=fid,
                    top_k=max(2, (request.top_k or top_k) // max(len(file_ids_to_query), 1)),
                    embed_model=embed_model,
                )
                contexts.extend(partial)
        else:
            contexts = await rag_service.retrieve_context(
                message,
                top_k=request.top_k or top_k,
                embed_model=embed_model,
            )

    grounded = rag_service.build_prompt(message, contexts)
    messages = history[:-1] + [{"role": "user", "content": grounded}]

    if request.stream:
        return StreamingResponse(
            _stream_response(
                session_id=session_id,
                messages=messages,
                model=chat_model,
                system=system_prompt,
                contexts=contexts,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Session-Id": session_id,
                "Access-Control-Expose-Headers": "X-Session-Id",
            },
        )

    try:
        response = await ollama_service.chat(
            messages,
            model=chat_model,
            system=system_prompt,
            stream=False,
        )
        source = "ollama"
    except OllamaError as exc:
        response = (
            f"⚠ Ollama is unavailable: {exc}. "
            "Start it with 'ollama serve' and pull a model with 'ollama pull llama3.2'."
        )
        source = "fallback"

    with get_db() as conn:
        msg_id = _save_message(
            conn,
            session_id,
            "assistant",
            response,
            source=source,
            metadata={"contexts": len(contexts), "rag": request.use_rag},
        )

    return {
        "session_id": session_id,
        "message_id": msg_id,
        "response": response,
        "source": source,
        "contexts_used": len(contexts),
        "contexts": [
            {"content": c["content"][:300], "score": c.get("score", 0), "metadata": c.get("metadata", {})}
            for c in contexts[:5]
        ],
        "timestamp": _utc_now(),
    }


async def _stream_response(
    *,
    session_id: str,
    messages: list[dict[str, str]],
    model: str | None,
    system: str,
    contexts: list[dict[str, Any]],
):
    """SSE stream of assistant tokens."""
    full_response: list[str] = []
    source = "ollama"

    try:
        stream = await ollama_service.chat(
            messages,
            model=model,
            system=system,
            stream=True,
        )
        async for token in stream:
            full_response.append(token)
            payload = json.dumps({"type": "token", "content": token, "done": False})
            yield f"data: {payload}\n\n"
    except OllamaError as exc:
        source = "fallback"
        fallback = f"⚠ Ollama unavailable: {exc}"
        full_response.append(fallback)
        yield f"data: {json.dumps({'type': 'token', 'content': fallback, 'done': False})}\n\n"

    response_text = "".join(full_response)
    with get_db() as conn:
        msg_id = _save_message(
            conn,
            session_id,
            "assistant",
            response_text,
            source=source,
            metadata={"contexts": len(contexts), "streamed": True},
        )

    done_payload = json.dumps({
        "type": "done",
        "done": True,
        "session_id": session_id,
        "message_id": msg_id,
        "source": source,
        "contexts": [
            {"content": c["content"][:300], "score": c.get("score", 0)}
            for c in contexts[:3]
        ],
    })
    yield f"data: {done_payload}\n\n"


@router.get("/sessions")
async def list_sessions():
    """List all chat sessions."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.title, s.file_id, s.created_at, s.updated_at,
                   s.message_count,
                   s.preview,
                   (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS actual_count
            FROM chat_sessions s
            ORDER BY s.updated_at DESC
            """
        ).fetchall()
    return {"sessions": [dict(r) for r in rows]}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get all messages for a chat session."""
    with get_db() as conn:
        session = conn.execute(
            "SELECT * FROM chat_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        messages = conn.execute(
            """
            SELECT id, role, content, source, metadata_json, created_at
            FROM chat_messages WHERE session_id = ?
            ORDER BY created_at ASC
            """,
            (session_id,),
        ).fetchall()

    return {
        "session": dict(session),
        "messages": [dict(m) for m in messages],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session and all messages."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM chat_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    return {"success": True, "deleted": session_id}
