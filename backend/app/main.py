import time
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError
from app.core.database import engine, Base
from app.api.v1 import cv, profiles

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Headhunter API", version="1.0.0")

# Mount uploads for PDF viewing
app.mount("/files", StaticFiles(directory="/app/data/raw"), name="files")

def wait_for_db():
    max_retries = 10
    wait_seconds = 3
    for i in range(max_retries):
        try:
            logger.info(f"Connecting to DB (Attempt {i+1}/{max_retries})...")
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database connected.")
            return
        except OperationalError:
            time.sleep(wait_seconds)
    logger.error("❌ DB Connection Failed")

wait_for_db()

app.include_router(cv.router)
app.include_router(profiles.router)

@app.get("/")
def root():
    return {"status": "Running", "gpu": "Intel OpenCL Active"}