"""
LLM-Specific Logging Module

Dedicated logging for LLM operations with special tracking:
- Model used
- Tokens consumed
- Latency
- Streaming status
- Operation type

These logs are separate from regular API logging.
"""

import json
import time
from typing import Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import redis
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# LLM logging queue name
LLM_LOG_QUEUE = "logs_queue"  # Renamed for unified logging

# Initialize Redis client
try:
    # Use unified REDIS_URL from settings
    redis_client = redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True
    )
    redis_client.ping() # Fail fast if invalid
    redis_available = True
except Exception as e:
    logger.warning(f"Redis not available for LLM logging: {e}")
    redis_client = None
    redis_available = False

# Thread pool for non-blocking Redis writes
_llm_log_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="llm_log_writer")


class LLMLogger:
    """
    Logger for LLM operations with special tracking.
    Logs to SystemLog with component="llm".
    """
    
    @staticmethod
    def log_llm_operation(
        action: str,
        message: str,
        user_id: Optional[int] = None,
        company_id: Optional[int] = None,
        interview_id: Optional[int] = None,
        model: Optional[str] = None,
        tokens_used: Optional[int] = None,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        latency_ms: Optional[int] = None,
        streaming: bool = False,
        error_type: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log an LLM operation to SystemLog.
        
        Args:
            action: Action name (e.g., "generate_feedback", "stream_feedback")
            message: Human-readable message
            user_id: User who triggered the operation
            company_id: Company context
            interview_id: Interview ID if applicable
            model: OpenAI model used (e.g., "gpt-4o-mini")
            tokens_used: Total number of tokens consumed (for backward compatibility)
            tokens_input: Number of input/prompt tokens
            tokens_output: Number of output/completion tokens
            latency_ms: Operation latency in milliseconds
            streaming: Whether streaming was used
            error_type: Error type if operation failed
            error_message: Error message if operation failed
            metadata: Additional metadata dict
        """
        # Calculate tokens_used if not provided but input/output are
        if tokens_used is None and tokens_input is not None and tokens_output is not None:
            tokens_used = tokens_input + tokens_output
        
        # Prepare metadata JSON
        llm_metadata = {
            "interview_id": interview_id,
            "model": model,
            "tokens_used": tokens_used,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "latency_ms": latency_ms,
            "streaming": streaming
        }
        
        # Calculate cost if model and tokens are available
        if model and tokens_input is not None and tokens_output is not None:
            cost = LLMLogger._calculate_cost(model, tokens_input, tokens_output)
            if cost:
                llm_metadata["cost_usd"] = round(cost, 6)
        
        if metadata:
            llm_metadata.update(metadata)
        
        # Determine log level
        level = "ERROR" if error_type else "INFO"
        
        # Submit to Redis queue for non-blocking execution
        log_data = {
            "log_type": "llm",  # Explicitly mark as LLM log for unified worker
            "level": level,
            "action": action,
            "message": message,
            "user_id": user_id,
            "company_id": company_id,
            "interview_id": interview_id,  # Include interview_id in top-level payload too
            "error_type": error_type,
            "error_message": error_message,
            "metadata": json.dumps(llm_metadata),
            "timestamp": time.time()
        }

        _llm_log_executor.submit(
            LLMLogger._queue_llm_log,
            log_data
        )

    @staticmethod
    def _queue_llm_log(log_data: Dict[str, Any]):
        """
        Queue LLM log to Redis for async processing.
        NEVER write directly to main DB - that defeats the Redis caching architecture.
        """
        try:
            if redis_available and redis_client:
                # Queue to Redis for async processing to separate analytics DB
                redis_client.lpush(LLM_LOG_QUEUE, json.dumps(log_data))
            else:
                # Redis unavailable - log warning but DON'T write to main DB
                # This preserves the separation of concerns architecture
                logger.warning("Redis unavailable for LLM logging - analytics data will be lost until Redis is restored")
                logger.warning("This is expected behavior to keep main DB lightweight")
        except Exception as e:
            logger.error(f"Failed to queue LLM log to Redis: {e}", exc_info=True)
            # Don't fallback to main DB - that defeats the architecture purpose
    
    @staticmethod
    def _calculate_cost(model: str, tokens_input: int, tokens_output: int) -> Optional[float]:
        """
        Calculate cost in USD based on model and token usage.
        Pricing as of 2024 (update as needed).
        """
        # Pricing per 1M tokens (input, output)
        pricing = {
            "gpt-4o-mini": (0.15, 0.60),  # $0.15/$0.60 per 1M tokens
            "gpt-4o": (5.00, 15.00),      # $5/$15 per 1M tokens
            "gpt-4-turbo": (10.00, 30.00), # $10/$30 per 1M tokens
            "gpt-4": (30.00, 60.00),      # $30/$60 per 1M tokens
            "gpt-3.5-turbo": (0.50, 1.50), # $0.50/$1.50 per 1M tokens
            "text-embedding-3-small": (0.02, 0.02),  # $0.02 per 1M tokens (same for input/output)
            "text-embedding-ada-002": (0.10, 0.10),  # $0.10 per 1M tokens
        }
        
        if model not in pricing:
            return None
        
        input_price, output_price = pricing[model]
        cost = (tokens_input / 1_000_000 * input_price) + (tokens_output / 1_000_000 * output_price)
        return cost

