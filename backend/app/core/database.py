import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

logger = logging.getLogger(__name__)

# Use Environment variable from Docker, fallback to localhost for testing
DATABASE_URL = settings.DATABASE_URL

logger.debug(f"Initializing database connection pool with pool_size=20, max_overflow=40")

try:
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,       # Increase from default 5
        max_overflow=40,    # Increase from default 10
        pool_timeout=60     # Wait longer before giving up
    )
    logger.debug("Database engine created successfully")
except Exception as e:
    logger.critical(f"Failed to create database engine: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()