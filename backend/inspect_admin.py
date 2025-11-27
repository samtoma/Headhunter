from app.core.database import SessionLocal
from app.models.models import User, Company, UserRole

def inspect_admin():
    db = SessionLocal()
    try:
        print("--- Admin User ---")
        admin = db.query(User).filter(User.email == "admin@headhunter.ai").first()
        if admin:
            print(f"Email: {admin.email}")
            print(f"Role: {admin.role}")
            print(f"Company ID: {admin.company_id}")
        else:
            print("Admin user not found!")

        print("\n--- Companies ---")
        companies = db.query(Company).all()
        print(f"Total Companies: {len(companies)}")
        for c in companies:
            print(f"ID: {c.id}, Name: {c.name}, Domain: {c.domain}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_admin()
