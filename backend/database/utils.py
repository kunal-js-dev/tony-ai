"""Database utility functions"""
from .connection import get_db
from .models import User, Project, File

def get_user_stats(user_id):
    """Get statistics for a user"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT 
                COUNT(DISTINCT p.id) as project_count,
                COUNT(DISTINCT f.id) as file_count,
                SUM(f.filesize) as total_storage
            FROM users u
            LEFT JOIN projects p ON u.id = p.user_id
            LEFT JOIN files f ON p.id = f.project_id
            WHERE u.id = ?
        ''', (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_project_stats(project_id):
    """Get statistics for a project"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT 
                COUNT(f.id) as file_count,
                SUM(f.filesize) as total_size,
                MAX(f.created_at) as last_file_added
            FROM projects p
            LEFT JOIN files f ON p.id = f.project_id
            WHERE p.id = ?
        ''', (project_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def search_projects(query):
    """Search projects by title or description"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT p.*, u.name as user_name
            FROM projects p
            JOIN users u ON p.user_id = u.id
            WHERE p.title LIKE ? OR p.description LIKE ?
            ORDER BY p.created_at DESC
        ''', (f'%{query}%', f'%{query}%'))
        return [dict(row) for row in cursor.fetchall()]

def search_files(query):
    """Search files by filename"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT f.*, p.title as project_title
            FROM files f
            JOIN projects p ON f.project_id = p.id
            WHERE f.filename LIKE ?
            ORDER BY f.created_at DESC
        ''', (f'%{query}%',))
        return [dict(row) for row in cursor.fetchall()]

def get_recent_activity(limit=10):
    """Get recent activity across all tables"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT 'file' as type, f.filename as name, f.created_at, p.title as project_title
            FROM files f
            JOIN projects p ON f.project_id = p.id
            UNION ALL
            SELECT 'project' as type, p.title as name, p.created_at, u.name as project_title
            FROM projects p
            JOIN users u ON p.user_id = u.id
            ORDER BY created_at DESC
            LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]

def backup_database(backup_path):
    """Create a backup of the database"""
    import shutil
    from .connection import DB_PATH
    shutil.copy2(DB_PATH, backup_path)
    return True
