from pydantic import BaseModel, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime
import json

class JobCreate(BaseModel):
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    required_experience: Optional[int] = 0
    skills_required: Optional[List[str]] = []
    
    # Structured Fields
    responsibilities: Optional[List[str]] = [] # CFA
    qualifications: Optional[List[str]] = [] # Essential
    preferred_qualifications: Optional[List[str]] = [] # Desirable
    benefits: Optional[List[str]] = []
    
    status: Optional[str] = "Open"

    @field_validator('skills_required', 'responsibilities', 'qualifications', 'preferred_qualifications', 'benefits', mode='before')
    @classmethod
    def parse_list_fields(cls, v):
        if isinstance(v, str):
            try: 
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except Exception:
                return []
        return v if isinstance(v, list) else []

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    required_experience: Optional[int] = None
    skills_required: Optional[List[str]] = None
    
    responsibilities: Optional[List[str]] = None
    qualifications: Optional[List[str]] = None
    preferred_qualifications: Optional[List[str]] = None
    benefits: Optional[List[str]] = None

class JobOut(BaseModel):
    id: int
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    modified_at: Optional[datetime] = None
    candidate_count: int = 0
    is_active: bool = True
    status: str = "Open"
    required_experience: int = 0
    skills_required: List[str] = []
    
    responsibilities: List[str] = []
    qualifications: List[str] = []
    preferred_qualifications: List[str] = []
    benefits: List[str] = []
    
    # Audit fields
    created_by: Optional[int] = None
    modified_by: Optional[int] = None
    created_by_name: Optional[str] = None
    modified_by_name: Optional[str] = None

    @field_validator('skills_required', 'responsibilities', 'qualifications', 'preferred_qualifications', 'benefits', mode='before')
    @classmethod
    def parse_list_fields_out(cls, v):
        if isinstance(v, str):
            try: 
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except Exception:
                return []
        return v if isinstance(v, list) else []

    model_config = ConfigDict(from_attributes=True)

class CandidateMatch(BaseModel):
    id: int
    name: str
    score: int
    skills_matched: List[str]
    status: str
    
class BulkAssignRequest(BaseModel):
    job_id: int
    cv_ids: List[int]
