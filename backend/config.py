"""Application configuration — paths, Ollama settings, and directory bootstrap."""

from __future__ import annotations

import os
from pathlib import Path

# ── Project roots ─────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = Path(__file__).resolve().parent

# ── Data directories (created on import) ──────────────────────────────────────
UPLOADS_DIR = PROJECT_ROOT / "uploads"
CHROMADB_DIR = PROJECT_ROOT / "chromadb"
DATABASE_DIR = PROJECT_ROOT / "database"
LOGS_DIR = PROJECT_ROOT / "logs"
STORAGE_DIR = PROJECT_ROOT / "storage"

for _dir in (UPLOADS_DIR, CHROMADB_DIR, DATABASE_DIR, LOGS_DIR, STORAGE_DIR):
    _dir.mkdir(parents=True, exist_ok=True)

# ── Database ──────────────────────────────────────────────────────────────────
DB_PATH = DATABASE_DIR / "app.db"

# ── ChromaDB ──────────────────────────────────────────────────────────────────
CHROMA_COLLECTION_NAME = "document_chunks"
CHROMA_PERSIST_DIR = str(CHROMADB_DIR)

# ── Ollama (100% offline, local only) ─────────────────────────────────────────
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.2")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
OLLAMA_FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv(
        "OLLAMA_FALLBACK_MODELS",
        "llama3.2,mistral,phi3,gemma2:2b",
    ).split(",")
    if m.strip()
]
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
OLLAMA_EMBED_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_EMBED_TIMEOUT_SECONDS", "60"))

# ── RAG defaults ──────────────────────────────────────────────────────────────
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "120"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

# ── Upload limits ─────────────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".xlsx",
    ".xls",
    ".csv",
    ".pptx",
    ".ppt",
    ".docx",
    ".doc",
    ".png",
    ".jpg",
    ".jpeg",
    ".tiff",
    ".tif",
    ".bmp",
    ".webp",
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_FILE = LOGS_DIR / "app.log"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are TONY — Tactical Offline Neural-network Yielding Assistant.
You analyze documents and answer questions using only the provided context.
You run 100% OFFLINE on the user's local machine — no cloud, no internet.
Be concise, accurate, and cite relevant details from the context when available.
If the context does not contain enough information, say so clearly."""
