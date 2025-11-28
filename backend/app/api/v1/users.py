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
    users = db.query(User).filter(User.is_active.is_(True)).all()
    return users

class UserUpdate(BaseModel):
    role: str

@router.patch("/{user_id}", response_model=UserOut)
def update_user_role(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin": # Use string or enum
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = user_update.role
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role_dedicated(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dedicated endpoint for role updates (matches frontend expectations)"""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = user_update.role
    db.commit()
    db.refresh(user)
    return user
