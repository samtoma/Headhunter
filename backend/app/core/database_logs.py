import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings

logger = logging.getLogger(__name__)

# Dedicated connection to headhunter_logs
# This is physically separate from the main business DB
if "sqlite" in settings.LOGS_DATABASE_URL:
    engine_logs = create_engine(
        settings.LOGS_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    logger.debug("Initialized SQLite logs database engine (Testing Mode)")
else:
    engine_logs = create_engine(
        settings.LOGS_DATABASE_URL,
        pool_size=10,       
        max_overflow=20,
        pool_timeout=30
    )

LogsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_logs)

def get_logs_db():
    """
    Dependency for getting a read/write session to the Logs DB.
    Used by:
    1. Log Workers (Write)
    2. Admin Dashboard Enpoints (Read)
    """
    db = LogsSessionLocal()
    try:
        yield db
    finally:
        db.close()
