"""Unified database schema — supports both the legacy Flask app and FastAPI backend."""

from __future__ import annotations

import sqlite3
from pathlib import Path

# Fix relative import based on sys.path
try:
    from backend.database.connection import get_db
except ImportError:
    from database.connection import get_db

# ─── path resolution ────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
_PROJECT_ROOT = _HERE.parent.parent
_DATABASE_DIR = _PROJECT_ROOT / "database"
_DATABASE_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = _DATABASE_DIR / "app.db"

# ─── All CREATE TABLE statements ─────────────────────────────────────────────
SCHEMA_TABLES = """
-- Legacy Flask tables
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS operator_profile (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    profile_data TEXT,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FastAPI document-analyzer tables
CREATE TABLE IF NOT EXISTS files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id    INTEGER,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    filepath      TEXT NOT NULL,
    filesize      INTEGER DEFAULT 0,
    mime_type     TEXT,
    file_type     TEXT NOT NULL DEFAULT 'other',
    status        TEXT NOT NULL DEFAULT 'uploaded',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id       INTEGER NOT NULL,
    title         TEXT,
    content       TEXT,
    summary       TEXT,
    page_count    INTEGER DEFAULT 0,
    word_count    INTEGER DEFAULT 0,
    metadata_json TEXT DEFAULT '{}',
    processed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chunks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id   INTEGER,
    file_id       INTEGER NOT NULL,
    chunk_index   INTEGER NOT NULL DEFAULT 0,
    content       TEXT NOT NULL,
    token_count   INTEGER DEFAULT 0,
    page_number   INTEGER,
    metadata_json TEXT DEFAULT '{}',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id)     REFERENCES files(id)     ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS embeddings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_id    INTEGER NOT NULL,
    document_id INTEGER,
    file_id     INTEGER NOT NULL,
    chroma_id   TEXT NOT NULL UNIQUE,
    model       TEXT,
    dimensions  INTEGER,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chunk_id)    REFERENCES chunks(id)    ON DELETE CASCADE,
    FOREIGN KEY (file_id)     REFERENCES files(id)     ON DELETE CASCADE
);

-- Chat tables
CREATE TABLE IF NOT EXISTS chat_sessions (
    id            TEXT PRIMARY KEY,
    title         TEXT,
    preview       TEXT,
    file_id       INTEGER,
    message_count INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content       TEXT,
    text          TEXT,
    source        TEXT DEFAULT 'ollama',
    metadata_json TEXT DEFAULT '{}',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    saved_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Full-Text Search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS chat_messages_fts USING fts5(
    text,
    session_id UNINDEXED,
    role       UNINDEXED,
    tokenize   = 'unicode61 remove_diacritics 2'
);

-- Application settings
CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

SCHEMA_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user       ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project       ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_type          ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_status        ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_created       ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file      ON documents(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file         ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document     ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk    ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_file     ON embeddings(file_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created    ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_updated    ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session    ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_role       ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created    ON chat_messages(created_at);
"""

_TRIGGERS = [
    ("update_users_timestamp", """
        CREATE TRIGGER IF NOT EXISTS update_users_timestamp
        AFTER UPDATE ON users
        WHEN NEW.updated_at IS OLD.updated_at
        BEGIN
            UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    """),
    ("update_projects_timestamp", """
        CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
        AFTER UPDATE ON projects
        WHEN NEW.updated_at IS OLD.updated_at
        BEGIN
            UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    """),
    ("update_files_timestamp", """
        CREATE TRIGGER IF NOT EXISTS update_files_timestamp
        AFTER UPDATE ON files
        WHEN NEW.updated_at IS OLD.updated_at
        BEGIN
            UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    """),
    ("inc_session_message_count", """
        CREATE TRIGGER IF NOT EXISTS inc_session_message_count
        AFTER INSERT ON chat_messages
        BEGIN
            UPDATE chat_sessions
            SET message_count = message_count + 1,
                updated_at    = CURRENT_TIMESTAMP
            WHERE id = NEW.session_id;
        END
    """),
    ("update_session_timestamp", """
        CREATE TRIGGER IF NOT EXISTS update_session_timestamp
        AFTER UPDATE ON chat_sessions
        WHEN NEW.updated_at IS OLD.updated_at
        BEGIN
            UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
    """),
]

_MIGRATIONS = [
    ("chat_sessions", "title",         "TEXT"),
    ("chat_sessions", "preview",       "TEXT"),
    ("chat_sessions", "file_id",       "INTEGER"),
    ("chat_sessions", "message_count", "INTEGER DEFAULT 0"),
    ("chat_sessions", "updated_at",    "TIMESTAMP"),
    ("chat_messages", "content",       "TEXT"),
    ("chat_messages", "text",          "TEXT"),
    ("chat_messages", "metadata_json", "TEXT DEFAULT '{}'"),
    ("chat_messages", "saved_at",      "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
    ("files", "project_id",    "INTEGER"),
    ("files", "original_name", "TEXT DEFAULT 'unknown'"),
    ("files", "mime_type",     "TEXT"),
    ("files", "file_type",     "TEXT DEFAULT 'other'"),
    ("files", "status",        "TEXT DEFAULT 'uploaded'"),
    ("files", "updated_at",    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
]

_DEFAULT_SETTINGS = [
    ("chat_model",    "llama3.2"),
    ("embed_model",   "nomic-embed-text"),
    ("chunk_size",    "800"),
    ("chunk_overlap", "120"),
    ("rag_top_k",     "5"),
    ("system_prompt", "You are a helpful offline document assistant."),
]


def _run_migrations(conn: sqlite3.Connection):
    for table, column, coltype in _MIGRATIONS:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}")
        except Exception:
            pass
    try:
        conn.execute("UPDATE chat_sessions SET updated_at = created_at WHERE updated_at IS NULL")
    except Exception:
        pass


def _create_triggers(conn: sqlite3.Connection):
    for name, sql in _TRIGGERS:
        try:
            conn.execute(sql.strip())
        except Exception as e:
            print(f"[DB] Warning: trigger {name}: {e}")


def _seed_settings(conn: sqlite3.Connection):
    for key, value in _DEFAULT_SETTINGS:
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (key, value),
        )


def _backfill_fts(conn: sqlite3.Connection):
    try:
        count = conn.execute("SELECT COUNT(*) AS c FROM chat_messages_fts").fetchone()['c']
        msg_count = conn.execute("SELECT COUNT(*) AS c FROM chat_messages").fetchone()['c']
        if count < msg_count:
            conn.execute("""
                INSERT INTO chat_messages_fts(rowid, text, session_id, role)
                SELECT id, COALESCE(content, text, ''), session_id, role FROM chat_messages
                WHERE id NOT IN (SELECT rowid FROM chat_messages_fts)
            """)
    except Exception as e:
        print(f"[DB] Warning: FTS backfill failed: {e}")


def _backfill_message_counts(conn: sqlite3.Connection):
    try:
        conn.execute("""
            UPDATE chat_sessions
            SET message_count = (
                SELECT COUNT(*) FROM chat_messages
                WHERE session_id = chat_sessions.id
            )
            WHERE message_count = 0
              AND EXISTS (SELECT 1 FROM chat_messages WHERE session_id = chat_sessions.id)
        """)
    except Exception as e:
        print(f"[DB] Warning: message count backfill failed: {e}")


def init_db():
    """Create all tables, run migrations, seed defaults."""
    with get_db() as conn:
        conn.executescript(SCHEMA_TABLES)
        _run_migrations(conn)
        conn.executescript(SCHEMA_INDEXES)
        _create_triggers(conn)
        _seed_settings(conn)
        _backfill_fts(conn)
        _backfill_message_counts(conn)
    print("[DB] Database initialized successfully")


def init_database():
    """Alias for legacy code"""
    init_db()


def reset_database():
    """Drop all tables and recreate schema from scratch (DESTRUCTIVE)."""
    with get_db() as conn:
        conn.executescript("""
            DROP TABLE IF EXISTS settings;
            DROP TABLE IF EXISTS embeddings;
            DROP TABLE IF EXISTS chunks;
            DROP TABLE IF EXISTS documents;
            DROP TABLE IF EXISTS files;
            DROP TABLE IF EXISTS projects;
            DROP TABLE IF EXISTS users;
            DROP TABLE IF EXISTS chat_messages;
            DROP TABLE IF EXISTS chat_sessions;
            DROP TABLE IF EXISTS operator_profile;
            DROP TABLE IF EXISTS chat_messages_fts;
        """)
    init_db()
    print("[DB] Database reset successfully")
