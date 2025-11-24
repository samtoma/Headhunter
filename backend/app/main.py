import os
import time
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError
from app.core.database import engine, Base
from app.api.v1 import cv, profiles, jobs, applications # <--- Add applications

# Configure Logging via environment (default INFO)
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format=LOG_FORMAT,
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Headhunter API", version="1.0.0")

# --- Serve Raw Files ---
# Allows frontend to access PDFs via http://localhost:30001/files/filename.pdf
app.mount("/files", StaticFiles(directory="/app/data/raw"), name="files")

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
            with engine.connect() as connection:
                logger.info("✅ Database connected successfully.")
                return
        except OperationalError as e:
            logger.warning(f"⚠️ Database not ready yet: {e}")
            time.sleep(wait_seconds)
    
    logger.error("❌ Could not connect to Database after multiple retries.")

# Check DB connection on startup
wait_for_db()

# --- Register Routers ---
app.include_router(cv.router)
app.include_router(profiles.router)
app.include_router(jobs.router)
app.include_router(applications.router) # <--- Register here

@app.get("/")
def root():
    return {
        "system": "Headhunter", 
        "status": "Online", 
        "docs": "/docs"
    }
