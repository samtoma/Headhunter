from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import CV, ParsedCV
from app.schemas.cv import CVResponse, UpdateProfile

router = APIRouter(prefix="/profiles", tags=["Profiles"])

@router.get("/", response_model=List[CVResponse])
def get_all_profiles(
    job_id: Optional[int] = Query(None), # <--- New filter
    db: Session = Depends(get_db)
):
    query = db.query(CV).options(joinedload(CV.parsed_data))
    
    if job_id:
        query = query.filter(CV.job_id == job_id)
        
    results = query.all()
    
    # Smart Experience Logic
    for cv in results:
        cv.years_since_upload = 0.0
        cv.projected_experience = 0
        cv.is_outdated = False

        if cv.uploaded_at:
            delta = datetime.now(timezone.utc) - cv.uploaded_at
            years_passed = delta.days / 365.25
            cv.years_since_upload = round(years_passed, 1)
            if years_passed > 2.0: cv.is_outdated = True

            base_exp = cv.parsed_data.experience_years if (cv.parsed_data and cv.parsed_data.experience_years) else 0
            cv.projected_experience = base_exp + int(years_passed)

    return results

@router.patch("/{cv_id}", response_model=CVResponse)
def update_profile(cv_id: int, update_data: UpdateProfile, db: Session = Depends(get_db)):
    parsed_record = db.query(ParsedCV).filter(ParsedCV.cv_id == cv_id).first()
    if not parsed_record:
        raise HTTPException(404, "Profile data not found")

    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(parsed_record, key, value)

    db.commit()
    return db.query(CV).filter(CV.id == cv_id).options(joinedload(CV.parsed_data)).first()