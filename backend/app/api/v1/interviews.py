from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.core.database import get_db
from app.models.models import Interview, Application, User
from app.api.deps import get_current_user
from app.api.v1.activity import log_application_activity

router = APIRouter(prefix="/interviews", tags=["Interviews"])

class InterviewCreate(BaseModel):
    application_id: int
    step: str # e.g. "Screening", "Technical"
    outcome: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    interviewer_id: Optional[int] = None
    custom_data: Optional[str] = None # JSON string

class InterviewUpdate(BaseModel):
    step: Optional[str] = None
    outcome: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    custom_data: Optional[str] = None

class InterviewOut(BaseModel):
    id: int
    application_id: int
    step: str
    outcome: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    interviewer_id: Optional[int] = None
    interviewer_name: Optional[str] = None
    custom_data: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class InterviewDashboardOut(BaseModel):
    id: int
    scheduled_at: Optional[datetime]
    step: str
    candidate_name: str
    job_title: str
    application_id: int
    cv_id: int
    status: Optional[str] = None
    rating: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

@router.get("/my", response_model=List[InterviewDashboardOut])
def get_my_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    interviews = db.query(Interview).join(Application).join(Application.cv).join(Application.job)\
        .filter(Interview.interviewer_id == current_user.id)\
        .order_by(Interview.scheduled_at.desc().nulls_last(), Interview.created_at.desc())\
        .all()
    
    results = []
    for i in interviews:
        results.append({
            "id": i.id,
            "scheduled_at": i.scheduled_at,
            "step": i.step,
            "candidate_name": i.application.cv.filename if i.application and i.application.cv else "Unknown",
            "job_title": i.application.job.title if i.application and i.application.job else "Unknown",
            "application_id": i.application_id,
            "cv_id": i.application.cv_id if i.application else 0,
            "status": i.outcome,
            "rating": i.rating
        })
    return results

@router.post("/", response_model=InterviewOut)
def create_interview(
    interview: InterviewCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify application exists
    app = db.query(Application).filter(Application.id == interview.application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")

    # Determine interviewer
    interviewer_id = interview.interviewer_id if interview.interviewer_id else current_user.id

    # Create interview
    new_interview = Interview(
        application_id=interview.application_id,
        step=interview.step,
        outcome=interview.outcome,
        feedback=interview.feedback,
        rating=interview.rating,
        scheduled_at=interview.scheduled_at,
        interviewer_id=interviewer_id,
        custom_data=interview.custom_data
    )
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)
    
    # Populate interviewer name for response
    # We need to fetch the assigned interviewer if it's not the current user
    if interviewer_id == current_user.id:
        new_interview.interviewer_name = current_user.email
    else:
        assigned_user = db.query(User).filter(User.id == interviewer_id).first()
        new_interview.interviewer_name = assigned_user.email if assigned_user else "Unknown"
    
    # Log Activity
    log_application_activity(
        db,
        interview.application_id,
        "interview_scheduled",
        current_user.id,
        app.job.company_id if app.job else None,
        {
            "step": interview.step,
            "scheduled_at": str(interview.scheduled_at) if interview.scheduled_at else None,
            "interviewer_id": interviewer_id
        }
    )

    return new_interview

@router.get("/application/{application_id}", response_model=List[InterviewOut])
def get_application_interviews(application_id: int, db: Session = Depends(get_db)):
    interviews = db.query(Interview).options(joinedload(Interview.interviewer)).filter(Interview.application_id == application_id).order_by(Interview.created_at.desc()).all()
    
    results = []
    for i in interviews:
        i.interviewer_name = i.interviewer.email if i.interviewer else "Unknown"
        results.append(i)
        
    return results

@router.patch("/{interview_id}", response_model=InterviewOut)
def update_interview(interview_id: int, data: InterviewUpdate, db: Session = Depends(get_db)):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(404, "Interview not found")
        
    if data.feedback is not None:
        interview.feedback = data.feedback
    if data.rating is not None:
        interview.rating = data.rating
    if data.step is not None:
        interview.step = data.step
    if data.outcome is not None:
        interview.outcome = data.outcome
    if data.scheduled_at is not None:
        interview.scheduled_at = data.scheduled_at
    if data.custom_data is not None:
        interview.custom_data = data.custom_data
        
    db.commit()
    db.refresh(interview)
    
    # Log Activity if outcome or rating changed
    if data.outcome or data.rating or data.feedback:
        log_application_activity(
            db,
            interview.application_id,
            "interview_updated",
            None, # We don't have current_user here easily without changing signature, but it's okay for now
            None,
            {
                "step": interview.step,
                "outcome": data.outcome,
                "rating": data.rating
            }
        )
        
    return interview

@router.delete("/{interview_id}")
def delete_interview(interview_id: int, db: Session = Depends(get_db)):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(404, "Interview not found")
    
    db.delete(interview)
    db.commit()
    return {"status": "deleted"}
