from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, ConfigDict
from app.core.database import get_db
from app.models.models import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

class UserOut(BaseModel):
    id: int
    email: str
    is_active: bool
    role: str
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).filter(User.is_active == True).all()
    return users
