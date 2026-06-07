"""File model and CRUD operations"""
from ..connection import get_db

class File:
    @staticmethod
    def create(project_id, filename, filepath, filesize=0, filetype=''):
        """Create a new file record"""
        with get_db() as conn:
            cursor = conn.execute(
                'INSERT INTO files (project_id, filename, filepath, filesize, filetype) VALUES (?, ?, ?, ?, ?)',
                (project_id, filename, filepath, filesize, filetype)
            )
            return cursor.lastrowid

    @staticmethod
    def get_by_id(file_id):
        """Get file by ID"""
        with get_db() as conn:
            cursor = conn.execute('SELECT * FROM files WHERE id = ?', (file_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_by_project(project_id):
        """Get all files for a project"""
        with get_db() as conn:
            cursor = conn.execute(
                'SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC',
                (project_id,)
            )
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_all():
        """Get all files"""
        with get_db() as conn:
            cursor = conn.execute('SELECT * FROM files ORDER BY created_at DESC')
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def update(file_id, **kwargs):
        """Update file fields"""
        allowed_fields = ['filename', 'filepath', 'filesize', 'filetype']
        fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not fields:
            return False
        
        set_clause = ', '.join([f'{k} = ?' for k in fields.keys()])
        values = list(fields.values()) + [file_id]
        
        with get_db() as conn:
            cursor = conn.execute(
                f'UPDATE files SET {set_clause} WHERE id = ?',
                values
            )
            return cursor.rowcount > 0

    @staticmethod
    def delete(file_id):
        """Delete file by ID"""
        with get_db() as conn:
            cursor = conn.execute('DELETE FROM files WHERE id = ?', (file_id,))
            return cursor.rowcount > 0

    @staticmethod
    def get_with_project(file_id):
        """Get file with project details"""
        with get_db() as conn:
            cursor = conn.execute('''
                SELECT f.*, p.title as project_title, p.user_id
                FROM files f
                JOIN projects p ON f.project_id = p.id
                WHERE f.id = ?
            ''', (file_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_by_type(filetype):
        """Get all files of a specific type"""
        with get_db() as conn:
            cursor = conn.execute(
                'SELECT * FROM files WHERE filetype = ? ORDER BY created_at DESC',
                (filetype,)
            )
            return [dict(row) for row in cursor.fetchall()]
