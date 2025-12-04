from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: Optional[str] = None # JSON string
    job_templates: Optional[str] = None # JSON string

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(DepartmentBase):
    name: Optional[str] = None

class DepartmentOut(DepartmentBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
