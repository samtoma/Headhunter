import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.embeddings import generate_embedding

@pytest.mark.asyncio
async def test_generate_embedding_success():
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1, 0.2, 0.3])]
    mock_client.embeddings.create.return_value = mock_response
    
    with patch("app.services.embeddings.get_openai_client", return_value=mock_client):
        embedding = await generate_embedding("test text")
        assert embedding == [0.1, 0.2, 0.3]
        
        # Verify call arguments
        mock_client.embeddings.create.assert_called_once()
        call_args = mock_client.embeddings.create.call_args
        assert call_args.kwargs["input"] == "test text"
        assert call_args.kwargs["model"] == "text-embedding-3-small"

@pytest.mark.asyncio
async def test_generate_embedding_truncation():
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1])]
    mock_client.embeddings.create.return_value = mock_response
    
    long_text = "a" * 40000 # > 32000
    
    with patch("app.services.embeddings.get_openai_client", return_value=mock_client):
        await generate_embedding(long_text)
        
        # Verify truncation
        call_args = mock_client.embeddings.create.call_args
        assert len(call_args.kwargs["input"]) == 32000

@pytest.mark.asyncio
async def test_generate_embedding_error():
    mock_client = AsyncMock()
    mock_client.embeddings.create.side_effect = Exception("API Error")
    
    with patch("app.services.embeddings.get_openai_client", return_value=mock_client):
        embedding = await generate_embedding("test")
        assert embedding == []
