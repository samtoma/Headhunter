import sys
import os

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.models import User, UserRole
from app.core.security import get_password_hash

def restore_super_admin():
    db = SessionLocal()
    try:
        email = "admin@headhunter.com"
        password = "admin123"
        
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User {email} already exists. Resetting password...")
            user.hashed_password = get_password_hash(password)
            user.role = UserRole.SUPER_ADMIN
            user.is_active = True
            user.is_verified = True
            db.commit()
            print(f"Password reset for {email}")
        else:
            print(f"User {email} not found. Creating...")
            hashed_password = get_password_hash(password)
            db_user = User(
                email=email,
                hashed_password=hashed_password,
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(db_user)
            db.commit()
            print(f"Super admin created: {email} / ***")
        
    except Exception as e:
        print(f"Error restoring super admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    restore_super_admin()
