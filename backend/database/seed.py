"""Seed data for database"""
from .models import User, Project, File
import hashlib

def hash_password(password):
    """Simple password hashing (use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def seed_data():
    """Populate database with sample data"""
    print("Seeding database...")
    
    # Create users
    user1_id = User.create(
        name="Tony Stark",
        email="tony@starkindustries.com",
        password_hash=hash_password("jarvis123")
    )
    
    user2_id = User.create(
        name="Bruce Banner",
        email="bruce@avengers.com",
        password_hash=hash_password("hulk456")
    )
    
    user3_id = User.create(
        name="Peter Parker",
        email="peter@dailybugle.com",
        password_hash=hash_password("spidey789")
    )
    
    print(f"[OK] Created {3} users")
    
    # Create projects
    project1_id = Project.create(
        user_id=user1_id,
        title="Arc Reactor MK-III",
        description="Next generation clean energy reactor",
        status="active"
    )
    
    project2_id = Project.create(
        user_id=user1_id,
        title="JARVIS AI Upgrade",
        description="Advanced natural language processing improvements",
        status="active"
    )
    
    project3_id = Project.create(
        user_id=user2_id,
        title="Gamma Radiation Analysis",
        description="Research on gamma exposure effects",
        status="completed"
    )
    
    project4_id = Project.create(
        user_id=user3_id,
        title="Web Shooter v2.0",
        description="Improved web fluid formula",
        status="active"
    )
    
    print(f"[OK] Created {4} projects")
    
    # Create files
    File.create(
        project_id=project1_id,
        filename="reactor_schematic.pdf",
        filepath="/projects/arc-reactor/reactor_schematic.pdf",
        filesize=2457600,
        filetype="pdf"
    )
    
    File.create(
        project_id=project1_id,
        filename="energy_calculations.xlsx",
        filepath="/projects/arc-reactor/energy_calculations.xlsx",
        filesize=1024000,
        filetype="xlsx"
    )
    
    File.create(
        project_id=project2_id,
        filename="jarvis_neural_net.py",
        filepath="/projects/jarvis/jarvis_neural_net.py",
        filesize=45678,
        filetype="py"
    )
    
    File.create(
        project_id=project2_id,
        filename="training_data.json",
        filepath="/projects/jarvis/training_data.json",
        filesize=8934567,
        filetype="json"
    )
    
    File.create(
        project_id=project3_id,
        filename="gamma_report.docx",
        filepath="/projects/gamma/gamma_report.docx",
        filesize=567890,
        filetype="docx"
    )
    
    File.create(
        project_id=project4_id,
        filename="web_formula.txt",
        filepath="/projects/web-shooter/web_formula.txt",
        filesize=4096,
        filetype="txt"
    )
    
    print(f"[OK] Created {6} files")
    print("[OK] Database seeded successfully!")
