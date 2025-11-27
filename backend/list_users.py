import sys
import os

# Ensure we can import from app
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.models import User

def list_users():
    print("Connecting to database...")
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"\nFound {len(users)} users in the database:")
        print("-" * 50)
        print(f"{'ID':<5} | {'Email':<30} | {'Role':<10} | {'Verified':<10}")
        print("-" * 50)
        for u in users:
            print(f"{u.id:<5} | {u.email:<30} | {u.role:<10} | {str(u.is_verified):<10}")
        print("-" * 50)
    except Exception as e:
        print(f"Error querying database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
