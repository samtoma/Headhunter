from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Depends
from app.core.database import engine, get_db
from app.api.v1 import cv, profiles, jobs, applications, auth, company, sso, interviews, companies, logs, sync, stats
from app.api.endpoints import search
from app.models import models
from sqlalchemy.orm import Session

# ... (logging config)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Headhunter API...")
    # Ensure database tables are created
    models.Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Headhunter API",
    description="AI-Powered Recruitment Platform",
    version="1.7.0-RC1",
    lifespan=lifespan
)

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
app.include_router(sync.router)
app.include_router(stats.router, prefix="/api/v1") # Register stats router
app.include_router(search.router, prefix="/search", tags=["Search"])

@app.get("/api/debug/db_check")
def debug_db_check(db: Session = Depends(get_db)):
    try:
        import redis
        import os
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.from_url(redis_url)
        queue_depth = r.llen("celery")
        processing_count = r.get("cv_processing_count")
        
        users = db.query(models.User).all()
        user_info = [{"email": u.email, "company_id": u.company_id} for u in users]
        
        # Find Samuel (Company 1)
        samuel = next((u for u in users if u.company_id == 1), None)
        
        cvs = db.query(models.CV).all()
        # cv_info removed as it was unused
        
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
        "docs": "/docs",
        "version": app.version
    }

@app.get("/version")
def get_version():
    """Returns the current backend version."""
    return {"version": app.version}
