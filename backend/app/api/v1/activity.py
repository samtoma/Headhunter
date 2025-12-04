from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.core.database import get_db
from app.models.models import ActivityLog, User, Interview
from app.api.deps import get_current_user
import json

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
        print(f"Failed to log activity: {e}")

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
    
    # Process Logs
    for log in logs:
        timeline.append({
            "type": "log",
            "id": log.id,
            "action": log.action,
            "details": json.loads(log.details) if log.details else {},
            "created_at": log.created_at,
            "user_id": log.user_id
        })
        
    # Process Interviews
    for interview in interviews:
        timeline.append({
            "type": "interview",
            "id": interview.id,
            "action": "interview_logged",
            "details": {
                "step": interview.step,
                "outcome": interview.outcome,
                "rating": interview.rating,
                "feedback": interview.feedback
            },
            "created_at": interview.created_at,
            "user_id": interview.interviewer_id
        })
        
    # Sort by date descending
    timeline.sort(key=lambda x: x['created_at'], reverse=True)
    
    return timeline
