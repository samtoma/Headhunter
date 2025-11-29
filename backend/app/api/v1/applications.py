from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.models import Application, User, UserRole, Interview
from app.api.deps import get_current_user

router = APIRouter(prefix="/applications", tags=["Applications"])

class ApplicationCreate(BaseModel):
    cv_id: int
    job_id: int

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None

@router.post("/")
def create_application(data: ApplicationCreate, db: Session = Depends(get_db)):
    # Check if already applied
    exists = db.query(Application).filter_by(cv_id=data.cv_id, job_id=data.job_id).first()
    if exists:
        return {"message": "Already in pipeline", "id": exists.id}
    
    app = Application(cv_id=data.cv_id, job_id=data.job_id, status="New")
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

@router.patch("/{app_id}")
def update_application(app_id: int, data: ApplicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    
    if data.status is not None:
        app.status = data.status
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
            
    db.commit()
    
    # Mask salary for interviewer
    if current_user.role == UserRole.INTERVIEWER:
        app.current_salary = "Confidential"
        app.expected_salary = "Confidential"
        
    return app

@router.delete("/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    db.delete(app)
    db.commit()
    return {"message": "Application deleted"}