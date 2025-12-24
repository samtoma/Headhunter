"""
Request/Response Logging Middleware

Tracks all API requests and responses, including:
- Request method, path, headers
- Response status, timing
- User context
- Errors and exceptions

Uses background threading to avoid blocking request processing.
"""

import time
import uuid
import json
import redis
from typing import Callable
from concurrent.futures import ThreadPoolExecutor
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Redis setup for async logging
try:
    redis_client = redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True
    )
    redis_available = True
except Exception as e:
    logger.warning(f"Redis not available for logging middleware: {e}")
    redis_client = None
    redis_available = False

# Queue name (must match worker)
LOGS_QUEUE = "logs_queue"

# Thread pool for non-blocking Redis ops
# Size is configurable via LOG_THREAD_POOL_SIZE env var (default: 2)
_log_executor = ThreadPoolExecutor(
    max_workers=settings.LOG_THREAD_POOL_SIZE, 
    thread_name_prefix="log_producer"
)

def shutdown_log_executor():
    """Gracefully shutdown the log executor. Called during application shutdown."""
    _log_executor.shutdown(wait=True, timeout=5)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses to Redis Queue.
    Strictly asynchronous and decoupled from the Database.
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
        user_agent = request.headers.get("user-agent", None)
        
        # Get user from request state (set by auth middleware if authenticated)
        user_id = None
        company_id = None
        if hasattr(request.state, "user") and request.state.user:
            user_id = request.state.user.id
            company_id = request.state.user.company_id
        
        # Skip logging for health checks and static files
        skip_paths = ["/health", "/metrics", "/docs", "/openapi.json", "/redoc", "/favicon.ico"]
        
        # Check if this is an LLM endpoint (exclude from API logging)
        # These endpoints use LLM and should be logged separately with component="llm"
        is_llm_endpoint = (
            "generate-feedback" in path or
            "stream-feedback" in path or
            path.startswith("/api/ai/") or
            "/company/regenerate" in path or
            "/departments/generate" in path or
            "/jobs/analyze" in path or
            "/jobs/analyze/stream" in path or
            "/jobs/" in path and "/regenerate" in path
        )
        
        # Skip LLM endpoints from normal API logging
        should_log = not any(path.startswith(skip) for skip in skip_paths) and not is_llm_endpoint
        
        # Prepare metadata (captured early)
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
        
        # Initialize context vars
        error_type = None
        error_message = None
        stack_trace = None
        http_status = 200
        
        try:
            # Process request
            response = await call_next(request)
            http_status = response.status_code
            
            # Calculate response time
            process_time = (time.time() - start_time) * 1000
            
            # Log success/failure (HTTP level)
            if should_log:
                # Generate action name - sanitize and limit length
                action_name = f"{method.lower()}_{path.replace('/', '_').strip('_')}"
                # Limit action name to 100 chars to prevent issues
                if len(action_name) > 100:
                    action_name = action_name[:97] + "..."
                
                self._queue_log(
                    level="INFO" if http_status < 400 else "ERROR",
                    component="api",
                    action=action_name,
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
                    extra_metadata=json.dumps(metadata),
                    timestamp=time.time()
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
            
            # Log error
            if should_log:
                # Generate action name for errors
                action_name = f"{method.lower()}_error"
                # Limit action name to 100 chars
                if len(action_name) > 100:
                    action_name = action_name[:97] + "..."
                
                self._queue_log(
                    level="ERROR",
                    component="api",
                    action=action_name,
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
                    extra_metadata=json.dumps(metadata),
                    timestamp=time.time()
                )
            
            # Re-raise the exception
            raise
    
    def _queue_log(self, **kwargs):
        """
        Submit log dictionary to Redis queue via thread pool.
        """
        if not redis_available or not redis_client:
            return

        # Prepare payload
        import os
        deployment_version = os.getenv("DEPLOYMENT_VERSION", os.getenv("GIT_COMMIT", settings.VERSION))
        deployment_environment = os.getenv("DEPLOYMENT_ENV", "development")
        
        payload = {
            "log_type": "system", # Distinguish from "llm" if needed, though structure is similar
            "deployment_version": deployment_version,
            "deployment_environment": deployment_environment,
            **kwargs
        }

        _log_executor.submit(self._push_to_redis, payload)

    def _push_to_redis(self, payload: dict):
        try:
            redis_client.lpush(LOGS_QUEUE, json.dumps(payload))
        except Exception as e:
            # Fail silently to avoid breaking the app, just log to stderr/file
            logger.error(f"Failed to push log to Redis: {e}")
