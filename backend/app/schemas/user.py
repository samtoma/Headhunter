from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: str
    is_active: bool = True
    role: str
    department: Optional[str] = None
    sso_provider: Optional[str] = None
    is_verified: bool = False
    permissions: Optional[str] = None # JSON string

class UserOut(UserBase):
    id: int
    created_at: datetime
    login_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)
