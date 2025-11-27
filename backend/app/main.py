import os
import time
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError
from app.core.database import engine
from app.api.v1 import cv, profiles, jobs, applications, auth
from app.models import models
from app.services.parse_service import process_cv_background
from app.core.security import get_password_hash
from sqlalchemy.orm import Session
import asyncio

# Configure Logging via environment (default INFO)
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format=LOG_FORMAT,
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Headhunter API", version="1.2.0")

# --- Serve Raw Files ---
# Allows frontend to access PDFs via http://localhost:30001/files/filename.pdf
#app.mount("/files", StaticFiles(directory="/app/data/raw"), name="files")
BASE_DIR = Path(os.getcwd())
RAW_DIR = BASE_DIR / "data" / "raw"

# Create directory if it doesn't exist
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Mount using the absolute string path
app.mount("/files", StaticFiles(directory=str(RAW_DIR)), name="files")

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
            stuck_cvs = session.query(models.CV).filter(models.CV.is_parsed == False).all()
            
            if stuck_cvs:
                logger.info(f"⚠️ Found {len(stuck_cvs)} interrupted tasks. Re-queueing...")
                for cv_item in stuck_cvs:
                    # We can't use BackgroundTasks here because we are not in a request context.
                    # We must fire-and-forget or await them. 
                    # Since process_cv_background creates its own session, we just pass the engine.
                    # We use asyncio.create_task to run them in background without blocking startup completely.
                    asyncio.create_task(process_cv_background(cv_item.id, engine))
            else:
                logger.info("✅ No interrupted tasks found.")
            
            session.close()

        # Create Default Admin User
        try:
            from app.core.database import SessionLocal
            session = SessionLocal()
            admin_email = "admin@headhunter.ai"
            admin = session.query(models.User).filter(models.User.email == admin_email).first()
            if not admin:
                logger.info("👤 Creating default admin user...")
                hashed_pwd = get_password_hash("admin")
                new_admin = models.User(email=admin_email, hashed_password=hashed_pwd, is_active=True)
                session.add(new_admin)
                session.commit()
                logger.info(f"✅ Default admin created: {admin_email} / admin")
            else:
                logger.info("✅ Admin user already exists.")
            session.close()
        except Exception as e:
            logger.error(f"❌ Error creating admin user: {e}")

    except Exception as e:
        logger.error(f"❌ Error during startup task recovery: {e}")

# --- Register Routers ---
app.include_router(cv.router)
app.include_router(profiles.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(auth.router, prefix="/auth")

@app.get("/")
def root():
    return {
        "system": "Headhunter", 
        "status": "Online", 
        "docs": "/docs"
    }
