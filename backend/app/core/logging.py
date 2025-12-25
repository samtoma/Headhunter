"""
Comprehensive Logging Module for Headhunter AI

Features:
- Structured JSON logs with timestamp, action, component, company, user
- Daily log rotation with automatic cleanup
- File + console output
- Redis queue integration for async database logging (ERROR level+)
"""

import logging
import json
import os
import time
from datetime import datetime, timezone
from logging.handlers import TimedRotatingFileHandler
from typing import Optional


class StructuredJSONFormatter(logging.Formatter):
    """
    JSON formatter that includes timestamp, level, action, component, 
    company, user, and message in structured format.
    """
    
    def format(self, record):
        # Base log structure with timestamp and level
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "component": record.name,
            "module": record.module,
            "function": record.funcName,
            "message": record.getMessage(),
        }
        
        # Add extra context if provided (action, company_id, user_id, etc.)
        # These can be passed via logger.info("msg", extra={...})
        extra_fields = ["action", "company_id", "company_name", "user_id", 
                        "user_email", "job_id", "cv_id", "request_id"]
        for field in extra_fields:
            if hasattr(record, field):
                log_data[field] = getattr(record, field)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_data)


class RedisQueueHandler(logging.Handler):
    """
    Logging handler that pushes log records to a Redis queue for async database storage.
    Captures only ERROR and above by default to avoid flooding the queue.
    """
    def __init__(self, redis_url: Optional[str] = None, queue_name: str = "logs_queue"):
        super().__init__()
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://redis:6379/0")
        self.queue_name = queue_name
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import redis
            try:
                self._client = redis.Redis.from_url(self.redis_url, decode_responses=True)
            except Exception:
                pass
        return self._client

    def emit(self, record):
        # Prevent recursion if redis itself fails
        if record.name == "app.core.logging":
            return

        try:
            client = self.client
            if not client:
                return

            # Basic log data
            data = {
                "log_type": "system",
                "level": record.levelname,
                "component": record.name,
                "module": record.module,
                "function": record.funcName,
                "message": record.getMessage(),
                "timestamp": time.time(),
                "deployment_version": os.getenv("DEPLOYMENT_VERSION", "0.0.0"),
                "deployment_environment": os.getenv("DEPLOYMENT_ENV", "development"),
            }

            # Add exception info if present
            if record.exc_info:
                data["error_type"] = record.exc_info[0].__name__
                data["error_message"] = str(record.exc_info[1])
                import traceback
                data["stack_trace"] = "".join(traceback.format_exception(*record.exc_info))
            
            # Add extra context (action, user_id, etc.)
            extra_fields = ["action", "company_id", "user_id", "request_id"]
            for field in extra_fields:
                if hasattr(record, field):
                    data[field] = getattr(record, field)
            
            # Use request_id if available in state or elsewhere
            # Note: access to request.state is not easy here without custom logic

            client.lpush(self.queue_name, json.dumps(data))
        except Exception:
            # Silent failure to avoid crashing the app during logging
            pass


def setup_logging(log_dir: str = "/app/logs", log_level: str = "INFO"):
    """
    Configure logging with daily rotation, JSON formatting, and Redis integration.
    """
    # Try to create log directory, fall back to ./logs if /app/logs fails
    file_logging_enabled = True
    try:
        os.makedirs(log_dir, exist_ok=True)
    except PermissionError:
        # Fallback for non-Docker environments (CI, local dev)
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
        try:
            os.makedirs(log_dir, exist_ok=True)
        except PermissionError:
            file_logging_enabled = False
    
    log_file = os.path.join(log_dir, "headhunter.log")
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []
    
    # 1. File handler
    if file_logging_enabled:
        file_handler = TimedRotatingFileHandler(
            log_file, when="midnight", interval=1, backupCount=1, encoding="utf-8"
        )
        file_handler.setFormatter(StructuredJSONFormatter())
        root_logger.addHandler(file_handler)
    
    # 2. Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(StructuredJSONFormatter())
    root_logger.addHandler(console_handler)
    
    # 3. Redis Queue handler (ERROR and above only)
    redis_handler = RedisQueueHandler()
    redis_handler.setLevel(logging.ERROR)
    redis_handler.setFormatter(StructuredJSONFormatter())
    root_logger.addHandler(redis_handler)
    
    # Reduce noise from external libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the specified name."""
    return logging.getLogger(name)


class AuditLogger:
    """
    Structured audit logger for tracking user actions.
    Convenience wrapper around standard logger with specific defaults.
    """
    
    def __init__(self, component: str):
        self.logger = logging.getLogger(f"audit.{component}")
        self.component = component
    
    def log_action(
        self,
        action: str,
        message: str,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        company_id: Optional[int] = None,
        company_name: Optional[str] = None,
        **kwargs
    ):
        """Log a user action with full context."""
        extra = {
            "action": action,
            "user_id": user_id,
            "user_email": user_email,
            "company_id": company_id,
            "company_name": company_name,
            **kwargs
        }
        extra = {k: v for k, v in extra.items() if v is not None}
        
        # Standard logger will now handle both console/file AND Redis (if it's an error)
        # However, for audit we often want INFO level logs in the database too.
        # So we manually push to Redis for audit actions if they are not already errors.
        
        self.logger.info(message, extra=extra)
        
        # Manually push to Redis for non-error audit logs (since redis_handler is level ERROR+)
        self._push_audit_to_redis("INFO", action, message, user_id, company_id, None, None, None, kwargs)
    
    def log_error(
        self,
        action: str,
        message: str,
        error: Optional[Exception] = None,
        **kwargs
    ):
        """Log an error with context."""
        extra = {"action": action, **kwargs}
        extra = {k: v for k, v in extra.items() if v is not None}
        
        if error:
            self.logger.error(message, exc_info=error, extra=extra)
        else:
            self.logger.error(message, extra=extra)
        
        # redis_handler already caught this because it's level ERROR. 
        # No need to manually push here.

    def _push_audit_to_redis(self, level, action, message, user_id, company_id, error_type, error_message, stack_trace, metadata):
        """Internal helper to push non-error audit logs to Redis."""
        try:
            import redis
            redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
            client = redis.Redis.from_url(redis_url, decode_responses=True)
            
            data = {
                "log_type": "system",
                "level": level,
                "component": self.component,
                "action": action,
                "message": message,
                "user_id": user_id,
                "company_id": company_id,
                "timestamp": time.time(),
                "deployment_version": os.getenv("DEPLOYMENT_VERSION", "0.0.0"),
                "deployment_environment": os.getenv("DEPLOYMENT_ENV", "development"),
                "extra_metadata": json.dumps(metadata) if metadata else None
            }
            client.lpush("logs_queue", json.dumps(data))
        except Exception:
            pass


# Pre-configured audit loggers
auth_logger = AuditLogger("auth")
jobs_logger = AuditLogger("jobs")
cv_logger = AuditLogger("cv")
search_logger = AuditLogger("search")