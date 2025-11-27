from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.schemas import company as schemas
from app.api.v1.users import UserOut
from app.api.v1.jobs import JobOut
from app.api.deps import get_current_user

router = APIRouter(
    prefix="/companies",
    tags=["companies"]
)

@router.get("/me", response_model=schemas.CompanyOut)
def get_my_company(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User does not belong to any company")
    
    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return company

@router.patch("/me", response_model=schemas.CompanyOut)
def update_my_company(
    company_update: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User does not belong to any company")
    
    # Optional: Check if user is admin
    # if current_user.role != models.UserRole.ADMIN:
    #     raise HTTPException(status_code=403, detail="Only admins can update company settings")

    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    for key, value in company_update.dict(exclude_unset=True).items():
        setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    return company

@router.get("/", response_model=list[schemas.CompanyOut])
def list_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    companies = db.query(models.Company).offset(skip).limit(limit).all()
    
    results = []
    for c in companies:
        c.user_count = len(c.users)
        c.job_count = len(c.jobs)
        results.append(c)
        
    return results

@router.patch("/{company_id}", response_model=schemas.CompanyOut)
def update_company_by_id(
    company_id: int,
    company_update: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    for key, value in company_update.dict(exclude_unset=True).items():
        setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    return company
    db.commit()
    db.refresh(company)
    return company

@router.get("/{company_id}/users", response_model=list[UserOut])
def get_company_users(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = db.query(models.User).filter(models.User.company_id == company_id).all()
    return users

@router.get("/{company_id}/jobs", response_model=list[JobOut])
def get_company_jobs(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    jobs = db.query(models.Job).filter(models.Job.company_id == company_id).all()
    return jobs
