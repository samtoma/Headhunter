from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.models import Application, User, UserRole, Interview
from app.api.deps import get_current_user
from app.services.sync import touch_company_state
from app.schemas.application import ApplicationOut

router = APIRouter(prefix="/applications", tags=["Applications"])

class ApplicationCreate(BaseModel):
    cv_id: int
    job_id: int

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None

@router.post("/", response_model=ApplicationOut)
def create_application(data: ApplicationCreate, db: Session = Depends(get_db)):
    # Check if already applied
    exists = db.query(Application).filter_by(cv_id=data.cv_id, job_id=data.job_id).first()
    if exists:
        # Return existing app if duplicate
        return exists
    
    app = Application(cv_id=data.cv_id, job_id=data.job_id, status="New")
    db.add(app)
    db.commit()
    db.refresh(app)
    touch_company_state(db, app.job.company_id if app.job else None)
    return app

@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(app_id: int, data: ApplicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    
    if data.status is not None:
        app.status = data.status
        if data.status == "Hired" and not app.hired_at:
            from datetime import datetime, timezone
            app.hired_at = datetime.now(timezone.utc)
            
    if data.rating is not None:
        app.rating = data.rating
    if data.notes is not None:
        app.notes = data.notes
    
    # --- INTERVIEWER CHECK ---
    if current_user.role == UserRole.INTERVIEWER:
        # Check if assigned to any interview for this application
        assigned = db.query(Interview).filter(
            Interview.application_id == app.id,
            Interview.interviewer_id == current_user.id
        ).first()
        
        if not assigned:
            raise HTTPException(403, "Not authorized to update this application")
            
    # --- HIRING MANAGER CHECK ---
    if current_user.role == UserRole.HIRING_MANAGER:
        if not app.job or app.job.department != current_user.department:
            raise HTTPException(403, "Not authorized to update applications outside your department")
            
    db.commit()
    touch_company_state(db, app.job.company_id if app.job else None)
    
    # Mask salary for interviewer
    if current_user.role == UserRole.INTERVIEWER:
        app.current_salary = "Confidential"
        app.expected_salary = "Confidential"
        
    return app

@router.delete("/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
        
    # Permission Check
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
         raise HTTPException(403, "Not authorized to delete applications")
         
    if current_user.role == UserRole.HIRING_MANAGER:
        if not app.job or app.job.department != current_user.department:
            raise HTTPException(403, "Not authorized to delete applications outside your department")
            
    company_id = app.job.company_id if app.job else None
    db.delete(app)
    db.commit()
    touch_company_state(db, company_id)
    return {"message": "Application deleted"}