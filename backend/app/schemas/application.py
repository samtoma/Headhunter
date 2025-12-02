from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ApplicationOut(BaseModel):
    id: int
    cv_id: int
    job_id: int
    status: str
    rating: Optional[int] = None
    notes: Optional[str] = None
    applied_at: datetime
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
