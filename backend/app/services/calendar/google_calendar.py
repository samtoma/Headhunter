from typing import List, Dict, Any
import os
from .base import CalendarProvider
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import datetime

class GoogleCalendarProvider(CalendarProvider):
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        # Ensure regex match or exact match in Google Console
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/settings/calendar/callback")
        
        # Scopes: Read/Write events
        self.scopes = ['https://www.googleapis.com/auth/calendar']
        
    def _get_client_config(self) -> Dict[str, Any]:
        """Construct client config dynamically from env vars."""
        return {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [self.redirect_uri]
            }
        }

    def get_auth_url(self, state: str) -> str:
        """Generate the Google OAuth consent URL."""
        if not self.client_id or not self.client_secret:
            raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")
            
        flow = Flow.from_client_config(
            self._get_client_config(),
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri
        
        authorization_url, _ = flow.authorization_url(
            access_type='offline', # Required for refresh token
            include_granted_scopes='true',
            state=state,
            prompt='consent' # Force consent to ensure refresh_token is returned
        )
        return authorization_url

    def exchange_code(self, code: str) -> Dict[str, Any]:
        """Exchange auth code for tokens."""
        if not self.client_id or not self.client_secret:
            raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")

        flow = Flow.from_client_config(
            self._get_client_config(),
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri
        
        # This will fetch the token from the code
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        return {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
            "expiry": creds.expiry.isoformat() if creds.expiry else None
        }

    def _get_credentials(self, access_token: str, refresh_token: str = None) -> Credentials:
        """Reconstruct Credentials object from stored tokens."""
        return Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.scopes
        )

    def list_events(self, access_token: str, refresh_token: str, time_min: str = None, time_max: str = None) -> List[Dict[str, Any]]:
        """List events from the primary calendar."""
        creds = self._get_credentials(access_token, refresh_token)
        
        # Auto-refresh if needed (handled by google library if request is used)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())

        service = build('calendar', 'v3', credentials=creds)
        
        # Default to now if not specified
        if not time_min:
            time_min = datetime.datetime.utcnow().isoformat() + 'Z'
            
        events_result = service.events().list(
            calendarId='primary', 
            timeMin=time_min,
            timeMax=time_max,
            maxResults=50, 
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        return events_result.get('items', [])

    def create_event(self, access_token: str, refresh_token: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new event."""
        creds = self._get_credentials(access_token, refresh_token)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            
        service = build('calendar', 'v3', credentials=creds)
        
        event = service.events().insert(calendarId='primary', body=event_data).execute()
        return event

    def get_user_email(self, access_token: str, refresh_token: str) -> str:
        """Fetch the email address of the connected account."""
        creds = self._get_credentials(access_token, refresh_token)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            
        service = build('oauth2', 'v2', credentials=creds)
        user_info = service.userinfo().get().execute()
        return user_info.get('email')
