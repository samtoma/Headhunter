# 📅 Calendar Integration

> **Feature Status:** ✅ Available in v1.12.0
> **Supported Providers:** Google Calendar, Microsoft Outlook

## Overview

Headhunter AI provides two-way synchronization with major calendar providers to facilitate interview scheduling and availability detection.

## Architecture

The system uses a **Provider Pattern** to abstract different calendar APIs behind a common interface.

```python
# app/services/calendar/base.py
class CalendarProvider(ABC):
    @abstractmethod
    def get_auth_url(self) -> str: ...
    
    @abstractmethod
    def exchange_code(self, code: str) -> dict: ...
    
    @abstractmethod
    def list_events(self, access_token: str, ...) -> List[dict]: ...
```

### Components

1. **Backend Services** (`app/services/calendar/`):
    * `google_calendar.py`: Uses `google-api-python-client`.
    * `microsoft_calendar.py`: Uses Microsoft Graph API via `httpx`.
2. **API Endpoints** (`app/api/v1/calendars.py`):
    * Generic endpoints: `/connect/{provider}`, `/callback/{provider}`.
3. **Database** (`CalendarConnection` model):
    * Stores encrypted OAuth tokens (AES-256).
    * One-to-many relationship with Users.

## Configuration

To enable calendar features, add the following to your `.env` file:

### Google Calendar

1. Create a Project in Google Cloud Console.
2. Enable "Google Calendar API".
3. Create OAuth 2.0 Credentials.
    * **Redirect URI:** `http://localhost:3000/settings` (or your frontend settings URL).

```ini
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Microsoft Outlook

1. Register an App in Azure Portal (App Registrations).
2. Add Platform "Web".
    * **Redirect URI:** `http://localhost:3000/settings` (or your frontend settings URL).
3. API Permissions: `User.Read`, `Calendars.ReadWrite`, `offline_access`.

```ini
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common  # Optional, defaults to common
```

## Security Profiles

* **Encryption:** All `access_token` and `refresh_token` values are encrypted at rest using Fernet (symmetric encryption).
* **Scopes:**
  * Google: `https://www.googleapis.com/auth/calendar`
  * Microsoft: `Calendars.ReadWrite`

## Troubleshooting

* **"Redirect mismatch"**: Ensure the Redirect URI in your `.env` and Google/Azure console matches exactly the URL where your frontend is hosted + the callback path (or where the frontend handles the code). Currently, the backend expects the frontend to handle the callback and POST the code.
