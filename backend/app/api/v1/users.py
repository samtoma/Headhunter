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
    query = db.query(User).filter(User.is_active.is_(True))
    
    # Filter by Company
    if current_user.company_id:
        query = query.filter(User.company_id == current_user.company_id)
        
    # Filter by Department for Interviewers
    if current_user.role == "interviewer" and current_user.department:
        query = query.filter(User.department == current_user.department)
        
    users = query.all()
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
    # Allow Super Admin OR Company Admin (for their own company)
    if current_user.role == "super_admin":
        pass
    elif current_user.role == "admin":
        # Check if target user belongs to same company
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.company_id != current_user.company_id:
             raise HTTPException(status_code=404, detail="User not found")
    else:
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
    """Dedicated endpoint for role updates (matches frontend expectations)"""
    # Allow Super Admin OR Company Admin (for their own company)
    if current_user.role == "super_admin":
        pass
    elif current_user.role == "admin":
        # Check if target user belongs to same company
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.company_id != current_user.company_id:
             raise HTTPException(status_code=404, detail="User not found")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = user_update.role
    db.commit()
    db.refresh(user)
    return user
