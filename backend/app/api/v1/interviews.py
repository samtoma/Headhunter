from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import json
from app.core.database import get_db
from app.models.models import Interview, Application, User, CV, UserRole
from app.api.deps import get_current_user
from app.api.v1.activity import log_application_activity
from app.core.email import send_interview_notification
from app.services.ai_feedback import generate_interview_feedback_stream
from app.core.llm_logging import LLMLogger
from jose import jwt, JWTError
from app.core.security import SECRET_KEY, ALGORITHM
import asyncio
import os

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

router = APIRouter(prefix="/interviews", tags=["Interviews"])

class InterviewCreate(BaseModel):
    application_id: int
    step: str # e.g. "Screening", "Technical"
    status: Optional[str] = "Scheduled"
    outcome: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    interviewer_id: Optional[int] = None
    custom_data: Optional[str] = None # JSON string
    send_notifications: Optional[bool] = True # Default to True (Frontend will override based on settings)

class InterviewUpdate(BaseModel):
    step: Optional[str] = None
    status: Optional[str] = None  # Scheduled, Cancelled, No-Show, Completed
    outcome: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    interviewer_id: Optional[int] = None  # For reassigning interviewer
    custom_data: Optional[str] = None
    send_notifications: Optional[bool] = True

class InterviewOut(BaseModel):
    id: int
    application_id: int
    step: str
    status: str
    outcome: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    interviewer_id: Optional[int] = None
    interviewer_name: Optional[str] = None
    custom_data: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# Timeline View Schemas
class InterviewTimelineItem(BaseModel):
    """Individual interview in a candidate's timeline"""
    id: int
    stage: str  # e.g. "Screening", "Technical", "Culture", "Final"
    status: str  # "Scheduled", "Completed", "Cancelled", "No Show"
    outcome: Optional[str] = None  # "Passed", "Failed", "Pending"
    interviewer: Optional[str] = None  # Interviewer name
    interviewer_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class CandidateTimeline(BaseModel):
    """A candidate's full interview timeline"""
    candidate_id: int
    candidate_name: str
    job_title: Optional[str] = None # Added for global view
    application_id: int
    current_stage: Optional[str] = None
    interviews: List[InterviewTimelineItem]
    
class InterviewTimelineResponse(BaseModel):
    """Timeline view for all candidates in a job"""
    job_id: Optional[int] = None # Optional for global view
    job_title: str
    stages: List[str]  # Predefined stages for this job
    candidates: List[CandidateTimeline]

class InterviewDashboardOut(BaseModel):
    id: int
    scheduled_at: Optional[datetime]
    step: str
    candidate_name: str
    job_title: str
    application_id: int
    cv_id: int
    job_id: int  # Added for navigation
    status: Optional[str] = None
    outcome: Optional[str] = None
    rating: Optional[int] = None
    interviewer_name: Optional[str] = None  # Added for admin view

    model_config = ConfigDict(from_attributes=True)

# Calendar View Schemas
class CalendarEvent(BaseModel):
    id: int
    title: str  # e.g., "Screening - John Doe"
    start: datetime
    end: datetime
    allDay: bool = False
    resource: Optional[dict] = None  # Extra data like candidate_id, job_id, etc.
    status: str  # Scheduled, Completed, etc.
    type: str = "interview"  # potentially "task" later
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/calendar", response_model=List[CalendarEvent])
def get_calendar_events(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    job_id: Optional[int] = None,
    interviewer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get interviews formatted as calendar events.
    Supports filtering by date range (start, end) and job/interviewer.
    """
    query = db.query(Interview).join(Application).join(User, Interview.interviewer_id == User.id, isouter=True)
    
    # Company filter
    if current_user.company_id:
        query = query.join(Application.job).filter(Application.job.has(company_id=current_user.company_id))

    # Date Range Filter
    if start:
        query = query.filter(Interview.scheduled_at >= start)
    if end:
        query = query.filter(Interview.scheduled_at <= end)
        
    # Additional filters
    if job_id:
        query = query.filter(Application.job_id == job_id)
        
    # Role-based filtering
    if current_user.role == "interviewer":
        # Interviewers see only their own, unless specified otherwise (but strict for now)
        query = query.filter(Interview.interviewer_id == current_user.id)
    elif interviewer_id:
        # Admin can filter by specific interviewer
        query = query.filter(Interview.interviewer_id == interviewer_id)
    elif current_user.role == "hiring_manager":
        # Hiring managers see interviews for their department's jobs
        # (Assuming dept filtering logic exists or will be added. For now, let them see all company interviews or filter by their jobs)
        if current_user.department:
             # This requires joining Job to check department
             from app.models.models import Job
             query = query.join(Application.job).filter(Job.department == current_user.department)

    interviews = query.all()
    
    events = []
    from datetime import timedelta
    
    for i in interviews:
        # Determine duration (default 1 hour if not stored)
        # TODO: Add duration to Interview model
        duration = timedelta(hours=1)
        start_time = i.scheduled_at
        end_time = start_time + duration
        
        # Get candidate name (Need to join CV or store it. Application has cv_id)
        # Using a helper or accessing relationships carefully
        # Application -> valid_cv (property) or access metadata
        # Ideally, we should eagerly load these relationships
        candidate_name = "Candidate"
        if i.application and i.application.cv and i.application.cv.parsed_data:
             candidate_name = i.application.cv.parsed_data.name or "Candidate"
        
        job_title = "Job"
        if i.application and i.application.job:
            job_title = i.application.job.title

        events.append(CalendarEvent(
            id=i.id,
            title=f"{i.step}: {candidate_name}",
            start=start_time,
            end=end_time,
            status=i.status,
            resource={
                "candidate_name": candidate_name,
                "job_title": job_title,
                "interviewer_name": i.interviewer.full_name if i.interviewer else "Unassigned",
                "interviewer_id": i.interviewer_id,
                "application_id": i.application_id,
                "job_id": i.application.job_id if i.application else None,
                "step": i.step
            }
        ))
        
    return events

@router.get("/all", response_model=List[InterviewDashboardOut])
def get_all_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Get all interviews for admin/recruiter view.
    Returns interviews for the current user's company.
    """
    # Get all interviews for this company
    interviews = db.query(Interview).join(Application).join(Application.cv).join(Application.job)\
        .filter(Application.job.has(company_id=current_user.company_id))\
        .order_by(Interview.scheduled_at.desc().nulls_last(), Interview.created_at.desc())\
        .all()
    
    results = []
    for i in interviews:
        # Extract candidate name from parsed_data
        candidate_name = "Unknown"
        job_title = "Unknown Position"
        if i.application:
            if i.application.cv:
                cv = i.application.cv
                if hasattr(cv, 'parsed_data') and cv.parsed_data and hasattr(cv.parsed_data, 'name'):
                    candidate_name = cv.parsed_data.name or cv.filename or "Unknown"
                else:
                    candidate_name = cv.filename or "Unknown"
            if i.application.job:
                job_title = i.application.job.title
        
        # Get interviewer name
        interviewer_name = None
        if i.interviewer_id:
            interviewer = db.query(User).filter(User.id == i.interviewer_id).first()
            if interviewer:
                interviewer_name = interviewer.full_name or interviewer.email.split('@')[0]
        
        results.append(InterviewDashboardOut(
            id=i.id,
            candidate_name=candidate_name,
            job_title=job_title,
            application_id=i.application_id,
            cv_id=i.application.cv_id if i.application else 0,
            job_id=i.application.job_id if i.application else 0,
            step=i.step,
            scheduled_at=i.scheduled_at,
            status=i.status or "Scheduled",
            outcome=i.outcome,
            rating=i.rating,
            interviewer_name=interviewer_name
        ))
    return results

@router.get("/my", response_model=List[InterviewDashboardOut])
def get_my_interviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    interviews = db.query(Interview).join(Application).join(Application.cv).join(Application.job)\
        .filter(Interview.interviewer_id == current_user.id)\
        .order_by(Interview.scheduled_at.desc().nulls_last(), Interview.created_at.desc())\
        .all()
    
    results = []
    for i in interviews:
        # Extract candidate name from parsed_data (ParsedCV model), fallback to filename
        candidate_name = "Unknown"
        if i.application and i.application.cv:
            cv = i.application.cv
            # parsed_data is a SQLAlchemy relationship to ParsedCV model
            if hasattr(cv, 'parsed_data') and cv.parsed_data and hasattr(cv.parsed_data, 'name'):
                candidate_name = cv.parsed_data.name or cv.filename or "Unknown"
            else:
                candidate_name = cv.filename or "Unknown"
        
        results.append({
            "id": i.id,
            "scheduled_at": i.scheduled_at,
            "step": i.step,
            "candidate_name": candidate_name,
            "job_title": i.application.job.title if i.application and i.application.job else "Unknown",
            "application_id": i.application_id,
            "cv_id": i.application.cv_id if i.application else 0,
            "job_id": i.application.job_id if i.application else 0,
            "status": i.status,
            "outcome": i.outcome,
            "rating": i.rating
        })
    return results

@router.get("/{interview_id}")
def get_interview(interview_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single interview by ID with candidate info."""
    interview = db.query(Interview).options(
        joinedload(Interview.application).joinedload(Application.cv),
        joinedload(Interview.application).joinedload(Application.job),
        joinedload(Interview.interviewer)
    ).filter(Interview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Get candidate name from parsed_data
    candidate_name = "Unknown"
    if interview.application and interview.application.cv:
        cv = interview.application.cv
        if hasattr(cv, 'parsed_data') and cv.parsed_data and hasattr(cv.parsed_data, 'name'):
            candidate_name = cv.parsed_data.name or cv.filename or "Unknown"
        else:
            candidate_name = cv.filename or "Unknown"
    
    return {
        "id": interview.id,
        "application_id": interview.application_id,
        "step": interview.step,
        "outcome": interview.outcome,
        "feedback": interview.feedback,
        "rating": interview.rating,
        "scheduled_at": interview.scheduled_at,
        "created_at": interview.created_at,
        "status": interview.status,
        "interviewer_id": interview.interviewer_id,
        "interviewer_name": interview.interviewer.full_name if interview.interviewer else None,
        "candidate_name": candidate_name,
        "job_title": interview.application.job.title if interview.application and interview.application.job else "Unknown",
        "cv_id": interview.application.cv_id if interview.application else 0,
        "job_id": interview.application.job_id if interview.application else 0,
        "custom_data": interview.custom_data
    }

@router.post("/", response_model=InterviewOut)
def create_interview(
    interview: InterviewCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify application exists
    app = db.query(Application).options(
        joinedload(Application.cv).joinedload(CV.parsed_data),
        joinedload(Application.job),
        joinedload(Application.assigner)
    ).filter(Application.id == interview.application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")

    # Determine interviewer
    interviewer_id = interview.interviewer_id if interview.interviewer_id else current_user.id

    # Create interview
    new_interview = Interview(
        application_id=interview.application_id,
        step=interview.step,
        status=interview.status,
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
    
    # --- Prepare Notifications Data ---
    candidate_name = "Candidate"
    job_title = app.job.title if app.job else 'Unknown Position'
    
    if app.cv:
        if hasattr(app.cv, 'parsed_data') and app.cv.parsed_data and hasattr(app.cv.parsed_data, 'name'):
            candidate_name = app.cv.parsed_data.name or app.cv.filename or 'Candidate'
        else:
            candidate_name = app.cv.filename or 'Candidate'
            
    # Fetch emails
    candidate_email = None
    if app.cv and app.cv.parsed_data and app.cv.parsed_data.email:
        e = app.cv.parsed_data.email
        if isinstance(e, list):
            candidate_email = e[0]
        elif isinstance(e, str) and "[" in e:
            try:
                candidate_email = json.loads(e)[0]
            except Exception:
                candidate_email = e
        else:
            candidate_email = e
    
    recruiter_email = app.assigner.email if app.assigner else None
    
    department_manager_email = None
    if app.job and app.job.department:
        dept_manager = db.query(User).filter(
            User.role == UserRole.HIRING_MANAGER, 
            User.department == app.job.department
        ).first()
        if dept_manager:
            department_manager_email = dept_manager.email

    interviewer_email = None
    assigned_user_obj = None
    if interviewer_id:
        if interviewer_id == current_user.id:
             interviewer_email = current_user.email
             assigned_user_obj = current_user
        else:
             assigned_user_obj = db.query(User).filter(User.id == interviewer_id).first()
             if assigned_user_obj:
                 interviewer_email = assigned_user_obj.email

    # Log Activity with recipients
    log_application_activity(
        db,
        interview.application_id,
        "interview_scheduled",
        current_user.id,
        app.job.company_id if app.job else None,
        {
            "step": interview.step,
            "scheduled_at": str(interview.scheduled_at) if interview.scheduled_at else None,
            "interviewer_id": interviewer_id,
            "notifications": {
                "interviewer": interviewer_email,
                "candidate": candidate_email,
                "recruiter": recruiter_email,
                "hiring_manager": department_manager_email
            }
        }
    )
    
    # Check if we should send notifications
    # 1. Check explicit flag from request (default True)
    should_send_email = interview.send_notifications
    
    # Send email notification
    if should_send_email and interviewer_email and interview.scheduled_at:
        # Queue email in background (silently skip if SMTP not configured for tests)
        try:
            try:
                loop = asyncio.get_event_loop()
                loop.create_task(send_interview_notification(
                    interviewer_email=interviewer_email,
                    interviewer_name=assigned_user_obj.full_name or assigned_user_obj.email.split('@')[0],
                    candidate_name=candidate_name,
                    job_title=job_title,
                    interview_stage=interview.step,
                    scheduled_at=str(interview.scheduled_at),
                    scheduled_by=current_user.email,
                    candidate_email=candidate_email,
                    recruiter_email=recruiter_email,
                    department_manager_email=department_manager_email,
                    scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                    cv_path=app.cv.filepath if app.cv else None
                ))
            except RuntimeError:
                # If no event loop, run synchronously (shouldn't happen in FastAPI)
                asyncio.run(send_interview_notification(
                    interviewer_email=interviewer_email,
                    interviewer_name=assigned_user_obj.full_name or assigned_user_obj.email.split('@')[0],
                    candidate_name=candidate_name,
                    job_title=job_title,
                    interview_stage=interview.step,
                    scheduled_at=str(interview.scheduled_at),
                    scheduled_by=current_user.email,
                    candidate_email=candidate_email,
                    recruiter_email=recruiter_email,
                    department_manager_email=department_manager_email,
                    scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                    cv_path=app.cv.filepath if app.cv else None
                ))
        except Exception:
            # Silently fail if email service is not available (test environment)
            pass

    return new_interview

@router.get("/timeline/global", response_model=InterviewTimelineResponse)
def get_global_interview_timeline(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated interview timeline view for ALL jobs (optionally filtered by department).
    """
    from app.models.models import Job, CV, UserRole
    
    # Base query for Jobs in company
    job_query = db.query(Job).filter(Job.company_id == current_user.company_id, Job.is_active)
    
    # Department Filter
    if department and department != "All":
        job_query = job_query.filter(Job.department == department)
        
    # Permission / Role Filter logic
    if current_user.role == UserRole.INTERVIEWER:
        raise HTTPException(status_code=403, detail="Interviewers cannot access timeline view")
    
    if current_user.role == UserRole.HIRING_MANAGER:
         # Restrict to their department, or if department is specified, check if it matches
         if current_user.department:
             if department and department != "All" and department != current_user.department:
                  raise HTTPException(status_code=403, detail="You can only access jobs in your department")
             job_query = job_query.filter(Job.department == current_user.department)

    jobs = job_query.all()
    job_ids = [j.id for j in jobs]
    
    # Fetch stages from company settings (global)
    # We use the company's default configured stages for the global view to maintain consistency
    stages = ["Screening", "Technical", "Culture", "Final"]
    if current_user.company and current_user.company.interview_stages:
        try:
             company_stages_data = json.loads(current_user.company.interview_stages)
             stages = [s["name"] for s in company_stages_data]
        except Exception:
             pass

    # Fetch all applications for these jobs
    applications = db.query(Application)\
        .filter(Application.job_id.in_(job_ids))\
        .options(joinedload(Application.cv).joinedload(CV.parsed_data))\
        .options(joinedload(Application.interviews))\
        .options(joinedload(Application.job))\
        .all()
        
    # Build candidate timelines
    candidates = []
    for app in applications:
        # Get candidate name
        candidate_name = "Unknown"
        if app.cv:
            if hasattr(app.cv, 'parsed_data') and app.cv.parsed_data and hasattr(app.cv.parsed_data, 'name'):
                candidate_name = app.cv.parsed_data.name or app.cv.filename or "Unknown"
            else:
                candidate_name = app.cv.filename or "Unknown"
        
        # Get all interviews for this application
        interview_items = []
        for interview in app.interviews:
            interviewer_name = None
            if interview.interviewer_id:
                interviewer = db.query(User).filter(User.id == interview.interviewer_id).first()
                if interviewer:
                    interviewer_name = interviewer.full_name or interviewer.email.split('@')[0]
            
            interview_items.append(InterviewTimelineItem(
                id=interview.id,
                stage=interview.step,
                status=interview.status,
                outcome=interview.outcome,
                interviewer=interviewer_name,
                interviewer_id=interview.interviewer_id,
                scheduled_at=interview.scheduled_at,
                feedback=interview.feedback,
                rating=interview.rating
            ))
            
        candidates.append(CandidateTimeline(
            candidate_id=app.cv_id if app.cv_id else 0,
            candidate_name=candidate_name,
            job_title=app.job.title if app.job else "Unknown",
            application_id=app.id,
            current_stage=app.status, 
            interviews=sorted(interview_items, key=lambda x: stages.index(x.stage) if x.stage in stages else 999)
        ))
        
    return InterviewTimelineResponse(
        job_id=0, # 0 indicates global
        job_title="All Jobs",
        stages=stages,
        candidates=candidates
    )

@router.get("/timeline/{job_id}", response_model=InterviewTimelineResponse)
def get_interview_timeline(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get interview timeline view for a specific job position.
    Shows all candidates and their interview progress through stages.
    
    Permissions:
    - Admin: All jobs
    - Recruiter: All jobs in company
    - Hiring Manager: Jobs in their department only
    - Interviewer: Not allowed
    """
    from app.models.models import Job, CV, UserRole
    
    # Fetch job
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == current_user.company_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Permission check
    if current_user.role == UserRole.INTERVIEWER:
        raise HTTPException(status_code=403, detail="Interviewers cannot access timeline view")
    
    if current_user.role == UserRole.HIRING_MANAGER:
        # Department scope check
        if job.department != current_user.department:
            raise HTTPException(status_code=403, detail="You can only access jobs in your department")
    
    # Fetch company to get dynamic stages
    company = job.company
    stages = []
    if company and company.interview_stages:
        try:
            company_stages_data = json.loads(company.interview_stages)
            stages = [s["name"] for s in company_stages_data]
        except Exception:
            stages = ["Screening", "Technical", "Culture", "Final"]
    else:
        stages = ["Screening", "Technical", "Culture", "Final"]
    
    # Fetch all applications for this job with their interviews
    applications = db.query(Application)\
        .filter(Application.job_id == job_id)\
        .options(joinedload(Application.cv).joinedload(CV.parsed_data))\
        .options(joinedload(Application.interviews))\
        .all()
    
    # Build candidate timelines
    candidates = []
    for app in applications:
        # Get candidate name
        candidate_name = "Unknown"
        if app.cv:
            if hasattr(app.cv, 'parsed_data') and app.cv.parsed_data and hasattr(app.cv.parsed_data, 'name'):
                candidate_name = app.cv.parsed_data.name or app.cv.filename or "Unknown"
            else:
                candidate_name = app.cv.filename or "Unknown"
        
        # Get all interviews for this application
        interview_items = []
        
        for interview in app.interviews:
            # Get interviewer name
            interviewer_name = None
            if interview.interviewer_id:
                interviewer = db.query(User).filter(User.id == interview.interviewer_id).first()
                if interviewer:
                    interviewer_name = interviewer.full_name or interviewer.email.split('@')[0]
            
            interview_items.append(InterviewTimelineItem(
                id=interview.id,
                stage=interview.step,
                status=interview.status,
                outcome=interview.outcome,
                interviewer=interviewer_name,
                interviewer_id=interview.interviewer_id,
                scheduled_at=interview.scheduled_at,
                feedback=interview.feedback,
                rating=interview.rating
            ))
        
        candidates.append(CandidateTimeline(
            candidate_id=app.cv_id if app.cv_id else 0,
            candidate_name=candidate_name,
            application_id=app.id,
            current_stage=app.status, # Use Application status directly for flow logic
            interviews=sorted(interview_items, key=lambda x: stages.index(x.stage) if x.stage in stages else 999)
        ))
    
    return InterviewTimelineResponse(
        job_id=job.id,
        job_title=job.title,
        stages=stages,
        candidates=candidates
    )

@router.get("/application/{application_id}", response_model=List[InterviewOut])
def get_application_interviews(application_id: int, db: Session = Depends(get_db)):
    interviews = db.query(Interview).options(joinedload(Interview.interviewer)).filter(Interview.application_id == application_id).order_by(Interview.created_at.desc()).all()
    
    results = []
    for i in interviews:
        i.interviewer_name = i.interviewer.email if i.interviewer else "Unknown"
        results.append(i)
        
    return results

@router.patch("/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: int, 
    data: InterviewUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update interview with support for reschedule, reassign, cancel, etc."""
    interview = db.query(Interview).options(
        joinedload(Interview.application).joinedload(Application.cv).joinedload(CV.parsed_data),
        joinedload(Interview.application).joinedload(Application.job),
        joinedload(Interview.application).joinedload(Application.assigner),
        joinedload(Interview.interviewer)
    ).filter(Interview.id == interview_id).first()
    
    if not interview:
        raise HTTPException(404, "Interview not found")
    
    # Track changes for notifications
    old_interviewer_id = interview.interviewer_id
    old_scheduled_at = interview.scheduled_at
    old_status = interview.status
    
    # Apply updates
    if data.feedback is not None:
        interview.feedback = data.feedback
    if data.rating is not None:
        interview.rating = data.rating
    if data.step is not None:
        interview.step = data.step
    if data.outcome is not None:
        interview.outcome = data.outcome
        # Auto-complete if outcome is provided
        if data.outcome in ["Passed", "Failed"] and interview.status == "Scheduled":
            interview.status = "Completed"
    if data.scheduled_at is not None:
        interview.scheduled_at = data.scheduled_at
    if data.status is not None:
        interview.status = data.status
    if data.interviewer_id is not None:
        interview.interviewer_id = data.interviewer_id
    if data.custom_data is not None:
        interview.custom_data = data.custom_data
        
    db.commit()
    db.refresh(interview)
    
    # Get candidate info for notifications
    candidate_name = "Candidate"
    job_title = "Unknown Position"
    if interview.application:
        if interview.application.cv:
            if hasattr(interview.application.cv, 'parsed_data') and interview.application.cv.parsed_data:
                candidate_name = getattr(interview.application.cv.parsed_data, 'name', None) or interview.application.cv.filename or 'Candidate'
            else:
                candidate_name = interview.application.cv.filename or 'Candidate'
        if interview.application.job:
            job_title = interview.application.job.title
    
    # Fetch emails for calendar invite
    candidate_email = None
    recruiter_email = None
    department_manager_email = None
    
    app = interview.application
    if app:
        # Candidate Email
        if app.cv and app.cv.parsed_data and app.cv.parsed_data.email:
            e = app.cv.parsed_data.email
            if isinstance(e, list):
                candidate_email = e[0]
            elif isinstance(e, str) and "[" in e:
                try:
                    candidate_email = json.loads(e)[0]
                except Exception:
                    candidate_email = e
            else:
                candidate_email = e
        
        # Recruiter Email
        recruiter_email = app.assigner.email if app.assigner else None
        
        # Dept Manager
        if app.job and app.job.department:
            dept_manager = db.query(User).filter(
                User.role == UserRole.HIRING_MANAGER, 
                User.department == app.job.department
            ).first()
            if dept_manager:
                department_manager_email = dept_manager.email

    # Handle interviewer change - notify both old and new
    # Only if notifications are enabled
    if data.send_notifications and data.interviewer_id is not None and data.interviewer_id != old_interviewer_id:
        # Notify new interviewer
        new_interviewer = db.query(User).filter(User.id == data.interviewer_id).first()
        if new_interviewer and new_interviewer.email and interview.scheduled_at:
            try:
                loop = asyncio.get_event_loop()
                loop.create_task(send_interview_notification(
                    interviewer_email=new_interviewer.email,
                    interviewer_name=new_interviewer.full_name or new_interviewer.email.split('@')[0],
                    candidate_name=candidate_name,
                    job_title=job_title,
                    interview_stage=interview.step,
                    scheduled_at=str(interview.scheduled_at),
                    scheduled_by=current_user.email,
                    candidate_email=candidate_email,
                    recruiter_email=recruiter_email,
                    department_manager_email=department_manager_email,
                    scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                    cv_path=interview.application.cv.filepath if interview.application.cv else None
                ))
            except RuntimeError:
                asyncio.run(send_interview_notification(
                    interviewer_email=new_interviewer.email,
                    interviewer_name=new_interviewer.full_name or new_interviewer.email.split('@')[0],
                    candidate_name=candidate_name,
                    job_title=job_title,
                    interview_stage=interview.step,
                    scheduled_at=str(interview.scheduled_at),
                    scheduled_by=current_user.email,
                    candidate_email=candidate_email,
                    recruiter_email=recruiter_email,
                    department_manager_email=department_manager_email,
                    scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                    cv_path=interview.application.cv.filepath if interview.application.cv else None
                ))
    
    # Handle reschedule - notify current interviewer of new time
    elif data.scheduled_at is not None and data.scheduled_at != old_scheduled_at and interview.interviewer_id:
        interviewer = db.query(User).filter(User.id == interview.interviewer_id).first()
        if interviewer and interviewer.email:
            try:
                loop = asyncio.get_event_loop()
                loop.create_task(send_interview_notification(
                    interviewer_email=interviewer.email,
                    interviewer_name=interviewer.full_name or interviewer.email.split('@')[0],
                    candidate_name=candidate_name,
                    job_title=job_title,
                    interview_stage=f"{interview.step} (Rescheduled)",
                    scheduled_at=str(interview.scheduled_at),
                    scheduled_by=current_user.email,
                    candidate_email=candidate_email,
                    recruiter_email=recruiter_email,
                    department_manager_email=department_manager_email,
                    scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                    cv_path=interview.application.cv.filepath if interview.application.cv else None
                ))
            except RuntimeError:
                asyncio.run(send_interview_notification(
                    interviewer_email=interviewer.email,
                    interviewer_name=interviewer.full_name or interviewer.email.split('@')[0],
                    candidate_name=candidate_name,
                    job_title=job_title,
                    interview_stage=f"{interview.step} (Rescheduled)",
                    scheduled_at=str(interview.scheduled_at),
                    scheduled_by=current_user.email,
                    candidate_email=candidate_email,
                    recruiter_email=recruiter_email,
                    department_manager_email=department_manager_email,
                    scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                    cv_path=interview.application.cv.filepath if interview.application.cv else None
                ))
    
    # Log Activity if outcome or rating changed
    if data.outcome or data.rating or data.feedback:
        log_application_activity(
            db,
            interview.application_id,
            "interview_updated",
            current_user.id,
            None,
            {
                "step": interview.step,
                "outcome": data.outcome,
                "rating": data.rating,
                "notifications": {
                    "interviewer": interview.interviewer.email if interview.interviewer else None,
                    "candidate": candidate_email,
                    "recruiter": recruiter_email,
                    "hiring_manager": department_manager_email
                }
            }
        )
    
    # Log status changes (Cancel, No-Show)
    if data.status and data.status != old_status:
        log_application_activity(
            db,
            interview.application_id,
            "interview_status_changed",
            current_user.id,
            None,
            {
                "step": interview.step,
                "old_status": old_status,
                "new_status": data.status,
                "notifications": {
                    "interviewer": interview.interviewer.email if interview.interviewer else None,
                    "candidate": candidate_email,
                    "recruiter": recruiter_email,
                    "hiring_manager": department_manager_email
                }
            }
        )
        
        # Send Cancellation Email
        if data.status == "Cancelled" and interview.interviewer_id:
            interviewer = db.query(User).filter(User.id == interview.interviewer_id).first()
            if interviewer and interviewer.email:
                try:
                    loop = asyncio.get_event_loop()
                    loop.create_task(send_interview_notification(
                        interviewer_email=interviewer.email,
                        interviewer_name=interviewer.full_name or interviewer.email.split('@')[0],
                        candidate_name=candidate_name,
                        job_title=job_title,
                        interview_stage=f"{interview.step} (Canceled)",
                        scheduled_at=str(interview.scheduled_at),
                        scheduled_by=current_user.email,
                        candidate_email=candidate_email,
                        recruiter_email=recruiter_email,
                        department_manager_email=department_manager_email,
                        scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                        cv_path=None,
                        is_cancellation=True
                    ))
                except RuntimeError:
                    asyncio.run(send_interview_notification(
                        interviewer_email=interviewer.email,
                        interviewer_name=interviewer.full_name or interviewer.email.split('@')[0],
                        candidate_name=candidate_name,
                        job_title=job_title,
                        interview_stage=f"{interview.step} (Canceled)",
                        scheduled_at=str(interview.scheduled_at),
                        scheduled_by=current_user.email,
                        candidate_email=candidate_email,
                        recruiter_email=recruiter_email,
                        department_manager_email=department_manager_email,
                        scheduler_name=current_user.full_name or current_user.email.split('@')[0],
                        cv_path=None,
                        is_cancellation=True
                    ))
        
    return interview

@router.delete("/{interview_id}")
def delete_interview(interview_id: int, db: Session = Depends(get_db)):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(404, "Interview not found")
    
    db.delete(interview)
    db.commit()
    return {"status": "deleted"}


# ==================== WebSocket for LLM Feedback Streaming ====================

async def authenticate_feedback_websocket(websocket: WebSocket) -> Optional[User]:
    """Authenticate WebSocket connection for feedback generation"""
    token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return None
    
    db_gen = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            await websocket.close(code=1008, reason="Invalid token")
            return None
        
        db_gen = get_db()
        db = next(db_gen)
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return None
            
            return user
        finally:
            try:
                next(db_gen, None)
            except StopIteration:
                pass
    except JWTError:
        await websocket.close(code=1008, reason="Invalid token")
        return None
    except Exception as e:
        await websocket.close(code=1011, reason=f"Authentication error: {str(e)}")
        return None
    finally:
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass


@router.websocket("/{interview_id}/generate-feedback/stream")
async def stream_feedback_generation(websocket: WebSocket, interview_id: int):
    """
    WebSocket endpoint for streaming LLM-generated interview feedback.
    
    Connect with: ws://host/api/interviews/{interview_id}/generate-feedback/stream?token=YOUR_JWT_TOKEN
    
    Messages sent to client:
    - {"type": "status", "status": "thinking|analyzing|generating", "message": "..."}
    - {"type": "chunk", "content": "partial text...", "accumulated": "..."}
    - {"type": "complete", "feedback": "full text", "tokens_used": 1234, "model": "...", "latency_ms": 5000}
    - {"type": "error", "message": "error message", "code": "ERROR_CODE"}
    """
    await websocket.accept()
    
    # Authenticate user
    user = await authenticate_feedback_websocket(websocket)
    if not user:
        return
    
    db_gen = None
    start_time = None
    tokens_used = 0
    tokens_input = 0
    tokens_output = 0
    model_used = None
    latency_ms = 0
    
    try:
        # Get database session
        db_gen = get_db()
        db = next(db_gen)
        
        # Fetch interview with all related data
        interview = db.query(Interview).options(
            joinedload(Interview.application).joinedload(Application.cv).joinedload(CV.parsed_data),
            joinedload(Interview.application).joinedload(Application.job)
        ).filter(Interview.id == interview_id).first()
        
        if not interview:
            await websocket.send_json({
                "type": "error",
                "message": "Interview not found",
                "code": "NOT_FOUND"
            })
            await websocket.close()
            return
        
        # Verify user has access to this interview
        # Check if user is interviewer, or admin/recruiter in same company
        has_access = False
        if interview.interviewer_id == user.id:
            has_access = True
        elif user.role in [UserRole.ADMIN, UserRole.RECRUITER]:
            # Check if interview belongs to user's company
            if interview.application and interview.application.job:
                if interview.application.job.company_id == user.company_id:
                    has_access = True
        
        if not has_access:
            await websocket.send_json({
                "type": "error",
                "message": "Access denied to this interview",
                "code": "ACCESS_DENIED"
            })
            await websocket.close()
            return
        
        # Prepare data for feedback generation
        candidate_data = {}
        if interview.application and interview.application.cv:
            cv = interview.application.cv
            if cv.parsed_data:
                # Extract candidate data from parsed CV
                candidate_data = {
                    "name": getattr(cv.parsed_data, 'name', cv.filename or 'Candidate'),
                    "summary": getattr(cv.parsed_data, 'summary', ''),
                    "experience_years": getattr(cv.parsed_data, 'experience_years', 0),
                    "skills": getattr(cv.parsed_data, 'skills', [])
                }
            else:
                candidate_data = {
                    "name": cv.filename or 'Candidate',
                    "summary": "",
                    "experience_years": 0,
                    "skills": []
                }
        
        job_data = {}
        if interview.application and interview.application.job:
            job = interview.application.job
            job_data = {
                "title": job.title or "Position",
                "description": job.description or "",
                "qualifications": job.qualifications or []
            }
        
        interview_data = {
            "step": interview.step or "Interview",
            "status": interview.status or "Completed",
            "scheduled_at": str(interview.scheduled_at) if interview.scheduled_at else None
        }
        
        # Start timing
        import time
        start_time = time.time()
        
        # Stream feedback generation
        async for message in generate_interview_feedback_stream(
            interview_data=interview_data,
            candidate_data=candidate_data,
            job_data=job_data
        ):
            # Send message to client
            await websocket.send_json(message)
            
            # Track completion data
            if message.get("type") == "complete":
                tokens_used = message.get("tokens_used", 0)
                tokens_input = message.get("tokens_input", 0)
                tokens_output = message.get("tokens_output", 0)
                model_used = message.get("model", OPENAI_MODEL)
                latency_ms = message.get("latency_ms", 0)
            
            # Handle errors
            if message.get("type") == "error":
                LLMLogger.log_llm_operation(
                    action="generate_feedback_error",
                    message=f"Error generating feedback for interview {interview_id}: {message.get('message')}",
                    user_id=user.id,
                    company_id=user.company_id,
                    interview_id=interview_id,
                    error_type="GenerationError",
                    error_message=message.get("message")
                )
                break
        
        # Log successful operation
        if tokens_used > 0:
            LLMLogger.log_llm_operation(
                action="generate_feedback",
                message=f"Generated feedback for interview {interview_id}",
                user_id=user.id,
                company_id=user.company_id,
                interview_id=interview_id,
                model=model_used,
                tokens_used=tokens_used,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                latency_ms=latency_ms,
                streaming=True
            )
        
    except WebSocketDisconnect:
        # Client disconnected, log if we have partial data
        if start_time and tokens_used > 0:
            LLMLogger.log_llm_operation(
                action="generate_feedback_disconnected",
                message=f"Feedback generation interrupted for interview {interview_id}",
                user_id=user.id,
                company_id=user.company_id,
                interview_id=interview_id,
                model=model_used,
                tokens_used=tokens_used,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                latency_ms=int((time.time() - start_time) * 1000) if start_time else 0,
                streaming=True
            )
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        await websocket.send_json({
            "type": "error",
            "message": f"Internal error: {str(e)}",
            "code": "INTERNAL_ERROR"
        })
        LLMLogger.log_llm_operation(
            action="generate_feedback_error",
            message=f"Internal error generating feedback for interview {interview_id}: {str(e)}",
            user_id=user.id if user else None,
            company_id=user.company_id if user else None,
            interview_id=interview_id,
            error_type=type(e).__name__,
            error_message=str(e),
            metadata={"traceback": error_trace}
        )
    finally:
        # Clean up database connection
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass
        try:
            await websocket.close()
        except Exception:
            pass
