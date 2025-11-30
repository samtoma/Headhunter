import logging
from typing import List
from app.services.parser import get_openai_client

logger = logging.getLogger(__name__)

async def generate_embedding(text: str) -> List[float]:
    """Generate embedding for a single string."""
    try:
        client = get_openai_client()
        # Ensure text is not too long for the model
        # text-embedding-3-small has 8191 token limit
        # Simple truncation by chars (approx 4 chars per token -> ~32k chars)
        truncated_text = text[:32000]
        
        response = await client.embeddings.create(
            input=truncated_text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return []
