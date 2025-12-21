"""
Request/Response Logging Middleware

Tracks all API requests and responses, including:
- Request method, path, headers
- Response status, timing
- User context
- Errors and exceptions
"""

import time
import uuid
import json
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import SystemLog
from app.core.logging import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses to SystemLog table.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Extract request info
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Get user from request state (set by auth middleware if authenticated)
        user_id = None
        company_id = None
        if hasattr(request.state, "user") and request.state.user:
            user_id = request.state.user.id
            company_id = request.state.user.company_id
        
        # Skip logging for health checks and static files
        skip_paths = ["/health", "/metrics", "/docs", "/openapi.json", "/redoc", "/favicon.ico"]
        should_log = not any(path.startswith(skip) for skip in skip_paths)
        
        # Prepare metadata
        metadata = {
            "request_id": request_id,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers)
        }
        
        # Remove sensitive headers
        sensitive_headers = ["authorization", "cookie", "x-api-key"]
        for header in sensitive_headers:
            if header in metadata["headers"]:
                metadata["headers"][header] = "[REDACTED]"
        
        error_type = None
        error_message = None
        stack_trace = None
        http_status = 200
        
        try:
            # Process request
            response = await call_next(request)
            http_status = response.status_code
            
            # Calculate response time
            process_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Log to SystemLog if should_log
            if should_log:
                self._log_to_database(
                    level="INFO" if http_status < 400 else "ERROR",
                    component="api",
                    action=f"{method.lower()}_{path.replace('/', '_').strip('_')}",
                    message=f"{method} {path} - {http_status}",
                    user_id=user_id,
                    company_id=company_id,
                    request_id=request_id,
                    http_method=method,
                    http_path=path,
                    http_status=http_status,
                    response_time_ms=int(process_time),
                    ip_address=client_ip,
                    user_agent=user_agent,
                    metadata=json.dumps(metadata)
                )
            
            return response
            
        except Exception as e:
            # Calculate response time even on error
            process_time = (time.time() - start_time) * 1000
            
            # Extract error info
            error_type = type(e).__name__
            error_message = str(e)
            import traceback
            stack_trace = traceback.format_exc()
            http_status = 500
            
            # Log error to SystemLog
            if should_log:
                self._log_to_database(
                    level="ERROR",
                    component="api",
                    action=f"{method.lower()}_error",
                    message=f"{method} {path} - Error: {error_message}",
                    user_id=user_id,
                    company_id=company_id,
                    request_id=request_id,
                    http_method=method,
                    http_path=path,
                    http_status=http_status,
                    response_time_ms=int(process_time),
                    ip_address=client_ip,
                    user_agent=user_agent,
                    error_type=error_type,
                    error_message=error_message,
                    stack_trace=stack_trace,
                    metadata=json.dumps(metadata)
                )
            
            # Re-raise the exception
            raise
    
    def _log_to_database(
        self,
        level: str,
        component: str,
        action: str,
        message: str,
        user_id: int = None,
        company_id: int = None,
        request_id: str = None,
        http_method: str = None,
        http_path: str = None,
        http_status: int = None,
        response_time_ms: int = None,
        ip_address: str = None,
        user_agent: str = None,
        error_type: str = None,
        error_message: str = None,
        stack_trace: str = None,
        metadata: str = None
    ):
        """
        Write log entry to SystemLog table.
        Uses a separate database session to avoid transaction issues.
        """
        try:
            db: Session = SessionLocal()
            try:
                # Get deployment version from environment
                import os
                deployment_version = os.getenv("DEPLOYMENT_VERSION", os.getenv("GIT_COMMIT", None))
                deployment_environment = os.getenv("DEPLOYMENT_ENV", "development")
                
                system_log = SystemLog(
                    level=level,
                    component=component,
                    action=action,
                    message=message,
                    user_id=user_id,
                    company_id=company_id,
                    request_id=request_id,
                    http_method=http_method,
                    http_path=http_path,
                    http_status=http_status,
                    response_time_ms=response_time_ms,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    error_type=error_type,
                    error_message=error_message,
                    stack_trace=stack_trace,
                    extra_metadata=metadata,
                    deployment_version=deployment_version,
                    deployment_environment=deployment_environment
                )
                db.add(system_log)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to write system log to database: {e}", exc_info=True)
            finally:
                db.close()
        except Exception as e:
            # Fallback to file logging if database logging fails
            logger.error(f"Failed to create database session for logging: {e}", exc_info=True)

