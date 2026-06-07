"""
TONY AI Document Analyzer — FastAPI Backend
100% Offline · No Cloud APIs · Ollama @ localhost:11434
"""

from __future__ import annotations

import logging
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

_START_TIME = time.time()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure project root is on sys.path for `database` package imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.schema import init_db  # noqa: E402

from backend.config import (  # noqa: E402
    CORS_ORIGINS,
    LOG_FILE,
    LOG_LEVEL,
)
from backend.routers import analyze, chat, files, settings, upload  # noqa: E402
from backend.services.ollama import ollama_service  # noqa: E402

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(str(LOG_FILE), encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB and verify Ollama. Shutdown: cleanup."""
    logger.info("Initializing database...")
    init_db()

    if await ollama_service.is_available():
        models = await ollama_service.list_models()
        logger.info("Ollama online — models: %s", models)
    else:
        logger.warning(
            "Ollama not reachable at startup. Start with: ollama serve"
        )

    yield
    logger.info("Shutting down FastAPI backend")


app = FastAPI(
    title="TONY AI Document Analyzer",
    description="Offline document analysis with RAG, ChromaDB, and Ollama",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id", "X-Total-Messages"],
)

# Routers — order matters for overlapping prefixes
app.include_router(upload.router)
app.include_router(files.router)
app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(settings.router)


# ─── System endpoints ─────────────────────────────────────────────────────────

@app.get("/api/health")
@app.get("/health")
async def health_check():
    """Health check — DB, Ollama, and ChromaDB status."""
    ollama_ok = await ollama_service.is_available()
    models = await ollama_service.list_models() if ollama_ok else []

    chroma_count = 0
    try:
        from backend.services.chroma_service import chroma_service
        chroma_count = chroma_service.count()
    except Exception:
        pass

    from database.connection import DB_PATH

    db_ok = DB_PATH.exists()
    status = "ok"
    if not db_ok:
        status = "degraded"
    elif not ollama_ok:
        status = "degraded"

    return {
        "status": status,
        "version": "1.0.0",
        "offline": True,
        "database": str(DB_PATH),
        "database_exists": db_ok,
        "database_ok": db_ok,
        "uptime_seconds": int(time.time() - _START_TIME),
        "ollama": {"online": ollama_ok, "models": models},
        "ollama_available": ollama_ok,
        "ollama_models": models,
        "chromadb": {"chunks": chroma_count},
        "chromadb_chunks": chroma_count,
    }


@app.get("/api/stats")
@app.get("/stats")
async def get_stats():
    """Aggregate counts for dashboard."""
    from database.connection import get_db

    with get_db() as conn:
        total_files = conn.execute("SELECT COUNT(*) AS c FROM files").fetchone()["c"]
        total_documents = conn.execute("SELECT COUNT(*) AS c FROM documents").fetchone()["c"]
        total_chunks = conn.execute("SELECT COUNT(*) AS c FROM chunks").fetchone()["c"]
        total_sessions = conn.execute("SELECT COUNT(*) AS c FROM chat_sessions").fetchone()["c"]
        total_messages = conn.execute("SELECT COUNT(*) AS c FROM chat_messages").fetchone()["c"]
        storage_bytes = conn.execute(
            "SELECT COALESCE(SUM(filesize), 0) AS s FROM files"
        ).fetchone()["s"]

    return {
        "total_files": total_files,
        "total_documents": total_documents,
        "total_chunks": total_chunks,
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "storage_bytes": storage_bytes,
    }


@app.get("/")
async def root():
    return {
        "name": "TONY AI Document Analyzer",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 54)
    print("  TONY AI — FastAPI Document Analyzer")
    print("  API:    http://127.0.0.1:8000")
    print("  Health: http://127.0.0.1:8000/health")
    print("  Docs:   http://127.0.0.1:8000/docs")
    print("=" * 54 + "\n")

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
