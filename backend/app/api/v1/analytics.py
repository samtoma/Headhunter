from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
import csv
import io
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, UserRole, Application, Job, CV, ParsedCV

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def verify_analytics_access(user: User):
    """
    Enforce role-based access to analytics.
    Admins/Super Admins: Full access.
    Hiring Managers: Access (filtered by department in logic).
    Recruiters: Access.
    Interviewers: No access.
    """
    if user.role == UserRole.INTERVIEWER:
        raise HTTPException(403, "Access denied")

@router.get("/dashboard")
def get_dashboard_stats(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_analytics_access(current_user)
    
    # Base query filters
    filters = []
    if current_user.role != UserRole.SUPER_ADMIN:
        filters.append(Job.company_id == current_user.company_id)
        
    if current_user.role == UserRole.HIRING_MANAGER and current_user.department:
        filters.append(Job.department == current_user.department)

    # 1. Pipeline Metrics (Funnel)
    # Count applications in each stage
    pipeline_query = db.query(
        Application.status, func.count(Application.id)
    ).join(Job).filter(*filters).group_by(Application.status).all()
    
    pipeline_metrics = {status: count for status, count in pipeline_query}
    
    # Ensure standard stages exist
    standard_stages = ["New", "Screening", "Interview", "Offer", "Hired", "Rejected"]
    formatted_pipeline = [{"name": stage, "value": pipeline_metrics.get(stage, 0)} for stage in standard_stages]

    # 2. Activity Over Time (Applications per day)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    activity_query = db.query(
        func.date(Application.applied_at).label('date'),
        func.count(Application.id)
    ).join(Job).filter(
        *filters,
        Application.applied_at >= start_date
    ).group_by('date').order_by('date').all()
    
    activity_data = [{"date": str(row.date), "applications": row[1]} for row in activity_query]

    # 3. Time to Hire (Avg days from Applied -> Hired)
    # This is complex in SQL, doing simple python calc for MVP
    hired_apps = db.query(Application).join(Job).filter(
        *filters,
        Application.status == "Hired",
        Application.applied_at >= start_date
    ).all()
    
    total_days_for_avg = 0
    count_for_avg = 0
    for app in hired_apps:
        if app.created_at and app.updated_at:
            # Calculate days between application creation and hired status update
            days_diff = (app.updated_at - app.created_at).days
            total_days_for_avg += days_diff
            count_for_avg += 1
    
    avg_time_to_hire = round(total_days_for_avg / count_for_avg) if count_for_avg > 0 else 0
    total_hires = len(hired_apps) # Total hires in the period, regardless of date availability for avg_time_to_hire
    
    # 4. Active Jobs
    active_jobs_count = db.query(Job).filter(*filters, Job.is_active).count()

    return {
        "pipeline": formatted_pipeline,
        "activity": activity_data,
        "kpi": {
            "total_hires": total_hires,
            "active_jobs": active_jobs_count,
            "avg_time_to_hire": "N/A" # Placeholder until we add better tracking
        }
    }

@router.get("/export")
def export_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_analytics_access(current_user)
    
    filters = []
    if current_user.role != UserRole.SUPER_ADMIN:
        filters.append(Job.company_id == current_user.company_id)
        
    if current_user.role == UserRole.HIRING_MANAGER and current_user.department:
        filters.append(Job.department == current_user.department)

    # Fetch all applications with related data
    results = db.query(Application).join(Job).join(CV).outerjoin(ParsedCV).filter(*filters).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Candidate Name", "Email", "Phone", "Job Title", "Department", 
        "Status", "Applied Date", "Source", "Experience (Years)", "Skills"
    ])
    
    for app in results:
        parsed = app.cv.parsed_data
        writer.writerow([
            parsed.name if parsed else "Unknown",
            parsed.email if parsed else "",
            parsed.phone if parsed else "",
            app.job.title,
            app.job.department or "General",
            app.status,
            app.applied_at.strftime("%Y-%m-%d") if app.applied_at else "",
            "Upload", # Placeholder for source
            parsed.experience_years if parsed else 0,
            parsed.skills if parsed else ""
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates_export.csv"}
    )
