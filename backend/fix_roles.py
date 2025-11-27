from app.core.database import SessionLocal
from app.models.models import User, Company, UserRole

def fix_roles():
    db = SessionLocal()
    try:
        print("--- Diagnostic Start ---")
        users = db.query(User).all()
        companies = db.query(Company).all()
        
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"User: {u.email}, Role: {u.role}, CompanyID: {u.company_id}")
            
        print(f"Total Companies: {len(companies)}")
        for c in companies:
            print(f"Company: {c.name}, Domain: {c.domain}, ID: {c.id}")
        print("------------------------")

        # 1. Link Users to Companies
        for user in users:
            if "@" not in user.email:
                continue
                
            domain = user.email.split("@")[1]
            
            # If user has no company, or company doesn't match domain (optional check)
            if not user.company_id:
                print(f"User {user.email} has no company. Attempting to link...")
                company = db.query(Company).filter(Company.domain == domain).first()
                
                if not company:
                    print(f"  Creating new company for domain: {domain}")
                    company = Company(domain=domain, name=domain)
                    db.add(company)
                    db.commit()
                    db.refresh(company)
                
                user.company_id = company.id
                db.commit()
                print(f"  Linked {user.email} to {company.name} ({company.id})")

        # 2. Ensure Admin per Company
        companies = db.query(Company).all() # Refresh
        for company in companies:
            print(f"Checking roles for company: {company.name}")
            company_users = db.query(User).filter(User.company_id == company.id).order_by(User.created_at.asc()).all()
            
            if not company_users:
                print("  No users.")
                continue
                
            has_admin = any(u.role == UserRole.ADMIN for u in company_users)
            
            if not has_admin:
                first_user = company_users[0]
                print(f"  No admin found. Promoting first user: {first_user.email}")
                first_user.role = UserRole.ADMIN
                db.commit()
            else:
                print("  Admin exists.")

        print("--- Fix Completed ---")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_roles()
