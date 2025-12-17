"""
Public API endpoints for landing pages.
These endpoints are unauthenticated and allow candidates to view jobs and apply.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import Optional
import json
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import Job, CV, Application, ParsedCV, Company
from pydantic import BaseModel


router = APIRouter(prefix="/public", tags=["Public"])


# ============================================================================
# Schemas for Public API
# ============================================================================

class PublicJobOut(BaseModel):
    """Public-facing job information (limited fields for security)."""
    id: int
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    salary_range: Optional[str] = None
    responsibilities: list = []
    qualifications: list = []
    preferred_qualifications: list = []
    benefits: list = []
    remote_policy: Optional[str] = None
    
    # Company branding
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    company_tagline: Optional[str] = None
    company_website: Optional[str] = None


class PublicApplicationResponse(BaseModel):
    """Response after successful application submission."""
    success: bool
    message: str
    application_id: Optional[int] = None


# ============================================================================
# Helper Functions
# ============================================================================

def parse_json_field(value: Optional[str]) -> list:
    """Parse a JSON string field to a list."""
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def extract_tracking_data(request: Request, utm_source: str = None, utm_medium: str = None, 
                           utm_campaign: str = None, utm_term: str = None, 
                           utm_content: str = None, referrer: str = None) -> dict:
    """Extract and compile tracking data from request and form fields."""
    tracking = {
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "utm_term": utm_term,
        "utm_content": utm_content,
        "referrer": referrer,
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
        "applied_at": datetime.now(timezone.utc).isoformat()
    }
    # Remove None values
    return {k: v for k, v in tracking.items() if v is not None}


# ============================================================================
# Public Endpoints
# ============================================================================

@router.get("/jobs/{slug}", response_model=PublicJobOut)
async def get_public_job(slug: str, db: Session = Depends(get_db)):
    """
    Get public job details by landing page slug.
    This endpoint is unauthenticated and returns limited job information.
    """
    # Find job by slug
    job = db.query(Job).filter(
        Job.landing_page_slug == slug,
        Job.landing_page_enabled.is_(True),
        Job.is_active.is_(True)
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or landing page not enabled")
    
    # Get company for branding
    company = db.query(Company).filter(Company.id == job.company_id).first()
    
    return PublicJobOut(
        id=job.id,
        title=job.title,
        department=job.department,
        description=job.description,
        location=job.location,
        employment_type=job.employment_type,
        salary_range=job.salary_range,
        responsibilities=parse_json_field(job.responsibilities),
        qualifications=parse_json_field(job.qualifications),
        preferred_qualifications=parse_json_field(job.preferred_qualifications),
        benefits=parse_json_field(job.benefits),
        remote_policy=job.remote_policy,
        company_name=company.name if company else None,
        company_logo=company.logo_url if company else None,
        company_tagline=company.tagline if company else None,
        company_website=company.website if company else None
    )


@router.post("/jobs/{slug}/apply", response_model=PublicApplicationResponse)
async def apply_to_job(
    slug: str,
    request: Request,
    cv_file: UploadFile = File(...),
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    # UTM tracking parameters
    utm_source: Optional[str] = Form(None),
    utm_medium: Optional[str] = Form(None),
    utm_campaign: Optional[str] = Form(None),
    utm_term: Optional[str] = Form(None),
    utm_content: Optional[str] = Form(None),
    referrer: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Submit an application to a job via landing page.
    This endpoint is unauthenticated - candidates can apply directly.
    """
    # Find job by slug
    job = db.query(Job).filter(
        Job.landing_page_slug == slug,
        Job.landing_page_enabled.is_(True),
        Job.is_active.is_(True)
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or landing page not enabled")
    
    # Validate file type
    allowed_extensions = {'.pdf', '.doc', '.docx'}
    file_ext = os.path.splitext(cv_file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")
    
    # Create upload directory if it doesn't exist (use same path as cv.py)
    upload_dir = Path("data/raw")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}_{cv_file.filename}"
    filepath = upload_dir / unique_filename
    
    # Save file
    try:
        contents = await cv_file.read()
        with open(filepath, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create CV record
    cv = CV(
        filename=cv_file.filename,
        filepath=str(filepath),
        is_parsed=False,
        company_id=job.company_id,
        uploaded_by=None,  # No user for public submissions
        original_source="landing_page"  # Track origin
    )
    db.add(cv)
    db.flush()  # Get the CV ID
    
    # Create ParsedCV with basic info from form
    parsed_cv = ParsedCV(
        cv_id=cv.id,
        name=name,
        email=email,
        phone=phone
    )
    db.add(parsed_cv)
    
    # Compile tracking data
    tracking_data = extract_tracking_data(
        request=request,
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        utm_term=utm_term,
        utm_content=utm_content,
        referrer=referrer
    )
    
    # Create Application
    application = Application(
        cv_id=cv.id,
        job_id=job.id,
        status="New",
        source="landing_page",
        tracking_data=json.dumps(tracking_data),
        assigned_by=None  # No user for public submissions
    )
    db.add(application)
    
    try:
        db.commit()
        db.refresh(application)
        
        # Log activity for timeline
        from app.api.v1.activity import log_application_activity
        log_application_activity(
            db, application.id, "added_to_pipeline",
            user_id=None,  # No user for public submissions
            company_id=job.company_id,
            details={
                "job_id": job.id,
                "job_title": job.title,
                "source": "landing_page",
                "candidate_name": name,
                "candidate_email": email
            }
        )
    except Exception as e:
        db.rollback()
        # Clean up uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Failed to create application: {str(e)}")
    
    return PublicApplicationResponse(
        success=True,
        message="Application submitted successfully! We'll be in touch soon.",
        application_id=application.id
    )
