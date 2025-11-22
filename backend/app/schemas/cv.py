from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
import json

def parse_json_field(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except:
            return [v] if v else []
    return v

class ParsedCVOut(BaseModel):
    name: Optional[str] = None
    last_job_title: Optional[str] = None
    last_company: Optional[str] = None
    
    # New Personal Info
    address: Optional[str] = None
    age: Optional[int] = None
    marital_status: Optional[str] = None
    military_status: Optional[str] = None
    bachelor_year: Optional[int] = None
    
    email: Optional[List[str]] = []
    phone: Optional[List[str]] = []
    social_links: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    
    # Structured Lists
    education: Optional[List[Dict[str, Any]]] = []
    job_history: Optional[List[Dict[str, Any]]] = []
    
    experience_years: Optional[int] = 0

    class Config:
        from_attributes = True

    @field_validator('skills', 'social_links', 'education', 'job_history', 'email', 'phone', mode='before')
    @classmethod
    def parse_json(cls, v):
        return parse_json_field(v)

class CVResponse(BaseModel):
    id: int
    filename: str
    filepath: str
    uploaded_at: datetime
    is_parsed: bool
    parsed_data: Optional[ParsedCVOut] = None
    
    projected_experience: Optional[int] = 0
    is_outdated: bool = False
    years_since_upload: float = 0.0

    class Config:
        from_attributes = True