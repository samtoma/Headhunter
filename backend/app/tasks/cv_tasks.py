import os
import redis
import logging
from app.celery_app import celery_app
from app.services.parse_service import process_cv

logger = logging.getLogger(__name__)

# Initialize Redis client for monitoring
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
r = redis.from_url(redis_url)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_cv_task(self, cv_id: int):
    """
    Celery task to process a CV.
    """
    try:
        # Track metrics
        queue_depth = r.llen("celery")
        active_count = r.incr("cv_processing_count")
        
        msg_start = f"🚀 [Task] Starting CV {cv_id} | Active: {active_count}/5 | Queue: {queue_depth}"
        logger.info(msg_start)
        print(msg_start, flush=True)  # Force output to stdout
        
        process_cv(cv_id)
        
        msg_end = f"✅ [Task] Finished CV {cv_id}"
        logger.info(msg_end)
        print(msg_end, flush=True)
    except Exception as e:
        msg_err = f"❌ [Task] Error CV {cv_id}: {e}"
        logger.error(msg_err)
        print(msg_err, flush=True)
        raise self.retry(exc=e)
    finally:
        # Always decrement active count
        r.decr("cv_processing_count")

