from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class CalendarProvider(ABC):
    """Abstract base class for calendar providers (Google, Microsoft, etc.)"""
    
    @abstractmethod
    def get_auth_url(self, state: str) -> str:
        """Generate OAuth authorization URL."""
        pass
        
    @abstractmethod
    def exchange_code(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens."""
        pass
        
    @abstractmethod
    def list_events(self, access_token: str, time_min: str, time_max: str) -> List[Dict[str, Any]]:
        """List calendar events."""
        pass
        
    @abstractmethod
    def create_event(self, access_token: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new calendar event."""
        pass

    @abstractmethod
    def get_user_email(self, access_token: str, refresh_token: str) -> str:
        """Fetch the connected user's email."""
        pass
