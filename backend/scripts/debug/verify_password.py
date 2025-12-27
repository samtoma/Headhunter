import sys
import os

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.models import User
from app.core.security import verify_password, get_password_hash

def check_password_verification():
    db = SessionLocal()
    try:
        email = "admin@headhunter.com"
        password = "admin123"
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User {email} not found")
            return

        print(f"Stored Hash: {user.hashed_password}")
        
        # Test verification
        is_valid = verify_password(password, user.hashed_password)
        print(f"Verification result: {is_valid}")
        
        # Test generating a new hash and verifying it
        new_hash = get_password_hash(password)
        print(f"New Hash: {new_hash}")
        print(f"Verify New Hash: {verify_password(password, new_hash)}")
        
    except Exception as e:
        print(f"Error verifying password: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_password_verification()
