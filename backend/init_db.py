"""Database initialization and management script"""
import sys
from database.schema import init_database, reset_database
from database.seed import seed_data

def main():
    if len(sys.argv) < 2:
        print("Usage: python init_db.py [init|reset|seed|full]")
        print("  init  - Initialize database tables")
        print("  reset - Drop and recreate all tables")
        print("  seed  - Add sample data")
        print("  full  - Reset + seed (fresh start)")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'init':
        init_database()
    elif command == 'reset':
        reset_database()
    elif command == 'seed':
        seed_data()
    elif command == 'full':
        reset_database()
        seed_data()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == '__main__':
    main()
