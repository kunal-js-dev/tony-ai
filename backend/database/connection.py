"""Database connection — unified for Flask + FastAPI backends."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

# Resolve DB_PATH from this file's location
_HERE = Path(__file__).resolve().parent
_PROJECT_ROOT = _HERE.parent.parent
_DATABASE_DIR = _PROJECT_ROOT / "database"
_DATABASE_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = _DATABASE_DIR / "app.db"


def get_connection() -> sqlite3.Connection:
    """Create and return a tuned SQLite connection."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys      = ON")
    conn.execute("PRAGMA journal_mode      = WAL")
    conn.execute("PRAGMA synchronous       = NORMAL")
    conn.execute("PRAGMA busy_timeout      = 5000")
    conn.execute("PRAGMA cache_size        = -16000")
    conn.execute("PRAGMA mmap_size         = 268435456")
    conn.execute("PRAGMA temp_store        = MEMORY")
    return conn


@contextmanager
def get_db():
    """Context manager for database connections.

    Commits on clean exit, rolls back on any exception, always closes.
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
