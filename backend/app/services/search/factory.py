from app.services.search.base import SearchEngine
from app.services.search.chroma import ChromaSearchEngine

_search_engine_instance = None

def get_search_engine() -> SearchEngine:
    """
    Factory function to get the configured search engine instance.
    Currently returns ChromaSearchEngine.
    """
    global _search_engine_instance
    if _search_engine_instance is None:
        _search_engine_instance = ChromaSearchEngine()
    return _search_engine_instance
