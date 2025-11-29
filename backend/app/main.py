import os
import time
import logging
from pathlib import Path
from fastapi import FastAPI, Depends
from sqlalchemy.exc import OperationalError
from app.core.database import engine, get_db
from app.api.v1 import cv, profiles, jobs, applications, auth, company, sso, interviews, companies, logs
from app.models import models

# Configure Logging via environment (default INFO)
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format=LOG_FORMAT,
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Headhunter API", version="1.5.0")

# --- Serve Raw Files ---
BASE_DIR = Path(os.getcwd())
RAW_DIR = BASE_DIR / "data" / "raw"

# Create directory if it doesn't exist
RAW_DIR.mkdir(parents=True, exist_ok=True)

def wait_for_db():
    """
    Waits for the database to become available before starting the app.
    This prevents crash-loops if the DB container is slow to start.
    """
    max_retries = 10
    wait_seconds = 3
    
    for i in range(max_retries):
        try:
            logger.info(f"Connecting to DB (Attempt {i+1}/{max_retries})...")
            # We use Alembic for migrations now, but this check ensures connectivity
            with engine.connect():
                logger.info("✅ Database connected successfully.")
                return
        except OperationalError as e:
            logger.warning(f"⚠️ Database not ready yet: {e}")
            time.sleep(wait_seconds)
    
    logger.error("❌ Could not connect to Database after multiple retries.")

# Check DB connection on startup
wait_for_db()

from app.tasks.cv_tasks import process_cv_task
from sqlalchemy.orm import Session
from app import celery_app  # Ensure Celery app is loaded/configured

@app.on_event("startup")
async def startup_event():
    """
    On startup, find any CVs that are marked as not parsed (is_parsed=False)
    and re-queue them for processing. This handles cases where the server
    was interrupted (crash, restart, redeploy) while processing.
    """
    logger.info("🔄 Checking for interrupted CV parsing tasks...")
    try:
        # Create a new session for this startup task
        with engine.begin() as conn:
            # We need a session to query ORM models
            session = Session(bind=conn)
            stuck_cvs = session.query(models.CV).filter(models.CV.is_parsed.is_(False)).all()
            
            if stuck_cvs:
                cv_count = len(stuck_cvs)
                logger.info(f"⚠️ Found {cv_count} unprocessed CVs. Re-queueing for processing...")
                for cv in stuck_cvs:
                    process_cv_task.delay(cv.id)
                logger.info(f"✅ Re-queued {cv_count} CVs.")
            else:
                logger.info("✅ No interrupted tasks found.")
            
            session.close()
    except Exception as e:
        logger.error(f"❌ Error during startup task recovery: {e}")

# --- Register Routers ---
app.include_router(cv.router)
app.include_router(profiles.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(interviews.router)
app.include_router(companies.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(company.router, prefix="/company")
app.include_router(sso.router, prefix="/auth") # SSO endpoints under /auth/microsoft/...
app.include_router(logs.router)

@app.get("/api/debug/db_check")
def debug_db_check(db: Session = Depends(get_db)):
    try:
        import redis
        import os
        import json
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.from_url(redis_url)
        queue_depth = r.llen("celery")
        processing_count = r.get("cv_processing_count")
        
        users = db.query(models.User).all()
        user_info = [{"email": u.email, "company_id": u.company_id} for u in users]
        
        # Find Samuel (Company 1)
        samuel = next((u for u in users if u.company_id == 1), None)
        
        cvs = db.query(models.CV).all()
        cv_info = [{"id": cv.id, "company_id": cv.company_id, "is_parsed": cv.is_parsed} for cv in cvs]
        
        parsed_cvs = db.query(models.ParsedCV).all()
        parsed_info = [{"id": p.id, "cv_id": p.cv_id, "name": p.name, "skills_sample": p.skills[:50] if p.skills else "None"} for p in parsed_cvs]
        
        # Check matching query for Company 1
        match_count = 0
        candidates_sample = []
        if samuel:
            candidates = db.query(models.ParsedCV).join(models.ParsedCV.cv).filter(models.CV.company_id == samuel.company_id).all()
            match_count = len(candidates)
            candidates_sample = [{"id": c.id, "skills": c.skills} for c in candidates[:3]]

        return {
            "redis_queue_depth": queue_depth,
            "redis_processing_count": processing_count,
            "users": user_info,
            "cvs_count": len(cvs),
            "parsed_cvs_count": len(parsed_cvs),
            "match_count_for_company_1": match_count,
            "candidates_sample_company_1": candidates_sample,
            "parsed_cvs_sample": parsed_info[:5]
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def root():
    return {
        "system": "Headhunter", 
        "status": "Online", 
        "docs": "/docs"
    }
