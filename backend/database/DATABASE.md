# 🗄️ SQLite Database Documentation

## Overview
Complete offline SQLite database system with Users, Projects, and Files tables. Fully integrated with TONY AI's Flask backend.

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Projects Table
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Files Table
```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    filesize INTEGER,
    filetype TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## 🚀 Quick Start

### 1. Initialize Database
```bash
cd backend
python init_db.py init
```

### 2. Seed Sample Data
```bash
python init_db.py seed
```

### 3. Full Reset (Drop + Recreate + Seed)
```bash
python init_db.py full
```

---

## 📡 API Endpoints

### Users

**Get All Users**
```http
GET /api/users
```

**Create User**
```http
POST /api/users
Content-Type: application/json

{
  "name": "Tony Stark",
  "email": "tony@stark.com",
  "password": "ironman123"
}
```

**Get User by ID**
```http
GET /api/users/1
```

**Update User**
```http
PUT /api/users/1
Content-Type: application/json

{
  "name": "Anthony Stark",
  "email": "anthony@stark.com"
}
```

**Delete User**
```http
DELETE /api/users/1
```

**Get User Stats**
```http
GET /api/users/1/stats
```

### Projects

**Get All Projects**
```http
GET /api/projects
```

**Get Projects by User**
```http
GET /api/projects?user_id=1
```

**Create Project**
```http
POST /api/projects
Content-Type: application/json

{
  "user_id": 1,
  "title": "Arc Reactor",
  "description": "Clean energy project",
  "status": "active"
}
```

**Update Project**
```http
PUT /api/projects/1
Content-Type: application/json

{
  "status": "completed"
}
```

**Delete Project**
```http
DELETE /api/projects/1
```

**Get Project Stats**
```http
GET /api/projects/1/stats
```

### Files

**Get All Files**
```http
GET /api/files
```

**Get Files by Project**
```http
GET /api/files?project_id=1
```

**Create File**
```http
POST /api/files
Content-Type: application/json

{
  "project_id": 1,
  "filename": "design.pdf",
  "filepath": "/projects/arc/design.pdf",
  "filesize": 2048000,
  "filetype": "pdf"
}
```

**Update File**
```http
PUT /api/files/1
Content-Type: application/json

{
  "filename": "design_v2.pdf"
}
```

**Delete File**
```http
DELETE /api/files/1
```

### Search

**Search Projects**
```http
GET /api/search/projects?q=reactor
```

**Search Files**
```http
GET /api/search/files?q=design
```

---

## 💻 Python Code Examples

### Creating a User
```python
from database.models import User

user_id = User.create(
    name="Tony Stark",
    email="tony@stark.com",
    password_hash="hashed_password_here"
)
```

### Getting All Projects for a User
```python
from database.models import Project

projects = Project.get_by_user(user_id=1)
for project in projects:
    print(f"{project['title']} - {project['status']}")
```

### Creating a Project
```python
from database.models import Project

project_id = Project.create(
    user_id=1,
    title="JARVIS AI",
    description="Advanced AI assistant",
    status="active"
)
```

### Adding Files to a Project
```python
from database.models import File

file_id = File.create(
    project_id=1,
    filename="neural_net.py",
    filepath="/projects/jarvis/neural_net.py",
    filesize=45678,
    filetype="py"
)
```

### Searching Projects
```python
from database.utils import search_projects

results = search_projects("reactor")
for result in results:
    print(f"{result['title']} by {result['user_name']}")
```

### Getting User Statistics
```python
from database.utils import get_user_stats

stats = get_user_stats(user_id=1)
print(f"Projects: {stats['project_count']}")
print(f"Files: {stats['file_count']}")
print(f"Storage: {stats['total_storage']} bytes")
```

---

## 🔧 Database Utilities

### Backup Database
```python
from database.utils import backup_database

backup_database('backups/app_backup.db')
```

### Get Recent Activity
```python
from database.utils import get_recent_activity

recent = get_recent_activity(limit=10)
for item in recent:
    print(f"{item['type']}: {item['name']} - {item['created_at']}")
```

---

## 🛡️ Security Features

- **Prepared Statements**: All queries use parameterized statements (prevents SQL injection)
- **Foreign Key Constraints**: Enabled for referential integrity
- **Password Hashing**: SHA256 hashing (upgrade to bcrypt for production)
- **Context Managers**: Automatic transaction rollback on errors
- **Input Validation**: Field whitelisting in update operations

---

## 📁 File Structure

```
backend/
├── database/
│   ├── __init__.py          # Package exports
│   ├── connection.py        # Database connection manager
│   ├── schema.py            # Table definitions + migrations
│   ├── routes.py            # Flask API routes
│   ├── utils.py             # Utility functions
│   ├── seed.py              # Sample data generator
│   └── models/
│       ├── __init__.py      # Model exports
│       ├── user.py          # User CRUD operations
│       ├── project.py       # Project CRUD operations
│       └── file.py          # File CRUD operations
├── init_db.py               # Database initialization script
└── app.db                   # SQLite database file (auto-created)
```

---

## 🎯 Integration with Flask

Add to your `app.py`:

```python
from database import init_database
from database.routes import db_routes

# Initialize database on startup
init_database()

# Register API routes
app.register_blueprint(db_routes, url_prefix='/api')
```

---

## 📝 Example Queries

### Get All Projects with User Info
```python
from database.connection import get_db

with get_db() as conn:
    cursor = conn.execute('''
        SELECT p.*, u.name as user_name
        FROM projects p
        JOIN users u ON p.user_id = u.id
    ''')
    results = [dict(row) for row in cursor.fetchall()]
```

### Get Files with Project and User Info
```python
with get_db() as conn:
    cursor = conn.execute('''
        SELECT f.*, p.title as project_title, u.name as owner
        FROM files f
        JOIN projects p ON f.project_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE f.filetype = ?
    ''', ('pdf',))
    results = [dict(row) for row in cursor.fetchall()]
```

---

## ⚠️ Notes

- Database file created at `backend/app.db`
- Runs 100% offline (no internet required)
- Auto-creates tables on first run
- Foreign keys cascade on delete
- Timestamps auto-update via triggers
- Use `init_db.py full` to reset everything

---

*Built for TONY AI — Fully offline local database*
