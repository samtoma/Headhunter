"""
Comprehensive Logging Module for Headhunter AI

Features:
- Structured JSON logs with timestamp, action, component, company, user
- Daily log rotation with automatic cleanup
- File + console output
"""

import logging
import json
import os
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


def setup_logging(log_dir: str = "/app/logs", log_level: str = "INFO"):
    """
    Configure logging with daily rotation and JSON formatting.
    
    Args:
        log_dir: Directory for log files (default: /app/logs)
        log_level: Logging level (default: INFO)
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
            # If even local logs dir fails, disable file logging
            file_logging_enabled = False
    
    log_file = os.path.join(log_dir, "headhunter.log")
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []
    
    # File handler with daily rotation (keeps 1 day of logs)
    # Only add file handler if we have permission to write logs
    if file_logging_enabled:
        file_handler = TimedRotatingFileHandler(
            log_file,
            when="midnight",        # Rotate at midnight
            interval=1,             # Every 1 day
            backupCount=1,          # Keep only 1 backup (yesterday's log)
            encoding="utf-8"
        )
        file_handler.setFormatter(StructuredJSONFormatter())
        file_handler.suffix = "%Y-%m-%d"  # Add date suffix to rotated files
        root_logger.addHandler(file_handler)
    
    # Console handler for development/docker logs
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(StructuredJSONFormatter())
    root_logger.addHandler(console_handler)
    
    # Reduce noise from external libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Usage:
        logger = get_logger(__name__)
        logger.info("User logged in", extra={
            "action": "login",
            "user_id": 123,
            "company_id": 1
        })
    """
    return logging.getLogger(name)


class AuditLogger:
    """
    Structured audit logger for tracking user actions.
    Provides convenience methods for common operations.
    Also writes to SystemLog table for admin dashboard.
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
        """
        Log a user action with full context.
        Writes to both file logs and SystemLog table.
        
        Args:
            action: Action type (e.g., "login", "create_job", "upload_cv")
            message: Human-readable description
            user_id: User performing the action
            user_email: User's email
            company_id: Company context
            company_name: Company name
            **kwargs: Additional context (job_id, cv_id, etc.)
        """
        extra = {
            "action": action,
            "user_id": user_id,
            "user_email": user_email,
            "company_id": company_id,
            "company_name": company_name,
            **kwargs
        }
        # Filter out None values
        extra = {k: v for k, v in extra.items() if v is not None}
        
        # Log to file
        self.logger.info(message, extra=extra)
        
        # Also write to SystemLog table
        self._write_to_system_log(
            level="INFO",
            action=action,
            message=message,
            user_id=user_id,
            company_id=company_id,
            metadata=kwargs
        )
    
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
        
        # Log to file
        if error:
            self.logger.error(message, exc_info=error, extra=extra)
        else:
            self.logger.error(message, extra=extra)
        
        # Also write to SystemLog table
        error_type = type(error).__name__ if error else None
        error_message = str(error) if error else None
        import traceback
        stack_trace = traceback.format_exc() if error else None
        
        self._write_to_system_log(
            level="ERROR",
            action=action,
            message=message,
            user_id=kwargs.get("user_id"),
            company_id=kwargs.get("company_id"),
            error_type=error_type,
            error_message=error_message,
            stack_trace=stack_trace,
            metadata=kwargs
        )
    
    def _write_to_system_log(
        self,
        level: str,
        action: str,
        message: str,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        error_type: Optional[str] = None,
        error_message: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        """
        Write log entry to SystemLog table.
        Uses a separate database session to avoid transaction issues.
        """
        try:
            from app.core.database import SessionLocal
            from app.models.models import SystemLog
            import os
            
            db = SessionLocal()
            try:
                deployment_version = os.getenv("DEPLOYMENT_VERSION", os.getenv("GIT_COMMIT", None))
                deployment_environment = os.getenv("DEPLOYMENT_ENV", "development")
                
                system_log = SystemLog(
                    level=level,
                    component=self.component,
                    action=action,
                    message=message,
                    user_id=user_id,
                    company_id=company_id,
                    error_type=error_type,
                    error_message=error_message,
                    stack_trace=stack_trace,
                    extra_metadata=json.dumps(metadata) if metadata else None,
                    deployment_version=deployment_version,
                    deployment_environment=deployment_environment
                )
                db.add(system_log)
                db.commit()
            except Exception:
                db.rollback()
                # Don't log to avoid recursion - just fail silently
                pass
            finally:
                db.close()
        except Exception:
            # Fail silently if database logging is unavailable
            pass


# Pre-configured audit loggers for key components
auth_logger = AuditLogger("auth")
jobs_logger = AuditLogger("jobs")
cv_logger = AuditLogger("cv")
search_logger = AuditLogger("search")
