"""SQLite database package for the offline document analyzer."""

from .connection import get_db, get_connection, DB_PATH
from .schema import init_db

__all__ = ["get_db", "get_connection", "DB_PATH", "init_db"]
