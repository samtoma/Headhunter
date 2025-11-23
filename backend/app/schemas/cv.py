from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
import json

def parse_json_field(v):
    if isinstance(v, str):
        try: return json.loads(v)
        except: return []
    return v

class ApplicationOut(BaseModel):
    id: int
    job_id: int
    status: str
    rating: Optional[int] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    notes: Optional[str] = None
    applied_at: datetime
    class Config: from_attributes = True

class ParsedCVOut(BaseModel):
    name: Optional[str] = None
    summary: Optional[str] = None # <--- Added Summary
    last_job_title: Optional[str] = None
    last_company: Optional[str] = None
    address: Optional[str] = None
    age: Optional[int] = None
    marital_status: Optional[str] = None
    military_status: Optional[str] = None
    bachelor_year: Optional[int] = None
    email: List[str] = []
    phone: List[str] = []
    social_links: List[str] = []
    skills: List[str] = []
    education: List[Dict[str, Any]] = []
    job_history: List[Dict[str, Any]] = []
    experience_years: Optional[int] = 0
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None

    class Config: from_attributes = True

    @field_validator('skills', 'social_links', 'education', 'job_history', 'email', 'phone', mode='before')
    @classmethod
    def parse_json(cls, v): return parse_json_field(v)

class CVResponse(BaseModel):
    id: int
    filename: str
    filepath: str
    uploaded_at: datetime
    is_parsed: bool
    parsed_data: Optional[ParsedCVOut] = None
    applications: List[ApplicationOut] = []
    projected_experience: Optional[int] = 0
    is_outdated: bool = False
    years_since_upload: float = 0.0
    class Config: from_attributes = True

class UpdateProfile(BaseModel):
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    
class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None

class AssignJob(BaseModel):
    candidate_id: int
    job_id: int