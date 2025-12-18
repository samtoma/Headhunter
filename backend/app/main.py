from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from app.core.database import engine, get_db
from app.api.v1 import cv, profiles, jobs, applications, auth, company, sso, interviews, companies, logs, sync, stats, users, analytics, departments, activity, google_auth, public
from app.api.endpoints import search
from app.models import models
from sqlalchemy.orm import Session
from app.core.cache import init_cache

# ... (logging config)
from app.core.logging import setup_logging, get_logger
from sqlalchemy import text

# Initialize logging with daily rotation
setup_logging(log_dir="/app/logs", log_level="INFO")
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Headhunter API...")
    # Ensure database tables are created
    models.Base.metadata.create_all(bind=engine)
    # Initialize Redis Cache
    await init_cache()
    
    # Auto-resume interrupted CV processing
    try:
        from app.core.database import SessionLocal
        from app.tasks.cv_tasks import process_cv_task
        
        db = SessionLocal()
        unparsed_cvs = db.query(models.CV).filter(models.CV.is_parsed.is_(False)).all()
        
        if unparsed_cvs:
            logger.info(f"Found {len(unparsed_cvs)} unparsed CVs - resuming processing...")
            for cv in unparsed_cvs:
                process_cv_task.delay(cv.id)
            logger.info(f"Queued {len(unparsed_cvs)} CVs for processing")
        else:
            logger.info("No interrupted CV processing to resume")
            
        db.close()
    except Exception as e:
        logger.error(f"Failed to resume CV processing: {e}")
        
    # Auto-Sync Embeddings (Background Task)
    try:
        from app.services.sync_service import sync_embeddings
        logger.info("Starting background embedding sync...")
        # Run in background to not block startup
        asyncio.create_task(sync_embeddings(limit=500))
    except Exception as e:
        logger.error(f"Failed to start embedding sync: {e}")
    
    yield

# Read version from centralized VERSION file
def get_app_version():
    """Read version from VERSION file"""
    import os
    # Try multiple locations
    for path in ["/app/VERSION", os.path.join(os.path.dirname(__file__), "..", "VERSION"), "../VERSION"]:
        try:
            with open(path, "r") as f:
                return f.read().strip()
        except FileNotFoundError:
            continue
    return "0.0.0"

APP_VERSION = get_app_version()

app = FastAPI(
    title="Headhunter API",
    description="AI-Powered Recruitment Platform",
    version=APP_VERSION,
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- Register Routers ---
app.include_router(cv.router)
app.include_router(profiles.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(interviews.router)
app.include_router(companies.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(google_auth.router, prefix="/auth") # /auth/google/login
app.include_router(company.router, prefix="/company")
app.include_router(sso.router, prefix="/auth") # SSO endpoints under /auth/microsoft/...
app.include_router(logs.router)
app.include_router(sync.router)
app.include_router(users.router)
app.include_router(stats.router) # Register stats router
app.include_router(analytics.router) # Register analytics router
app.include_router(departments.router)
app.include_router(activity.router)
app.include_router(search.router, prefix="/search", tags=["Search"])
app.include_router(public.router)  # Public landing page endpoints (unauthenticated)

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
    """Returns the current backend version and AI model."""
    import os
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    return {"version": app.version, "model": model}

@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers"""
    return {"status": "healthy", "service": "headhunter-backend"}

@app.get("/metrics")
async def metrics(db: Session = Depends(get_db)):
    """Basic metrics for monitoring"""
    pool_status = db.get_bind().pool.status()
    
    return {
        "db_pool_status": pool_status,
        "total_jobs": db.execute(text("SELECT COUNT(*) FROM jobs")).scalar(),
        "total_cvs": db.execute(text("SELECT COUNT(*) FROM cvs")).scalar(),
    }
