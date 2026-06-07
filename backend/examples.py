"""Example database queries and usage patterns"""
from database.models import User, Project, File
from database.utils import get_user_stats, get_project_stats, search_projects, search_files, get_recent_activity
from database.connection import get_db

# ═══════════════════════════════════════════════════════════════════════
# BASIC CRUD EXAMPLES
# ═══════════════════════════════════════════════════════════════════════

def example_create_user():
    """Create a new user"""
    user_id = User.create(
        name="Tony Stark",
        email="tony@stark.com",
        password_hash="hashed_password_here"
    )
    print(f"Created user with ID: {user_id}")
    return user_id

def example_get_user(user_id):
    """Get user by ID"""
    user = User.get_by_id(user_id)
    if user:
        print(f"User: {user['name']} ({user['email']})")
    return user

def example_update_user(user_id):
    """Update user information"""
    success = User.update(user_id, name="Anthony Stark")
    print(f"Update {'succeeded' if success else 'failed'}")
    return success

def example_delete_user(user_id):
    """Delete a user"""
    success = User.delete(user_id)
    print(f"Delete {'succeeded' if success else 'failed'}")
    return success

# ═══════════════════════════════════════════════════════════════════════
# PROJECT EXAMPLES
# ═══════════════════════════════════════════════════════════════════════

def example_create_project(user_id):
    """Create a new project"""
    project_id = Project.create(
        user_id=user_id,
        title="Arc Reactor MK-III",
        description="Next generation clean energy",
        status="active"
    )
    print(f"Created project with ID: {project_id}")
    return project_id

def example_get_user_projects(user_id):
    """Get all projects for a user"""
    projects = Project.get_by_user(user_id)
    print(f"Found {len(projects)} projects:")
    for p in projects:
        print(f"  - {p['title']} ({p['status']})")
    return projects

def example_update_project_status(project_id):
    """Update project status"""
    success = Project.update(project_id, status="completed")
    print(f"Project status updated: {success}")
    return success

# ═══════════════════════════════════════════════════════════════════════
# FILE EXAMPLES
# ═══════════════════════════════════════════════════════════════════════

def example_add_file(project_id):
    """Add a file to a project"""
    file_id = File.create(
        project_id=project_id,
        filename="reactor_schematic.pdf",
        filepath="/projects/arc-reactor/reactor_schematic.pdf",
        filesize=2457600,
        filetype="pdf"
    )
    print(f"Added file with ID: {file_id}")
    return file_id

def example_get_project_files(project_id):
    """Get all files in a project"""
    files = File.get_by_project(project_id)
    print(f"Found {len(files)} files:")
    for f in files:
        print(f"  - {f['filename']} ({f['filesize']} bytes)")
    return files

def example_get_files_by_type(filetype):
    """Get all files of a specific type"""
    files = File.get_by_type(filetype)
    print(f"Found {len(files)} {filetype} files")
    return files

# ═══════════════════════════════════════════════════════════════════════
# ADVANCED QUERIES
# ═══════════════════════════════════════════════════════════════════════

def example_user_statistics(user_id):
    """Get comprehensive user statistics"""
    stats = get_user_stats(user_id)
    print(f"User Stats:")
    print(f"  Projects: {stats['project_count']}")
    print(f"  Files: {stats['file_count']}")
    print(f"  Total Storage: {stats['total_storage']/1e6:.1f} MB")
    return stats

def example_project_statistics(project_id):
    """Get project statistics"""
    stats = get_project_stats(project_id)
    print(f"Project Stats:")
    print(f"  Files: {stats['file_count']}")
    print(f"  Total Size: {stats['total_size']/1e6:.1f} MB")
    print(f"  Last Updated: {stats['last_file_added']}")
    return stats

def example_search_projects(query):
    """Search projects by title or description"""
    results = search_projects(query)
    print(f"Found {len(results)} projects matching '{query}':")
    for r in results:
        print(f"  - {r['title']} by {r['user_name']}")
    return results

def example_search_files(query):
    """Search files by filename"""
    results = search_files(query)
    print(f"Found {len(results)} files matching '{query}':")
    for r in results:
        print(f"  - {r['filename']} in {r['project_title']}")
    return results

def example_recent_activity():
    """Get recent activity across all tables"""
    activity = get_recent_activity(limit=10)
    print("Recent Activity:")
    for item in activity:
        print(f"  {item['type']}: {item['name']} - {item['created_at']}")
    return activity

# ═══════════════════════════════════════════════════════════════════════
# COMPLEX QUERIES WITH JOINS
# ═══════════════════════════════════════════════════════════════════════

def example_project_with_user(project_id):
    """Get project with user information"""
    project = Project.get_with_user(project_id)
    if project:
        print(f"Project: {project['title']}")
        print(f"Owner: {project['user_name']} ({project['user_email']})")
    return project

def example_file_with_project(file_id):
    """Get file with project information"""
    file = File.get_with_project(file_id)
    if file:
        print(f"File: {file['filename']}")
        print(f"Project: {file['project_title']}")
        print(f"User ID: {file['user_id']}")
    return file

def example_all_user_files(user_id):
    """Get all files owned by a user across all projects"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT f.*, p.title as project_title
            FROM files f
            JOIN projects p ON f.project_id = p.id
            WHERE p.user_id = ?
            ORDER BY f.created_at DESC
        ''', (user_id,))
        files = [dict(row) for row in cursor.fetchall()]
    
    print(f"User has {len(files)} total files:")
    for f in files:
        print(f"  - {f['filename']} in {f['project_title']}")
    return files

def example_storage_by_project():
    """Get storage used by each project"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT 
                p.id,
                p.title,
                u.name as owner,
                COUNT(f.id) as file_count,
                COALESCE(SUM(f.filesize), 0) as total_size
            FROM projects p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN files f ON p.id = f.project_id
            GROUP BY p.id
            ORDER BY total_size DESC
        ''')
        results = [dict(row) for row in cursor.fetchall()]
    
    print("Storage by Project:")
    for r in results:
        print(f"  {r['title']}: {r['total_size']/1e6:.1f} MB ({r['file_count']} files) - {r['owner']}")
    return results

def example_active_projects_with_files():
    """Get all active projects with file counts"""
    with get_db() as conn:
        cursor = conn.execute('''
            SELECT 
                p.*,
                u.name as owner_name,
                COUNT(f.id) as file_count
            FROM projects p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN files f ON p.id = f.project_id
            WHERE p.status = 'active'
            GROUP BY p.id
            ORDER BY file_count DESC
        ''')
        results = [dict(row) for row in cursor.fetchall()]
    
    print(f"Found {len(results)} active projects:")
    for r in results:
        print(f"  {r['title']} - {r['file_count']} files ({r['owner_name']})")
    return results

# ═══════════════════════════════════════════════════════════════════════
# TRANSACTION EXAMPLES
# ═══════════════════════════════════════════════════════════════════════

def example_create_project_with_files(user_id):
    """Create a project and add multiple files in one transaction"""
    with get_db() as conn:
        # Create project
        cursor = conn.execute(
            'INSERT INTO projects (user_id, title, description, status) VALUES (?, ?, ?, ?)',
            (user_id, "New AI System", "Advanced neural network", "active")
        )
        project_id = cursor.lastrowid
        
        # Add multiple files
        files = [
            ("neural_net.py", "/ai/neural_net.py", 45678, "py"),
            ("training_data.json", "/ai/training_data.json", 8934567, "json"),
            ("model_config.yaml", "/ai/model_config.yaml", 2048, "yaml")
        ]
        
        for filename, filepath, filesize, filetype in files:
            conn.execute(
                'INSERT INTO files (project_id, filename, filepath, filesize, filetype) VALUES (?, ?, ?, ?, ?)',
                (project_id, filename, filepath, filesize, filetype)
            )
        
        print(f"Created project {project_id} with {len(files)} files")
        return project_id

# ═══════════════════════════════════════════════════════════════════════
# RUN EXAMPLES
# ═══════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("\n" + "="*60)
    print("  DATABASE QUERY EXAMPLES")
    print("="*60 + "\n")
    
    # Make sure database is initialized
    from database import init_database
    init_database()
    
    # Run examples
    user_id = example_create_user()
    project_id = example_create_project(user_id)
    file_id = example_add_file(project_id)
    
    example_user_statistics(user_id)
    example_project_statistics(project_id)
    
    example_search_projects("reactor")
    example_recent_activity()
    
    print("\n" + "="*60)
    print("  All examples completed successfully!")
    print("="*60 + "\n")
