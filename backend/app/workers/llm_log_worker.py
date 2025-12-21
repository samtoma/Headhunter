"""
LLM Log Worker

Background worker that consumes LLM logs from Redis queue and writes them to analytics database.
This separates LLM logging from production database operations for better performance.

Usage:
    python -m app.workers.llm_log_worker

Environment Variables:
    REDIS_HOST: Redis host (default: localhost)
    REDIS_PORT: Redis port (default: 6379)
    REDIS_DB: Redis database (default: 0)
    REDIS_PASSWORD: Redis password (optional)
    ANALYTICS_DATABASE_URL: Analytics database URL (required)
    WORKER_SLEEP_INTERVAL: Sleep interval between queue checks (default: 1.0)
"""

import os
import json
import time
import logging
from typing import Optional
import redis
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, BigInteger, func
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSONB

from app.core.logging import get_logger

logger = get_logger(__name__)

# Redis configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

# Analytics database configuration
# Can be same as main DB for simplicity, or separate analytics DB
ANALYTICS_DATABASE_URL = os.getenv("ANALYTICS_DATABASE_URL", os.getenv("DATABASE_URL"))
if not ANALYTICS_DATABASE_URL:
    raise ValueError("ANALYTICS_DATABASE_URL or DATABASE_URL environment variable is required")

# Worker configuration
WORKER_SLEEP_INTERVAL = float(os.getenv("WORKER_SLEEP_INTERVAL", 1.0))
LLM_LOG_QUEUE = "llm_logs"

# SQLAlchemy setup for analytics database
Base = declarative_base()
engine = create_engine(ANALYTICS_DATABASE_URL)
AnalyticsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class AnalyticsLLMLog(Base):
    """LLM Log model for analytics database."""
    __tablename__ = "llm_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    level = Column(String(20), nullable=False, index=True)
    component = Column(String(50), nullable=False, default="llm", index=True)
    action = Column(String(100), nullable=False, index=True)
    message = Column(Text, nullable=False)
    user_id = Column(Integer, index=True)
    company_id = Column(Integer, index=True)
    interview_id = Column(Integer)
    error_type = Column(String(100))
    error_message = Column(Text)
    extra_metadata = Column(JSONB)
    deployment_version = Column(String(50))
    deployment_environment = Column(String(50))


def create_tables():
    """Create analytics tables if they don't exist."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Analytics tables created/verified")
    except Exception as e:
        logger.error(f"Failed to create analytics tables: {e}")
        raise


def init_redis() -> Optional[redis.Redis]:
    """Initialize Redis client."""
    try:
        client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            password=REDIS_PASSWORD,
            decode_responses=True
        )
        # Test connection
        client.ping()
        logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return None


def process_llm_log(log_data: Dict) -> bool:
    """
    Process a single LLM log entry and write to analytics database.

    Args:
        log_data: Log data from Redis queue

    Returns:
        bool: True if successfully processed, False otherwise
    """
    db: Session = AnalyticsSessionLocal()
    try:
        # Create log entry
        log_entry = AnalyticsLLMLog(
            level=log_data["level"],
            component="llm",
            action=log_data["action"],
            message=log_data["message"],
            user_id=log_data["user_id"],
            company_id=log_data["company_id"],
            interview_id=log_data.get("interview_id"),
            error_type=log_data["error_type"],
            error_message=log_data["error_message"],
            extra_metadata=log_data["metadata"],
            deployment_version=os.getenv("DEPLOYMENT_VERSION", os.getenv("GIT_COMMIT")),
            deployment_environment=os.getenv("DEPLOYMENT_ENV", "production")
        )

        db.add(log_entry)
        db.commit()
        logger.debug(f"Processed LLM log: {log_data['action']} for company {log_data['company_id']}")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process LLM log: {e}", exc_info=True)
        return False
    finally:
        db.close()


def run_worker():
    """Main worker loop."""
    logger.info("Starting LLM Log Worker")

    # Initialize Redis
    redis_client = init_redis()
    if not redis_client:
        logger.error("Cannot start worker without Redis connection")
        return

    # Create analytics tables
    create_tables()

    logger.info("LLM Log Worker started successfully")

    try:
        while True:
            try:
                # Try to get log data from queue (blocking)
                log_data_raw = redis_client.brpop(LLM_LOG_QUEUE, timeout=5)

                if log_data_raw:
                    queue_name, log_data_json = log_data_raw
                    try:
                        log_data = json.loads(log_data_json)
                        success = process_llm_log(log_data)
                        if not success:
                            logger.warning(f"Failed to process log data: {log_data}")
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON in queue: {log_data_json} - {e}")
                    except Exception as e:
                        logger.error(f"Error processing queue item: {e}", exc_info=True)
                else:
                    # No data, sleep briefly
                    time.sleep(WORKER_SLEEP_INTERVAL)

            except KeyboardInterrupt:
                logger.info("Received shutdown signal")
                break
            except Exception as e:
                logger.error(f"Worker error: {e}", exc_info=True)
                time.sleep(5)  # Back off on errors

    except KeyboardInterrupt:
        logger.info("Worker shutdown requested")
    finally:
        logger.info("LLM Log Worker stopped")


if __name__ == "__main__":
    run_worker()
