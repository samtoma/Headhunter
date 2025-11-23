from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.models.models import Job

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# --- Schemas ---
class JobCreate(BaseModel):
    title: str
    department: Optional[str] = None
    description: Optional[str] = None

# New Schema for Updating (Archiving)
class JobUpdate(BaseModel):
    is_active: Optional[bool] = None

class JobOut(BaseModel):
    id: int
    title: str
    department: Optional[str] = None
    created_at: datetime
    candidate_count: int = 0
    is_active: bool = True  # <--- Added this field

    class Config:
        from_attributes = True

# --- Endpoints ---
@router.post("/", response_model=JobOut)
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    new_job = Job(**job.dict())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.get("/", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).options(joinedload(Job.applications)).all()
    results = []
    for j in jobs:
        j_dict = j.__dict__
        j_dict['candidate_count'] = len(j.applications)
        results.append(j_dict)
    return results

@router.patch("/{job_id}", response_model=JobOut)
def update_job(job_id: int, job_data: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    
    if job_data.is_active is not None:
        job.is_active = job_data.is_active
        
    db.commit()
    db.refresh(job)
    return job

@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    db.delete(job)
    db.commit()
    return {"status": "deleted"}