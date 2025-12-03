import pytest
from unittest.mock import patch, AsyncMock
from app.services.search.chroma import ChromaSearchEngine

@pytest.fixture
def mock_chroma_client():
    with patch("chromadb.HttpClient") as mock:
        yield mock

@pytest.fixture
def mock_generate_embedding():
    with patch("app.services.search.chroma.generate_embedding", new_callable=AsyncMock) as mock:
        yield mock

def test_init_success(mock_chroma_client):
    """Test successful initialization."""
    engine = ChromaSearchEngine()
    assert engine.client is not None
    assert engine.collection is not None
    mock_chroma_client.assert_called_once()

def test_init_failure(mock_chroma_client):
    """Test initialization failure."""
    mock_chroma_client.side_effect = Exception("Connection failed")
    engine = ChromaSearchEngine()
    assert engine.client is None
    assert engine.collection is None

@pytest.mark.asyncio
async def test_index_candidate_success(mock_chroma_client, mock_generate_embedding):
    """Test successful candidate indexing."""
    engine = ChromaSearchEngine()
    mock_generate_embedding.return_value = [0.1, 0.2, 0.3]
    
    result = await engine.index_candidate("123", "text", {"key": "val"})
    
    assert result is True
    engine.collection.upsert.assert_called_once()

@pytest.mark.asyncio
async def test_index_candidate_no_collection(mock_chroma_client):
    """Test indexing with no collection."""
    mock_chroma_client.side_effect = Exception("Fail")
    engine = ChromaSearchEngine()
    
    result = await engine.index_candidate("123", "text", {})
    assert result is False

@pytest.mark.asyncio
async def test_index_candidate_embedding_fail(mock_chroma_client, mock_generate_embedding):
    """Test indexing when embedding generation fails."""
    engine = ChromaSearchEngine()
    mock_generate_embedding.return_value = None
    
    result = await engine.index_candidate("123", "text", {})
    assert result is False
    engine.collection.upsert.assert_not_called()

@pytest.mark.asyncio
async def test_search_success(mock_chroma_client, mock_generate_embedding):
    """Test successful search."""
    engine = ChromaSearchEngine()
    mock_generate_embedding.return_value = [0.1, 0.2]
    
    # Mock query results
    engine.collection.query.return_value = {
        'ids': [['1', '2']],
        'metadatas': [[{'name': 'A'}, {'name': 'B'}]],
        'distances': [[0.1, 0.2]]
    }
    
    results = await engine.search("query")
    
    assert len(results) == 2
    assert results[0]['id'] == '1'
    assert results[0]['score'] == 0.9 # 1.0 - 0.1

@pytest.mark.asyncio
async def test_search_no_collection(mock_chroma_client):
    """Test search with no collection."""
    mock_chroma_client.side_effect = Exception("Fail")
    engine = ChromaSearchEngine()
    results = await engine.search("query")
    assert results == []

def test_delete_candidate_success(mock_chroma_client):
    """Test successful deletion."""
    engine = ChromaSearchEngine()
    result = engine.delete_candidate("123")
    assert result is True
    engine.collection.delete.assert_called_once_with(ids=["123"])

def test_upsert_success(mock_chroma_client):
    """Test successful upsert."""
    engine = ChromaSearchEngine()
    result = engine.upsert(["1"], ["doc"], [{}], [[0.1]])
    assert result is True
    engine.collection.upsert.assert_called_once()
