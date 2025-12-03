from app.core.database import SessionLocal
from app.models.models import Job

def migrate_status():
    db = SessionLocal()
    try:
        jobs = db.query(Job).all()
        print(f"Found {len(jobs)} jobs to migrate.")
        
        migrated_count = 0
        for job in jobs:
            if not job.status or job.status == "Open": # Default is Open, but let's be explicit based on is_active
                if job.is_active:
                    job.status = "Open"
                else:
                    job.status = "Closed"
                migrated_count += 1
        
        db.commit()
        print(f"Successfully migrated {migrated_count} jobs.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_status()
