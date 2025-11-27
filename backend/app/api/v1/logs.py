from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.core.database import get_db
from app.models.models import ActivityLog, User, UserRole
from app.api.deps import get_current_user

router = APIRouter(prefix="/logs", tags=["Logs"])

class LogOut(BaseModel):
    id: int
    action: str
    details: Optional[str] = None
    created_at: datetime
    user_email: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/company/{company_id}", response_model=List[LogOut])
def get_company_logs(
    company_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    logs = db.query(ActivityLog).filter(ActivityLog.company_id == company_id).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    
    results = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        log_dict = log.__dict__.copy()
        log_dict['user_email'] = user.email if user else "Unknown"
        results.append(log_dict)
        
    return results
