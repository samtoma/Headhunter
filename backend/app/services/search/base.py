from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class SearchEngine(ABC):
    """Abstract base class for search engine implementations."""

    @abstractmethod
    def index_candidate(self, candidate_id: str, text: str, metadata: Dict[str, Any]) -> bool:
        """
        Index a candidate's CV content.
        
        Args:
            candidate_id: Unique identifier for the candidate (usually CV ID).
            text: The text content to index (or rich text representation).
            metadata: Additional metadata to store (name, skills, etc.).
            
        Returns:
            bool: True if successful, False otherwise.
        """
        pass

    @abstractmethod
    def search(self, query_text: str, n_results: int = 10, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Search for candidates matching the query.
        
        Args:
            query_text: The semantic query text (e.g., job description or skills).
            n_results: Number of results to return.
            filters: Optional filters (e.g., department, company_id).
            
        Returns:
            List[Dict]: List of matching candidates with scores and metadata.
        """
        pass

    @abstractmethod
    def delete_candidate(self, candidate_id: str) -> bool:
        """
        Remove a candidate from the index.
        
        Args:
            candidate_id: The ID of the candidate to remove.
            
        Returns:
            bool: True if successful, False otherwise.
        """
        pass
