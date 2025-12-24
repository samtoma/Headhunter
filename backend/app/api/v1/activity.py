from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import logging
from app.core.database import get_db
from app.models.models import ActivityLog, User, Interview
from app.api.deps import get_current_user
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/activity", tags=["Activity"])

def log_application_activity(
    db: Session,
    application_id: int,
    action: str,
    user_id: Optional[int] = None,
    company_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Helper function to log activity for an application"""
    try:
        log = ActivityLog(
            application_id=application_id,
            user_id=user_id,
            company_id=company_id,
            action=action,
            details=json.dumps(details) if details else None
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")


def log_system_activity(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    company_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None
):
    """
    Helper function to log system-wide activities (not application-specific).
    Used for actions like: department_created, job_created, user_invited, etc.
    """
    try:
        log = ActivityLog(
            application_id=None,  # System-wide, no specific application
            user_id=user_id,
            company_id=company_id,
            action=action,
            details=json.dumps(details) if details else None
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log system activity: {e}")

def _get_user_display_name(db: Session, user_id: Optional[int]) -> Optional[str]:
    """
    Helper to get user display name (full_name preferred, email as fallback).
    Returns None if user_id is None or user not found.
    """
    if not user_id:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    return user.full_name if user.full_name else user.email.split('@')[0]


@router.get("/application/{application_id}/timeline")
def get_application_timeline(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get merged timeline of activities and interviews for an application"""
    
    # 1. Fetch Activity Logs
    logs = db.query(ActivityLog).filter(ActivityLog.application_id == application_id).all()
    
    # 2. Fetch Interviews
    interviews = db.query(Interview).filter(Interview.application_id == application_id).all()
    
    timeline = []
    
    # Process Logs - include user_name for "who did what" attribution
    # Special care: if an interview was created, we often have both an 'interview_scheduled' log
    # AND the actual interview record. We include logs but might want to dedup if both represent same event.
    # For now, we prefer individual log entries for distinct actions.
    for log in logs:
        user_name = _get_user_display_name(db, log.user_id)
        timeline.append({
            "type": "log",
            "id": log.id,
            "action": log.action,
            "details": json.loads(log.details) if log.details else {},
            "created_at": log.created_at,
            "user_id": log.user_id,
            "user_name": user_name
        })
        
    # Process Interviews - Only if they represent a unique state not already in logs
    # Actually, the user complained about DUPLICATE logs. 
    # The current code adds EVERY interview as "interview_logged".
    # This is redundant if "interview_scheduled" log already exists.
    for interview in interviews:
        # Check if we already have a log for this interview creation
        # (Very basic dedup: if interview_scheduled log exists with same timestamp/details)
        # However, a simpler fix is to NOT add "interview_logged" if we already have activity logs for it.
        # Let's keep the logic clean: only show interviews if they have an outcome/feedback (meaning they were conducted)
        # or if we want to show them as distinct cards.
        
        # UI (UnifiedActivityFeed) already handles deduplication by action name if needed,
        # but here we can be more proactive.
        interviewer_name = _get_user_display_name(db, interview.interviewer_id)
        
        # Only add as "interview" if it's not strictly a scheduled event (or let UI handle it)
        # Actually, UnifiedActivityFeed.jsx:36 filters out 'interview_scheduled' and 'interview_updated' from timeline
        # but it ADDS all interviews. This is why we see duplicates if the timeline ALSO contains interview logs.
        
        timeline.append({
            "type": "interview",
            "id": interview.id,
            "action": "interview_conducting", # Change name to differentiate from logs
            "details": {
                "step": interview.step,
                "outcome": interview.outcome,
                "rating": interview.rating,
                "feedback": interview.feedback,
                "status": interview.status,
                "scheduled_at": str(interview.scheduled_at) if interview.scheduled_at else None
            },
            "created_at": interview.created_at,
            "user_id": interview.interviewer_id,
            "user_name": interviewer_name
        })
        
    # Sort by date descending
    timeline.sort(key=lambda x: x['created_at'], reverse=True)
    
    return timeline
