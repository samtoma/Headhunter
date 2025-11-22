from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import CV
from app.schemas.cv import CVResponse

router = APIRouter(prefix="/profiles", tags=["Profiles"])

@router.get("/", response_model=List[CVResponse])
def get_all_profiles(db: Session = Depends(get_db)):
    results = db.query(CV).options(joinedload(CV.parsed_data)).all()
    
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

            base_exp = cv.parsed_data.experience_years if (cv.parsed_data and cv.parsed_data.experience_years) else 0
            cv.projected_experience = base_exp + int(years_passed)

    return results