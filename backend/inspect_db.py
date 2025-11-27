from app.core.database import SessionLocal
from app.models.models import User, Company

db = SessionLocal()
users = db.query(User).all()
companies = db.query(Company).all()

print("--- Companies ---")
for c in companies:
    print(f"ID: {c.id}, Name: {c.name}, Domain: {c.domain}")

print("\n--- Users ---")
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, CompanyID: {u.company_id}, Verified: {u.is_verified}")
