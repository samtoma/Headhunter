from app.core.database import SessionLocal, engine, Base
from app.models.models import User, Company, UserRole
from app.core.security import get_password_hash

def reset_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Creating Headhunter company...")
        company = Company(
            name="Headhunter AI",
            domain="headhunter.ai",
            description="The AI-powered recruitment platform.",
            industry="Technology"
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        print("Creating Super Admin...")
        hashed_password = get_password_hash("admin")
        admin = User(
            email="admin@headhunter.ai",
            hashed_password=hashed_password,
            role=UserRole.SUPER_ADMIN,
            company_id=company.id,
            is_verified=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        
        print("Database reset complete.")
        print("User: admin@headhunter.ai")
        print("Pass: admin")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
