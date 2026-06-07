"""User model and CRUD operations"""
from ..connection import get_db

class User:
    @staticmethod
    def create(name, email, password_hash):
        """Create a new user"""
        with get_db() as conn:
            cursor = conn.execute(
                'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
                (name, email, password_hash)
            )
            return cursor.lastrowid

    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        with get_db() as conn:
            cursor = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_by_email(email):
        """Get user by email"""
        with get_db() as conn:
            cursor = conn.execute('SELECT * FROM users WHERE email = ?', (email,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_all():
        """Get all users"""
        with get_db() as conn:
            cursor = conn.execute('SELECT * FROM users ORDER BY created_at DESC')
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def update(user_id, **kwargs):
        """Update user fields"""
        allowed_fields = ['name', 'email', 'password_hash']
        fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not fields:
            return False
        
        set_clause = ', '.join([f'{k} = ?' for k in fields.keys()])
        values = list(fields.values()) + [user_id]
        
        with get_db() as conn:
            cursor = conn.execute(
                f'UPDATE users SET {set_clause} WHERE id = ?',
                values
            )
            return cursor.rowcount > 0

    @staticmethod
    def delete(user_id):
        """Delete user by ID"""
        with get_db() as conn:
            cursor = conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
            return cursor.rowcount > 0
