from app.core.database import SessionLocal
from app.models.models import Company, Job
import json

def sync_departments():
    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        print(f"Found {len(companies)} companies.")
        
        for company in companies:
            # Get existing company departments
            existing_depts = []
            if company.departments:
                try:
                    existing_depts = json.loads(company.departments)
                    if not isinstance(existing_depts, list):
                        existing_depts = []
                except Exception:
                    existing_depts = []
            
            # Get all unique departments from jobs
            job_depts = db.query(Job.department).filter(Job.company_id == company.id).distinct().all()
            job_depts = [d[0] for d in job_depts if d[0]] # Filter None/Empty
            
            # Merge
            all_depts = sorted(list(set(existing_depts + job_depts)))
            
            if all_depts != existing_depts:
                print(f"Updating Company {company.name} ({company.id}): {existing_depts} -> {all_depts}")
                company.departments = json.dumps(all_depts)
            else:
                print(f"Company {company.name} ({company.id}) is already in sync.")
                
        db.commit()
        print("Sync complete.")
        
    except Exception as e:
        print(f"Error during sync: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_departments()
