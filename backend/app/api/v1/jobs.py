from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, field_validator
from datetime import datetime
import json
from app.core.database import get_db
from app.models.models import Job, CV, ParsedCV, Company # <--- Added Company
from app.services.parser import generate_job_metadata

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# --- Schemas ---
class JobCreate(BaseModel):
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    required_experience: Optional[int] = 0
    skills_required: Optional[List[str]] = []

    @field_validator('skills_required', mode='before')
    @classmethod
    def parse_skills(cls, v):
        if isinstance(v, str):
            try: 
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except: return []
        return v if isinstance(v, list) else []

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    required_experience: Optional[int] = None
    skills_required: Optional[List[str]] = None

class JobOut(BaseModel):
    id: int
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    candidate_count: int = 0
    is_active: bool = True
    required_experience: int = 0
    skills_required: List[str] = []

    @field_validator('skills_required', mode='before')
    @classmethod
    def parse_skills_out(cls, v):
        if isinstance(v, str):
            try: 
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except: return []
        return v if isinstance(v, list) else []

    class Config:
        from_attributes = True

class CandidateMatch(BaseModel):
    id: int
    name: str
    score: int
    skills_matched: List[str]
    status: str

class CompanySchema(BaseModel):
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    culture: Optional[str] = None
    class Config: from_attributes = True

# --- Endpoints ---

# 1. COMPANY PROFILE ENDPOINTS
@router.get("/company", response_model=CompanySchema)
def get_company_profile(db: Session = Depends(get_db)):
    company = db.query(Company).first()
    if not company:
        return CompanySchema(name="My Company", description="Tech company", culture="Innovative")
    return company

@router.post("/company", response_model=CompanySchema)
def update_company_profile(data: CompanySchema, db: Session = Depends(get_db)):
    company = db.query(Company).first()
    if not company:
        company = Company(name=data.name)
        db.add(company)
    
    company.name = data.name
    company.industry = data.industry
    company.description = data.description
    company.culture = data.culture
    db.commit()
    db.refresh(company)
    return company

# 2. ANALYZE (With Company Context)
@router.post("/analyze", response_model=Dict[str, Any])
def analyze_job_request(title: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """AI Endpoint to generate job description and skills from a title."""
    
    # Fetch Company Context
    company = db.query(Company).first()
    context = {}
    if company:
        context = {
            "name": company.name,
            "description": company.description,
            "culture": company.culture
        }
    
    return generate_job_metadata(title, context)

@router.post("/matches", response_model=List[CandidateMatch])
def match_candidates_for_new_job(
    required_experience: int = Body(...),
    skills_required: List[str] = Body(...),
    db: Session = Depends(get_db)
):
    candidates = db.query(ParsedCV).options(joinedload(ParsedCV.cv)).all()
    matches = []
    req_skills_set = set(s.lower() for s in skills_required)
    
    for cand in candidates:
        score = 0
        matched = []
        
        cand_skills = []
        if cand.skills:
            try: cand_skills = json.loads(cand.skills)
            except: pass
            
        for s in cand_skills:
            if s.lower() in req_skills_set:
                score += 10
                matched.append(s)
        
        cand_exp = cand.experience_years or 0
        if cand_exp >= required_experience:
            score += 20
        elif cand_exp >= (required_experience - 1):
            score += 10
            
        is_silver = False
        for app in cand.cv.applications:
            if app.status == "Silver Medalist":
                is_silver = True
                break
        
        if is_silver: score += 15
        
        if score > 0:
            matches.append({
                "id": cand.cv_id,
                "name": cand.name or "Unknown",
                "score": score,
                "skills_matched": matched,
                "status": "Silver Medalist" if is_silver else "Candidate"
            })
            
    matches.sort(key=lambda x: x['score'], reverse=True)
    return matches[:10]

@router.post("/", response_model=JobOut)
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    job_dict = job.dict()
    if job.skills_required is not None:
        job_dict['skills_required'] = json.dumps(job.skills_required)
    
    new_job = Job(**job_dict)
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.get("/", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).options(joinedload(Job.applications)).all()
    results = []
    for j in jobs:
        j_dict = j.__dict__.copy()
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
    if job_data.title is not None:
        job.title = job_data.title
    if job_data.description is not None:
        job.description = job_data.description
    if job_data.required_experience is not None:
        job.required_experience = job_data.required_experience
    
    if job_data.skills_required is not None: 
        job.skills_required = json.dumps(job_data.skills_required)
        
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