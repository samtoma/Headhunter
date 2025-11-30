from app.core.database import SessionLocal
from app.models.models import Job, Company, User

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Users: {len(users)}")
    for u in users:
        print(f"User: {u.email}, Company ID: {u.company_id}, Role: {u.role}")

    companies = db.query(Company).all()
    print(f"Companies: {len(companies)}")
    for c in companies:
        print(f"Company: {c.name} (ID: {c.id})")

    jobs = db.query(Job).all()
    print(f"Jobs: {len(jobs)}")
    for j in jobs:
        print(f"Job: {j.title} (ID: {j.id}), Company ID: {j.company_id}, Department: {j.department}, Active: {j.is_active}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
