from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import CV, ParsedCV, Application, User, UserRole, Interview, Job
from app.api.deps import get_current_user
from app.schemas.cv import CVResponse, UpdateProfile, PaginatedResponse
from sqlalchemy import or_, desc, asc, func, case

router = APIRouter(prefix="/profiles", tags=["Profiles"])

@router.get("/", response_model=PaginatedResponse)
def get_all_profiles(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    job_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CV).options(
        joinedload(CV.parsed_data),
        joinedload(CV.applications).joinedload(Application.interviews)
    ).filter(CV.company_id == current_user.company_id)
    
    # Track joins to avoid duplicates
    joined_application = False
    joined_parsed_cv = False

    # --- INTERVIEWER RESTRICTIONS ---
    if current_user.role == UserRole.INTERVIEWER:
        # Only show candidates with assigned interviews
        query = query.join(Application).join(Interview).filter(Interview.interviewer_id == current_user.id)
        joined_application = True

    # --- HIRING MANAGER RESTRICTIONS ---
    if current_user.role == UserRole.HIRING_MANAGER:
        if current_user.department:
            if not joined_application:
                query = query.join(Application)
                joined_application = True
            query = query.join(Job).filter(Job.department == current_user.department)
        else:
            # If HM has no department, they see nothing (safe default)
            query = query.filter(False)
    # --- FILTERS ---
    if job_id:
        if not joined_application:
            query = query.join(Application)
            joined_application = True
        query = query.filter(Application.job_id == job_id)

    if search:
        search_term = f"%{search}%"
        if not joined_parsed_cv:
            query = query.join(ParsedCV)
            joined_parsed_cv = True
            
        query = query.filter(
            or_(
                ParsedCV.name.ilike(search_term),
                ParsedCV.skills.ilike(search_term),
                ParsedCV.last_job_title.ilike(search_term),
                ParsedCV.last_company.ilike(search_term)
            )
        )

    # --- SORTING ---
    if sort_by == "oldest":
        query = query.order_by(asc(CV.uploaded_at))
    elif sort_by == "experience":
        if not joined_parsed_cv:
            query = query.join(ParsedCV)
            joined_parsed_cv = True
        query = query.order_by(desc(ParsedCV.experience_years))
    elif sort_by == "name":
        if not joined_parsed_cv:
            query = query.join(ParsedCV)
            joined_parsed_cv = True
        query = query.order_by(asc(ParsedCV.name))
    else:
        # Default: Newest first
        query = query.order_by(desc(CV.uploaded_at))

    # --- PAGINATION ---
    total = query.count()
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()
    
    current_year = datetime.now(timezone.utc).year

    for cv in results:
        cv.years_since_upload = 0.0
        cv.projected_experience = 0
        cv.is_outdated = False

        if cv.uploaded_at:
            uploaded_at = cv.uploaded_at
            if uploaded_at.tzinfo is None:
                uploaded_at = uploaded_at.replace(tzinfo=timezone.utc)
            
            delta = datetime.now(timezone.utc) - uploaded_at
            years_passed = delta.days / 365.25
            cv.years_since_upload = round(years_passed, 1)
            if years_passed > 2.0:
                cv.is_outdated = True

            # --- NEW LOGIC: NEGATIVE EXPERIENCE FOR STUDENTS ---
            grad_year = cv.parsed_data.bachelor_year if (cv.parsed_data and cv.parsed_data.bachelor_year) else None
            
            if grad_year and grad_year > current_year:
                 # Candidate is a student (Graduation in future)
                 # e.g. Now=2024, Grad=2026 -> Exp = -2
                 cv.projected_experience = current_year - grad_year
            else:
                 # Standard logic
                 base_exp = cv.parsed_data.experience_years if (cv.parsed_data and cv.parsed_data.experience_years) else 0
                 base_exp = cv.parsed_data.experience_years if (cv.parsed_data and cv.parsed_data.experience_years) else 0
                 cv.projected_experience = base_exp + int(years_passed)

        # --- MASK SALARY FOR INTERVIEWERS ---
        if current_user.role == UserRole.INTERVIEWER:
            if cv.parsed_data:
                cv.parsed_data.current_salary = "Confidential"
                cv.parsed_data.expected_salary = "Confidential"
            for app in cv.applications:
                app.current_salary = "Confidential"
                app.expected_salary = "Confidential"

    import math
    return {
        "items": results,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit),
        "limit": limit
    }

@router.get("/{cv_id}", response_model=CVResponse)
def get_profile(cv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(CV).options(
        joinedload(CV.parsed_data),
        joinedload(CV.applications).joinedload(Application.interviews)
    ).filter(CV.id == cv_id, CV.company_id == current_user.company_id)
    
    # --- INTERVIEWER RESTRICTIONS ---
    if current_user.role == UserRole.INTERVIEWER:
        # Only show candidates with assigned interviews
        query = query.join(Application).join(Interview).filter(Interview.interviewer_id == current_user.id)
    
    # --- HIRING MANAGER RESTRICTIONS ---
    if current_user.role == UserRole.HIRING_MANAGER:
        if current_user.department:
            query = query.join(Application).join(Job).filter(Job.department == current_user.department)
        else:
            query = query.filter(False)
    
    cv = query.first()
    if not cv:
        raise HTTPException(404, "Profile not found or access denied")
        
    # --- MASK SALARY FOR INTERVIEWERS ---
    if current_user.role == UserRole.INTERVIEWER:
        if cv.parsed_data:
            cv.parsed_data.current_salary = "Confidential"
            cv.parsed_data.expected_salary = "Confidential"
        for app in cv.applications:
            app.current_salary = "Confidential"
            app.expected_salary = "Confidential"
            
    # Calculate experience logic (same as list)
    current_year = datetime.now(timezone.utc).year
    cv.years_since_upload = 0.0
    cv.projected_experience = 0
    cv.is_outdated = False

    if cv.uploaded_at:
        uploaded_at = cv.uploaded_at
        if uploaded_at.tzinfo is None:
            uploaded_at = uploaded_at.replace(tzinfo=timezone.utc)
            
        delta = datetime.now(timezone.utc) - uploaded_at
        years_passed = delta.days / 365.25
        cv.years_since_upload = round(years_passed, 1)
        if years_passed > 2.0:
            cv.is_outdated = True

        grad_year = cv.parsed_data.bachelor_year if (cv.parsed_data and cv.parsed_data.bachelor_year) else None
        if grad_year and grad_year > current_year:
             cv.projected_experience = current_year - grad_year
        else:
             base_exp = cv.parsed_data.experience_years if (cv.parsed_data and cv.parsed_data.experience_years) else 0
             cv.projected_experience = base_exp + int(years_passed)
             
    return cv

@router.patch("/{cv_id}", response_model=CVResponse)
def update_profile(cv_id: int, update_data: UpdateProfile, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cv = db.query(CV).filter(CV.id == cv_id, CV.company_id == current_user.company_id).first()
    if not cv:
        raise HTTPException(404, "Profile not found")
    
    parsed_record = cv.parsed_data
    if not parsed_record:
        raise HTTPException(404, "Profile data not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(parsed_record, key, value)

    db.commit()
    return db.query(CV).filter(CV.id == cv_id).options(joinedload(CV.parsed_data)).first()

@router.get("/stats/overview")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Base query for company
    base_query = db.query(CV).filter(CV.company_id == current_user.company_id)
    
    total_candidates = base_query.count()
    
    # For status counts, we need to join applications
    # Count Hired
    hired = db.query(Application).join(CV).filter(
        CV.company_id == current_user.company_id,
        Application.status == "Hired"
    ).count()
    
    # Count Silver Medalist
    silver = db.query(Application).join(CV).filter(
        CV.company_id == current_user.company_id,
        Application.status == "Silver Medalist"
    ).count()
    
    # Active Jobs
    from app.models.models import Job
    active_jobs = db.query(Job).filter(
        Job.company_id == current_user.company_id,
        Job.is_active
    ).count()
    
    return {
        "totalCandidates": total_candidates,
        "hired": hired,
        "silver": silver,
        "activeJobs": active_jobs
    }

@router.get("/stats/department")
def get_department_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import Job, Application

    # 1. Job Counts per Department
    jobs_by_dept = db.query(
        Job.department, 
        func.count(Job.id).label('job_count'),
        func.sum(case((Job.is_active, 1), else_=0)).label('active_job_count')
    ).filter(
        Job.company_id == current_user.company_id
    ).group_by(Job.department).all()

    # 2. Application Counts per Department & Status
    apps_stats = db.query(
        Job.department,
        Application.status,
        func.count(Application.id).label('count')
    ).join(Job).filter(
        Job.company_id == current_user.company_id
    ).group_by(Job.department, Application.status).all()

    # Process results
    departments = {}
    
    # Initialize with job data
    for dept, total_jobs, active_jobs in jobs_by_dept:
        if not dept:
            continue
        departments[dept] = {
            "name": dept,
            "totalJobs": total_jobs,
            "activeJobs": active_jobs or 0,
            "totalCandidates": 0,
            "hired": 0,
            "offered": 0,
            "rejected": 0,
            "pipeline": {} # status -> count
        }

    # Fill in application data
    for dept, status, count in apps_stats:
        if not dept:
            continue
        if dept not in departments:
            departments[dept] = {
                "name": dept,
                "totalJobs": 0,
                "activeJobs": 0,
                "totalCandidates": 0,
                "hired": 0,
                "offered": 0,
                "rejected": 0,
                "pipeline": {}
            }
        
        d = departments[dept]
        d["totalCandidates"] += count
        
        if status == "Hired":
            d["hired"] += count
        elif status == "Offer":
            d["offered"] += count
        elif status == "Rejected":
            d["rejected"] += count
        
        # Add to pipeline view
        d["pipeline"][status] = count

    return list(departments.values())