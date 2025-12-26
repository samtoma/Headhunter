from pydantic import BaseModel, Field
from typing import List, Optional

class CalendarEventDateTime(BaseModel):
    dateTime: str = Field(..., description="ISO 8601 date-time string")
    timeZone: Optional[str] = None

class CalendarAttendee(BaseModel):
    email: str
    displayName: Optional[str] = None
    responseStatus: Optional[str] = None

class CalendarEventCreate(BaseModel):
    summary: str
    location: Optional[str] = None
    description: Optional[str] = None
    start: CalendarEventDateTime
    end: CalendarEventDateTime
    attendees: Optional[List[CalendarAttendee]] = None
    
    # Allow extra fields for provider-specific data, but validate the core ones
    model_config = {
        "extra": "allow"
    }
