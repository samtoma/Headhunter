import sys
import os

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.models import User

def check_user():
    db = SessionLocal()
    try:
        email = "admin@headhunter.com"
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User found: {user.email}")
            print(f"Role: {user.role}")
            print(f"Is Active: {user.is_active}")
            print(f"Is Verified: {user.is_verified}")
            print(f"Hashed Password: {user.hashed_password[:10]}...")
        else:
            print(f"User {email} NOT found")
    except Exception as e:
        print(f"Error checking user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user()
