import logging
import time
from typing import List, Optional
from app.services.parser import get_openai_client
from app.core.llm_logging import LLMLogger

logger = logging.getLogger(__name__)

async def generate_embedding(text: str, cv_id: Optional[int] = None, company_id: Optional[int] = None, user_id: Optional[int] = None) -> List[float]:
    """Generate embedding for a single string."""
    start_time = time.time()
    model = "text-embedding-3-small"
    tokens_used = 0
    tokens_input = 0
    tokens_output = 0

    try:
        client = get_openai_client()
        # Ensure text is not too long for the model
        # text-embedding-3-small has 8191 token limit
        # Simple truncation by chars (approx 4 chars per token -> ~32k chars)
        truncated_text = text[:32000]

        response = await client.embeddings.create(
            input=truncated_text,
            model=model
        )

        # Track token usage
        if hasattr(response, 'usage') and response.usage:
            tokens_used = response.usage.total_tokens

        # For embeddings, input and output are the same
        tokens_input = tokens_used
        tokens_output = 0

        # Log LLM operation
        latency_ms = int((time.time() - start_time) * 1000)
        LLMLogger.log_llm_operation(
            action="generate_embedding",
            message=f"Generated embedding for CV {cv_id}" if cv_id else "Generated embedding",
            user_id=user_id,
            company_id=company_id,
            model=model,
            tokens_used=tokens_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            streaming=False,
            metadata={"cv_id": cv_id, "text_length": len(truncated_text), "model": model}
        )

        return response.data[0].embedding
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        logger.error(f"Error generating embedding: {e}")
        LLMLogger.log_llm_operation(
            action="generate_embedding_error",
            message=f"Error generating embedding: {str(e)}",
            user_id=user_id,
            company_id=company_id,
            model=model,
            tokens_used=tokens_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            error_type=type(e).__name__,
            error_message=str(e),
            metadata={"cv_id": cv_id, "text_length": len(text)}
        )
        return []
