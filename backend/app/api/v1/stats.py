from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.models import Job, Application, User, UserRole
from app.api.deps import get_current_user

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/departments", response_model=List[Dict[str, Any]])
def get_department_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.RECRUITER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 1. Get all jobs for the company
    jobs = db.query(Job).filter(Job.company_id == current_user.company_id).all()
    
    # 2. Group by department
    dept_stats = {}
    
    for job in jobs:
        dept = job.department or "Uncategorized"
        if dept not in dept_stats:
            dept_stats[dept] = {
                "department": dept,
                "active_jobs": 0,
                "total_jobs": 0,
                "total_candidates": 0,
                "hired_count": 0,
                "on_hold_jobs": 0
            }
            
        stats = dept_stats[dept]
        stats["total_jobs"] += 1
        if job.status == "Open" or (job.is_active and job.status != "Closed"):
            stats["active_jobs"] += 1
        if job.status == "On Hold":
            stats["on_hold_jobs"] += 1
            
        # Count candidates
        stats["total_candidates"] += len(job.applications)
        
        # Count hired
        hired = sum(1 for app in job.applications if app.status == "Hired")
        stats["hired_count"] += hired

    return list(dept_stats.values())
