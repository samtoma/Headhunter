from typing import List, Dict, Any
import os
import httpx
from .base import CalendarProvider
import datetime

class MicrosoftCalendarProvider(CalendarProvider):
    def __init__(self):
        self.client_id = os.getenv("MICROSOFT_CLIENT_ID")
        self.client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")
        self.redirect_uri = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:5173/settings/calendar/callback-microsoft") 
        self.tenant_id = os.getenv("MICROSOFT_TENANT_ID", "common")
        
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.graph_url = "https://graph.microsoft.com/v1.0"
        self.scopes = ["Calendars.ReadWrite", "offline_access", "User.Read"]

    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "response_mode": "query",
            "scope": " ".join(self.scopes),
            "state": state
        }
        import urllib.parse
        query = urllib.parse.urlencode(params)
        return f"{self.authority}/oauth2/v2.0/authorize?{query}"

    def exchange_code(self, code: str) -> Dict[str, Any]:
        url = f"{self.authority}/oauth2/v2.0/token"
        data = {
            "client_id": self.client_id,
            "scope": " ".join(self.scopes),
            "code": code,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "client_secret": self.client_secret
        }
        
        with httpx.Client() as client:
            resp = client.post(url, data=data)
            resp.raise_for_status()
            return resp.json()

    def get_user_email(self, access_token: str, refresh_token: str) -> str:
        # Check if access token works, else might need refresh (not implemented here, assumed fresh from code exchange usually)
        # But if calling later, might need refresh.
        headers = {"Authorization": f"Bearer {access_token}"}
        with httpx.Client() as client:
            resp = client.get(f"{self.graph_url}/me", headers=headers)
            if resp.status_code == 401:
                # Need refresh logic available publically or internally?
                # For now assume mostly used on callback
                raise Exception("Token expired")
            resp.raise_for_status()
            data = resp.json()
            return data.get("mail") or data.get("userPrincipalName")

    def list_events(self, access_token: str, refresh_token: str, time_min: str = None, time_max: str = None) -> List[Dict[str, Any]]:
        # TODO: Handle token refresh if 401
        headers = {"Authorization": f"Bearer {access_token}", "Prefer": "outlook.timezone=\"UTC\""}
        
        params = {
            "$top": 50,
            "$select": "subject,start,end,organizer",
            "$orderby": "start/dateTime"
        }
        if time_min:
            params["startDateTime"] = time_min
        if time_max:
            params["endDateTime"] = time_max

        # If time_min/max provided, we should use /calendarView?startDateTime=...&endDateTime=...
        # /events just lists events, /calendarView expands recurring ones.
        # Google assumes singleEvents=True which is like calendarView.
        endpoint = f"{self.graph_url}/me/calendarView" if (time_min and time_max) else f"{self.graph_url}/me/events"
        
        if not (time_min and time_max) and endpoint.endswith("calendarView"):
             # View requires dates
             # Default to now + 30 days
             now = datetime.datetime.utcnow()
             params["startDateTime"] = now.isoformat() + "Z"
             params["endDateTime"] = (now + datetime.timedelta(days=30)).isoformat() + "Z"

        with httpx.Client() as client:
            resp = client.get(endpoint, headers=headers, params=params)
            # If 401, try to refresh... (Complex without callback to save DB)
            resp.raise_for_status()
            data = resp.json()
            
            # Map to common format? Or return raw?
            # Google Returns: { summary, start: { dateTime }, end: { dateTime } }
            # Microsoft Returns: { subject, start: { dateTime, timeZone }, end: { dateTime, timeZone } }
            # Ideally normalize.
            return data.get("value", [])

    def create_event(self, access_token: str, refresh_token: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {access_token}"}
        # Data format might differ from Google.
        # Google: summary, description, start: { dateTime }, end: { dateTime }
        # Microsoft: subject, body: { content }, start: { dateTime, timeZone }, end: { dateTime, timeZone }
        
        # We need a transformation layer in Manager or here.
        # For now, accept Microsoft format or try to adapt.
        ms_event = {
            "subject": event_data.get("summary") or event_data.get("subject"),
            "start": event_data.get("start"), # Ensure timeZone is present
            "end": event_data.get("end")
        }
        
        with httpx.Client() as client:
            resp = client.post(f"{self.graph_url}/me/events", headers=headers, json=ms_event)
            resp.raise_for_status()
            return resp.json()
