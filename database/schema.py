"""SQLite schema for the offline AI Document Analyzer."""

from __future__ import annotations

import logging

from .connection import get_db

logger = logging.getLogger(__name__)

SCHEMA_SQL = """
-- Users
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE,
    display_name  TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded files metadata
CREATE TABLE IF NOT EXISTS files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    filesize      INTEGER DEFAULT 0,
    mime_type     TEXT,
    file_type     TEXT NOT NULL,
    status        TEXT DEFAULT 'uploaded',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Processed document content
CREATE TABLE IF NOT EXISTS documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id       INTEGER NOT NULL UNIQUE,
    title         TEXT,
    content       TEXT,
    summary       TEXT,
    page_count    INTEGER DEFAULT 0,
    word_count    INTEGER DEFAULT 0,
    metadata_json TEXT,
    processed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Text chunks for RAG
CREATE TABLE IF NOT EXISTS chunks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id   INTEGER NOT NULL,
    file_id       INTEGER NOT NULL,
    chunk_index   INTEGER NOT NULL,
    content       TEXT NOT NULL,
    token_count   INTEGER DEFAULT 0,
    page_number   INTEGER,
    metadata_json TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Embedding references (vectors stored in ChromaDB)
CREATE TABLE IF NOT EXISTS embeddings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_id      INTEGER NOT NULL UNIQUE,
    document_id   INTEGER NOT NULL,
    file_id       INTEGER NOT NULL,
    chroma_id     TEXT NOT NULL UNIQUE,
    model         TEXT NOT NULL,
    dimensions    INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id            TEXT PRIMARY KEY,
    user_id       INTEGER,
    title         TEXT,
    file_id       INTEGER,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content       TEXT NOT NULL,
    source        TEXT DEFAULT 'ollama',
    metadata_json TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Application settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key           TEXT PRIMARY KEY,
    value         TEXT NOT NULL,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_user        ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_type        ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_file    ON documents(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document   ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file       ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_file   ON embeddings(file_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chroma ON embeddings(chroma_id);
CREATE INDEX IF NOT EXISTS idx_messages_session  ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_updated  ON chat_sessions(updated_at DESC);
"""

DEFAULT_SETTINGS = {
    "chat_model": "llama3.2",
    "embed_model": "nomic-embed-text",
    "chunk_size": "800",
    "chunk_overlap": "120",
    "rag_top_k": "5",
    "system_prompt": "",
}


def _seed_default_settings(conn) -> None:
    for key, value in DEFAULT_SETTINGS.items():
        conn.execute(
            """
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO NOTHING
            """,
            (key, value),
        )


def init_db() -> None:
    """Create all tables, indexes, and default settings."""
    with get_db() as conn:
        conn.executescript(SCHEMA_SQL)
        _seed_default_settings(conn)
    logger.info("Database initialized at %s", __import__("database.connection", fromlist=["DB_PATH"]).DB_PATH)
