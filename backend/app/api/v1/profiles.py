from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import CV, ParsedCV, Application
from app.schemas.cv import CVResponse, UpdateProfile, PaginatedResponse
from sqlalchemy import or_, desc, asc

router = APIRouter(prefix="/profiles", tags=["Profiles"])

@router.get("/", response_model=PaginatedResponse)
def get_all_profiles(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    job_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(CV).options(joinedload(CV.parsed_data))
    
    # --- FILTERS ---
    if job_id:
        query = query.join(Application).filter(Application.job_id == job_id)

    if search:
        search_term = f"%{search}%"
        query = query.join(ParsedCV).filter(
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
        query = query.join(ParsedCV).order_by(desc(ParsedCV.experience_years))
    elif sort_by == "name":
        query = query.join(ParsedCV).order_by(asc(ParsedCV.name))
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
            delta = datetime.now(timezone.utc) - cv.uploaded_at
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
                 cv.projected_experience = base_exp + int(years_passed)

    import math
    return {
        "items": results,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit),
        "limit": limit
    }

@router.patch("/{cv_id}", response_model=CVResponse)
def update_profile(cv_id: int, update_data: UpdateProfile, db: Session = Depends(get_db)):
    parsed_record = db.query(ParsedCV).filter(ParsedCV.cv_id == cv_id).first()
    if not parsed_record:
        raise HTTPException(404, "Profile data not found")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(parsed_record, key, value)

    db.commit()
    return db.query(CV).filter(CV.id == cv_id).options(joinedload(CV.parsed_data)).first()