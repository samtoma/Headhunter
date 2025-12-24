"""
Unified Log Worker

Background worker that consumes both System and LLM logs from the unified Redis queue
and writes them to the dedicated Logs Database.

This implements the "Fire-and-Forget" pattern where the main application pushes logs
to Redis, and this worker processes them asynchronously and in batches for performance.

Key Features:
- Consumes from 'logs_queue'
- Handles 'system' and 'llm' log types
- Writes to 'system_logs' and 'llm_logs' tables in local logs DB
- Implements batch processing (flush every N items or T seconds)
- Strict database separation (uses dedicated LOGS_DATABASE_URL)

Usage:
    python -m app.workers.unified_log_worker
"""

import os
import json
import time
import logging
import signal
import sys
from typing import Dict, List, Any, Optional
import redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database_logs import LogsSessionLocal, engine_logs as engine
# CORRECTION: Import LogBase as Base to match usage below
from app.models.log_models import LogBase as Base, SystemLog, LLMLog
from app.core.logging import get_logger

# Configure logger for the worker itself (logs to stdout/stderr)
logger = get_logger(__name__)

# Configuration
LOGS_QUEUE = "logs_queue"  # Must match LoggingMiddleware and LLMLogger
BATCH_SIZE = 100           # Flush after 100 items
FLUSH_INTERVAL = 5.0       # Flush every 5 seconds regardless of size
WORKER_SLEEP = 0.1         # Sleep when queue is empty

# Global flag for graceful shutdown
running = True

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    global running
    logger.info("Shutdown signal received, finishing batch...")
    running = False

def init_redis() -> Optional[redis.Redis]:
    """Initialize Redis client."""
    try:
        client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
        client.ping()
        logger.info(f"Connected to Redis at {settings.REDIS_HOST}")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return None

def create_tables():
    """
    Create logs tables and indexes if they don't exist in the Logs DB.
    
    Uses retry logic for transient connection issues. This is important because:
    - The logs database may be starting up when the worker starts
    - Network issues can cause temporary connection failures
    - We want the worker to be resilient to temporary database unavailability
    
    Note: This uses create_all() instead of Alembic migrations because:
    - system_logs and llm_logs are in a separate database (logs DB)
    - Alembic migrations only run against the main database
    - This approach is simpler for the logs database schema
    """
    max_retries = 5
    retry_delay = 2  # seconds
    
    for attempt in range(1, max_retries + 1):
        try:
            # Create tables
            Base.metadata.create_all(bind=engine)
            logger.info("Logs database tables verified/created")
            
            # Create composite indexes for performance (these are in logs DB, not main DB)
            # These indexes improve query performance for common patterns
            from sqlalchemy import text
            
            with engine.connect() as conn:
                # Index for filtering by level and ordering by created_at (most common query pattern)
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_system_logs_level_created 
                    ON system_logs(level, created_at DESC)
                """))
                
                # Index for filtering by component and ordering by created_at
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_system_logs_component_created 
                    ON system_logs(component, created_at DESC)
                """))
                
                # Index for error queries (filtering by error_type IS NOT NULL and created_at)
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_system_logs_errors 
                    ON system_logs(error_type, created_at) 
                    WHERE error_type IS NOT NULL
                """))
                
                conn.commit()
            
            logger.info("Logs database composite indexes verified/created")
            return  # Success - exit function
        except Exception as e:
            if attempt < max_retries:
                logger.warning(f"Failed to create logs tables/indexes (attempt {attempt}/{max_retries}): {e}")
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                # Final attempt failed
                logger.error(f"Failed to create logs tables/indexes after {max_retries} attempts: {e}")
                logger.error("Worker cannot start without database tables. Exiting.")
                raise

def process_batch(batch: List[Dict[str, Any]]) -> None:
    """
    Process a batch of log data dictionaries and write to DB.
    Separates into SystemLog and LLMLog objects.
    """
    if not batch:
        return

    system_logs_to_save = []
    llm_logs_to_save = []

    for log_data in batch:
        try:
            log_type = log_data.get("log_type", "system") # Default to system if missing
            
            if log_type == "llm":
                # Create LLMLog object
                llm_log = LLMLog(
                    level=log_data.get("level", "INFO"),
                    action=log_data.get("action", "unknown"),
                    message=log_data.get("message", ""),
                    user_id=log_data.get("user_id"),
                    company_id=log_data.get("company_id"),
                    interview_id=log_data.get("interview_id"),
                    error_type=log_data.get("error_type"),
                    error_message=log_data.get("error_message"),
                    extra_metadata=log_data.get("metadata"), # Expecting JSON string or dict? Middleware sends headers which is dict? 
                    # Middleware sends json.dumps(metadata) which is string.
                    # LLMLogger sends json.dumps(metadata) which is string.
                    # SQLAlchemy JSONB handles dict, but if input is string, we might need to parse it?
                    # Postgres JSONB adapter usually handles dicts. If input is string, it might be saved as escaped string.
                    # Ideally we store as dict. Middleware sends `json.dumps`. 
                    # Let's decode if it's a string, to allow JSONB column to index it properly.
                    deployment_version=log_data.get("deployment_version"),
                    deployment_environment=log_data.get("deployment_environment")
                )
                
                # Metadata handling
                meta = log_data.get("metadata")
                if isinstance(meta, str):
                    try:
                        llm_log.extra_metadata = json.loads(meta)
                    except (json.JSONDecodeError, TypeError, ValueError):
                        llm_log.extra_metadata = {"raw": meta}
                else:
                    llm_log.extra_metadata = meta
                
                llm_logs_to_save.append(llm_log)
                
            else:
                # Create SystemLog object
                sys_log = SystemLog(
                    level=log_data.get("level", "INFO"),
                    component=log_data.get("component", "unknown"),
                    action=log_data.get("action", "unknown"),
                    message=log_data.get("message", ""),
                    user_id=log_data.get("user_id"),
                    company_id=log_data.get("company_id"),
                    request_id=log_data.get("request_id"),
                    http_method=log_data.get("http_method"),
                    http_path=log_data.get("http_path"),
                    http_status=log_data.get("http_status"),
                    response_time_ms=log_data.get("response_time_ms"),
                    ip_address=log_data.get("ip_address"),
                    user_agent=log_data.get("user_agent"),
                    error_type=log_data.get("error_type"),
                    error_message=log_data.get("error_message"),
                    stack_trace=log_data.get("stack_trace"),
                    extra_metadata=None, # Process below
                    deployment_version=log_data.get("deployment_version"),
                    deployment_environment=log_data.get("deployment_environment")
                )
                
                # Metadata handling
                meta = log_data.get("extra_metadata") # Middleware key is "extra_metadata"
                if isinstance(meta, str):
                    try:
                        sys_log.extra_metadata = json.loads(meta)
                    except (json.JSONDecodeError, TypeError, ValueError):
                        sys_log.extra_metadata = {"raw": meta}
                else:
                    sys_log.extra_metadata = meta

                system_logs_to_save.append(sys_log)

        except Exception as e:
            logger.error(f"Error preparing log object: {e} - Data: {log_data}")
            continue

    # Bulk Insert
    if not system_logs_to_save and not llm_logs_to_save:
        return

    db: Session = LogsSessionLocal()
    try:
        if system_logs_to_save:
            db.bulk_save_objects(system_logs_to_save)
        if llm_logs_to_save:
            db.bulk_save_objects(llm_logs_to_save)
        
        db.commit()
        logger.info(f"Flushed batch: {len(system_logs_to_save)} system, {len(llm_logs_to_save)} llm logs")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to flush logs batch: {e}", exc_info=True)
        # Potential enhancement: Push back to dead-letter queue
    finally:
        db.close()

def run_worker():
    """Main worker loop."""
    logger.info("Starting Unified Log Worker...")
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Init dependencies
    try:
        init_redis() # Just check connection
        create_tables()
    except Exception as e:
        logger.critical(f"Worker startup failed: {e}")
        return

    redis_client = init_redis()
    if not redis_client:
        return

    logger.info("Unified Log Worker running and waiting for logs...")

    batch = []
    last_flush_time = time.time()

    while running:
        try:
            # Non-blocking pop to allow periodic flush based on time
            # Using lpop/rpop? Middleware uses lpush, so we should rpop.
            # Using basic pop with short logic or brpop with timeout.
            # Redis 'rpop' is non-blocking. 'brpop' is blocking.
            # Use brpop with short timeout to allow checking flush interval.
            
            queue_item = redis_client.brpop(LOGS_QUEUE, timeout=1)
            
            if queue_item:
                _, log_json = queue_item
                try:
                    log_data = json.loads(log_json)
                    batch.append(log_data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON in queue: {log_json}")
            
            # Check flush conditions
            current_time = time.time()
            is_full = len(batch) >= BATCH_SIZE
            is_timeout = (current_time - last_flush_time) >= FLUSH_INTERVAL and len(batch) > 0
            
            if is_full or is_timeout:
                process_batch(batch)
                batch = []
                last_flush_time = current_time
            
        except Exception as e:
            logger.error(f"Worker loop error: {e}", exc_info=True)
            time.sleep(1) # Prevent tight loop on error

    # Cleanup shutdown
    if batch:
        logger.info("Flushing remaining logs before shutdown...")
        process_batch(batch)
    
    logger.info("Unified Log Worker stopped.")

if __name__ == "__main__":
    run_worker()
