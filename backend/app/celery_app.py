import os
from celery import Celery

# Get Redis URL from environment or default to localhost
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "headhunter",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.cv_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
    worker_concurrency=5,
)
