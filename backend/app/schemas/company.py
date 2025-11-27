from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class CompanyBase(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    culture: Optional[str] = None
    interview_stages: Optional[str] = None # JSON string

class CompanyUpdate(CompanyBase):
    pass

class CompanyOut(CompanyBase):
    id: int
    domain: str
    user_count: int = 0
    job_count: int = 0
    
    class Config:
        orm_mode = True
