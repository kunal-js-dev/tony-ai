"""Project model and CRUD operations"""
from ..connection import get_db

class Project:
    @staticmethod
    def create(user_id, title, description='', status='active'):
        """Create a new project"""
        with get_db() as conn:
            cursor = conn.execute(
                'INSERT INTO projects (user_id, title, description, status) VALUES (?, ?, ?, ?)',
                (user_id, title, description, status)
            )
            return cursor.lastrowid

    @staticmethod
    def get_by_id(project_id):
        """Get project by ID"""
        with get_db() as conn:
            cursor = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_by_user(user_id):
        """Get all projects for a user"""
        with get_db() as conn:
            cursor = conn.execute(
                'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
                (user_id,)
            )
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_all():
        """Get all projects"""
        with get_db() as conn:
            cursor = conn.execute('SELECT * FROM projects ORDER BY created_at DESC')
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def update(project_id, **kwargs):
        """Update project fields"""
        allowed_fields = ['title', 'description', 'status']
        fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not fields:
            return False
        
        set_clause = ', '.join([f'{k} = ?' for k in fields.keys()])
        values = list(fields.values()) + [project_id]
        
        with get_db() as conn:
            cursor = conn.execute(
                f'UPDATE projects SET {set_clause} WHERE id = ?',
                values
            )
            return cursor.rowcount > 0

    @staticmethod
    def delete(project_id):
        """Delete project by ID"""
        with get_db() as conn:
            cursor = conn.execute('DELETE FROM projects WHERE id = ?', (project_id,))
            return cursor.rowcount > 0

    @staticmethod
    def get_with_user(project_id):
        """Get project with user details"""
        with get_db() as conn:
            cursor = conn.execute('''
                SELECT p.*, u.name as user_name, u.email as user_email
                FROM projects p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            ''', (project_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
