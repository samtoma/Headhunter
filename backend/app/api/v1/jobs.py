from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
import json
from app.core.database import get_db
from app.models.models import Job, ParsedCV, User, CV, UserRole
from app.api.deps import get_current_user
from app.services.parser import generate_job_metadata
from app.services.sync import touch_company_state

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# --- Schemas ---
from app.schemas.job import JobCreate, JobUpdate, JobOut, CandidateMatch
from app.schemas.company import CompanyOut as CompanySchema

# --- Schemas ---
# Schemas are now imported from app.schemas.job

# --- Endpoints ---

# 1. COMPANY PROFILE ENDPOINTS REMOVED (Moved to company.py)

# 2. ANALYZE (With Company Context)
@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_job_request(
    title: str = Body(..., embed=True),
    location: Optional[str] = Body(None),
    employment_type: Optional[str] = Body(None),
    fine_tuning: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI Endpoint to generate comprehensive job description from a title."""
    
    # Fetch Company Context from current user
    company = current_user.company
    context = {}
    if company:
        context = {
            "name": company.name,
            "description": company.description,
            "culture": company.culture,
            "mission": company.mission,
            "values": company.values
        }
    
    return await generate_job_metadata(
        title=title,
        company_context=context,
        fine_tuning=fine_tuning,
        location=location,
        employment_type=employment_type
    )

@router.post("/{job_id}/regenerate", response_model=Dict[str, Any])
async def regenerate_job_description(
    job_id: int,
    fine_tuning: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerate job description with optional fine-tuning instructions"""
    
    # Get existing job
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == current_user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Get company context
    company = current_user.company
    context = {}
    if company:
        context = {
            "name": company.name,
            "description": company.description,
            "culture": company.culture,
            "mission": company.mission,
            "values": company.values
        }
    
    # Generate new description
    new_data = await generate_job_metadata(
        title=job.title,
        company_context=context,
        fine_tuning=fine_tuning,
        location=job.location,
        employment_type=job.employment_type
    )
    
    # Update job with new data
    for key, value in new_data.items():
        if value is not None and hasattr(job, key):
            setattr(job, key, value)
    
    db.commit()
    db.refresh(job)
    return new_data

@router.post("/matches", response_model=List[CandidateMatch])
async def match_candidates_for_new_job(
    job_title: str = Body(..., embed=True),
    required_experience: int = Body(...),
    skills_required: List[str] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Semantic Search via SearchEngine
    from app.services.search.factory import get_search_engine
    
    search_engine = get_search_engine()
    
    # Construct query from job details
    query_text = f"Job Title: {job_title}\n"
    if skills_required:
        query_text += f"Required Skills: {', '.join(skills_required)}\n"
    
    # Perform vector search
    # We ask for more results than needed to filter them later
    vector_results = await search_engine.search(
        query_text=query_text, 
        n_results=50,
        filters={"company_id": current_user.company_id} if current_user.company_id else None
    )
    
    # Map vector results to a dictionary for easy lookup
    vector_scores = {res['id']: res['score'] for res in vector_results}
    
    # Fetch full candidate objects for the top vector results OR fall back to all if no vector results
    # Ideally we only fetch the candidates returned by vector search to save DB resources
    if vector_results:
        candidate_ids = [int(res['id']) for res in vector_results]
        candidates = db.query(ParsedCV).join(ParsedCV.cv).filter(CV.id.in_(candidate_ids)).options(joinedload(ParsedCV.cv)).all()
    else:
        # Fallback to fetching all if vector search fails or returns nothing (e.g. empty DB)
        candidates = db.query(ParsedCV).join(ParsedCV.cv).filter(CV.company_id == current_user.company_id).options(joinedload(ParsedCV.cv)).all()

    matches = []
    req_skills_set = set(s.lower() for s in skills_required)
    
    for cand in candidates:
        score = 0
        matched = []
        
        # 1. Vector Score (Normalized 0-100)
        # We give it significant weight
        v_score = vector_scores.get(str(cand.cv_id), 0) * 100
        score += v_score * 0.5 # 50% weight to semantic match
        
        # 2. Keyword Matching (Existing Logic)
        cand_skills = []
        if cand.skills:
            try:
                cand_skills = json.loads(cand.skills)
            except Exception:
                pass
            
        keyword_score = 0
        for s in cand_skills:
            if s.lower() in req_skills_set:
                keyword_score += 10
                matched.append(s)
        
        # Cap keyword score contribution
        score += min(keyword_score, 40) # Max 40 points from keywords
        
        # 3. Experience
        cand_exp = cand.experience_years or 0
        if cand_exp >= required_experience:
            score += 10
        elif cand_exp >= (required_experience - 1):
            score += 5
            
        is_silver = False
        for app in cand.cv.applications:
            if app.status == "Silver Medalist":
                is_silver = True
                break
        
        if is_silver:
            score += 5
        
        if score > 0:
            matches.append({
                "id": cand.cv_id,
                "name": cand.name or "Unknown",
                "score": int(score), # Round to integer
                "skills_matched": matched,
                "status": "Silver Medalist" if is_silver else "Candidate"
            })
            
    matches.sort(key=lambda x: x['score'], reverse=True)
    return matches[:10]

@router.post("/", response_model=JobOut)
def create_job(job: JobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        raise HTTPException(403, "Not authorized to create jobs")
        
    job_dict = job.model_dump()
    
    # Serialize list fields
    list_fields = ['skills_required', 'responsibilities', 'qualifications', 'preferred_qualifications', 'benefits']
    for field in list_fields:
        if job_dict.get(field) is not None:
            job_dict[field] = json.dumps(job_dict[field])
    
    new_job = Job(**job_dict, company_id=current_user.company_id)
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    touch_company_state(db, current_user.company_id)
    return new_job

@router.get("/", response_model=List[JobOut])
def list_jobs(
    status: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Job).filter(Job.company_id == current_user.company_id)
    
    # Filter by status if provided
    if status:
        query = query.filter(Job.status == status)
    
    # If Interviewer, filter by department
    if current_user.role == UserRole.INTERVIEWER and current_user.department:
        query = query.filter(Job.department == current_user.department)
        
    jobs = query.options(joinedload(Job.applications)).all()
    results = []
    for j in jobs:
        j_dict = j.__dict__.copy()
        j_dict['candidate_count'] = len(j.applications)
        results.append(j_dict)
    return results

@router.patch("/{job_id}", response_model=JobOut)
def update_job(job_id: int, job_data: JobUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        raise HTTPException(403, "Not authorized to update jobs")

    job = db.query(Job).filter(Job.id == job_id, Job.company_id == current_user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Update fields
    update_data = job_data.model_dump(exclude_unset=True)
    
    # Handle list fields serialization
    list_fields = ['skills_required', 'responsibilities', 'qualifications', 'preferred_qualifications', 'benefits']
    for field in list_fields:
        if field in update_data and update_data[field] is not None:
            update_data[field] = json.dumps(update_data[field])
            
    for key, value in update_data.items():
        setattr(job, key, value)
        
    db.commit()
    db.refresh(job)
    touch_company_state(db, current_user.company_id)
    return job

@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        raise HTTPException(403, "Not authorized to delete jobs")

    job = db.query(Job).filter(Job.id == job_id, Job.company_id == current_user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    db.delete(job)
    db.commit()
    touch_company_state(db, current_user.company_id)
    return {"status": "deleted"}