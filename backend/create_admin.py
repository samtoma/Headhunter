import sys
import os

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.core.database import SessionLocal, engine
from app.models import models
from app.core.security import get_password_hash

def create_admin():
    # Ensure tables exist
    print("🔄 Checking database tables...")
    models.Base.metadata.create_all(bind=engine)
    print("✅ Tables verified/created.")

    db = SessionLocal()
    try:
        email = "admin@headhunter.ai"
        password = "admin"
        
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            print(f"User {email} exists. Updating password...")
            user.hashed_password = get_password_hash(password)
            user.is_active = True
        else:
            print(f"Creating user {email}...")
            user = models.User(
                email=email,
                hashed_password=get_password_hash(password),
                is_active=True
            )
            db.add(user)
        
        db.commit()
        print("✅ Admin user created/updated successfully.")
        print(f"Email: {email}")
        print(f"Password: {password}")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
