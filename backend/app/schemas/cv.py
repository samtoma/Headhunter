from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Dict, Union
from datetime import datetime
import json

# --- ROBUST JSON FIELD PARSER ---
def parse_json_field(v):
    """
    Robustly parses JSON fields, handling:
    1. Normal Lists
    2. JSON Strings
    3. Double-Encoded JSON Strings (The cause of your crash)
    """
    if v is None: return []
    if isinstance(v, list): return v
    
    if isinstance(v, str):
        if not v.strip(): return []
        try: 
            parsed = json.loads(v)
            
            # Handle Double Encoding (String inside String)
            if isinstance(parsed, str):
                try:
                    parsed = json.loads(parsed)
                except:
                    # It was just a plain string, wrap it
                    return [parsed]
            
            if isinstance(parsed, list): return parsed
            if parsed is None: return []
            return [str(parsed)]
        except:
            # If parsing fails completely, treat as a single text item
            return [v]
            
    return [str(v)]

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
    summary: Optional[str] = None 
    last_job_title: Optional[str] = None
    last_company: Optional[str] = None
    address: Optional[str] = None
    age: Optional[int] = None
    marital_status: Optional[str] = None
    military_status: Optional[str] = None
    bachelor_year: Optional[int] = None
    
    # Allow flexible inputs, the validator will clean them
    email: Optional[Union[List[str], str]] = []
    phone: Optional[Union[List[str], str]] = []
    social_links: Optional[Union[List[str], str]] = []
    skills: Optional[Union[List[str], str]] = []
    
    education: List[Dict[str, Any]] = []
    job_history: List[Dict[str, Any]] = []
    experience_years: Optional[int] = 0
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None

    class Config: from_attributes = True

    # Apply robust validator to all list fields
    @field_validator('skills', 'social_links', 'email', 'phone', 'education', 'job_history', mode='before')
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
    experience_years: Optional[int] = None
    age: Optional[int] = None
    name: Optional[str] = None
    address: Optional[str] = None
    summary: Optional[str] = None
    
    skills: Optional[Union[List[str], str]] = None
    email: Optional[Union[List[str], str]] = None
    phone: Optional[Union[List[str], str]] = None

    @field_validator('skills', 'email', 'phone', mode='before')
    @classmethod
    def to_json_string(cls, v):
        if v is None: return None
        if isinstance(v, str): return v 
        return json.dumps(v)

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None

class AssignJob(BaseModel):
    candidate_id: int
    job_id: int