from pydantic import BaseModel, ConfigDict
from typing import Optional

class CompanyBase(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    culture: Optional[str] = None
    interview_stages: Optional[str] = None # JSON string
    
    # LinkedIn-style enhanced fields
    tagline: Optional[str] = None
    founded_year: Optional[int] = None
    company_size: Optional[str] = None
    headquarters: Optional[str] = None
    company_type: Optional[str] = None
    specialties: Optional[str] = None  # JSON string
    mission: Optional[str] = None
    vision: Optional[str] = None
    values: Optional[str] = None  # JSON string
    products_services: Optional[str] = None
    target_market: Optional[str] = None
    competitive_advantage: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_twitter: Optional[str] = None
    social_facebook: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    departments: Optional[str] = None # JSON string

class CompanyUpdate(CompanyBase):
    pass

class CompanyOut(CompanyBase):
    id: int
    domain: str
    user_count: int = 0
    job_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)
