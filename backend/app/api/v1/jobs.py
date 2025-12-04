from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Any, Dict
import json
from app.core.database import get_db
from typing import List, Optional, Any, Dict
import json
from app.core.database import get_db
from app.models.models import Job, ParsedCV, User, CV, UserRole, Application, Department
from app.api.deps import get_current_user
from app.services.parser import generate_job_metadata
from app.services.sync import touch_company_state
from app.schemas.job import JobCreate, JobUpdate, JobOut, CandidateMatch, BulkAssignRequest
from fastapi_cache.decorator import cache
from fastapi_cache import FastAPICache

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# --- Schemas ---


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
    department_id: Optional[int] = Body(None),
    department_name: Optional[str] = Body(None),
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
        
    # Fetch Department Context
    dept = None
    if department_id:
        dept = db.query(Department).filter(Department.id == department_id, Department.company_id == current_user.company_id).first()
    elif department_name:
        dept = db.query(Department).filter(Department.name == department_name, Department.company_id == current_user.company_id).first()
        
    if dept:
        context["department_name"] = dept.name
        context["department_description"] = dept.description
        context["department_technologies"] = dept.technologies
        
        # Check for job templates
        if dept.job_templates:
            try:
                templates = json.loads(dept.job_templates)
                # Simple keyword match for now
                for t in templates:
                    if t.get("title_match", "").lower() in title.lower():
                        context["job_template_description"] = t.get("description")
                        context["job_template_technologies"] = t.get("technologies")
                        break
            except Exception:
                pass
    
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
    fine_tuning: Optional[str] = Body(None, embed=True),
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

@router.post("/bulk_assign")
async def bulk_assign_candidates(
    data: BulkAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
        raise HTTPException(403, "Not authorized to assign candidates")

    # Verify Job exists and belongs to company
    job = db.query(Job).filter(Job.id == data.job_id, Job.company_id == current_user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
        
    # Hiring Manager Check
    if current_user.role == UserRole.HIRING_MANAGER:
        if job.department != current_user.department:
             raise HTTPException(403, "Not authorized to assign to jobs outside your department")

    count = 0
    for cv_id in data.cv_ids:
        # Verify CV belongs to company
        cv = db.query(CV).filter(CV.id == cv_id, CV.company_id == current_user.company_id).first()
        if not cv:
            continue
            
        # Check if already assigned
        exists = db.query(Application).filter(Application.job_id == data.job_id, Application.cv_id == cv_id).first()
        if not exists:
            app = Application(job_id=data.job_id, cv_id=cv_id, status="New")
            db.add(app)
            count += 1
            
    if count > 0:
        db.commit()
        touch_company_state(db, current_user.company_id)
        
    return {"status": "assigned", "count": count}

@router.post("/", response_model=JobOut)
async def create_job(job: JobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
        raise HTTPException(403, "Not authorized to create jobs")
        
    job_dict = job.model_dump()
    
    # Hiring Manager Restriction: Can only create jobs for their department
    if current_user.role == UserRole.HIRING_MANAGER:
        if not current_user.department:
             raise HTTPException(400, "Hiring Manager must have a department assigned to create jobs")
        job_dict['department'] = current_user.department
    
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
    
    # Invalidate cache
    await invalidate_job_cache(current_user.company_id)
    
    return new_job

async def invalidate_job_cache(company_id: int):
    """Invalidate job list cache for a company"""
    await FastAPICache.clear(namespace="headhunter-cache")

@router.get("/", response_model=List[JobOut])
@cache(expire=60)
async def list_jobs(
    status: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Job).filter(Job.company_id == current_user.company_id)
    
    # Filter by status if provided
    if status:
        query = query.filter(Job.status == status)
        
    # Filter by department if provided (for Admins/Recruiters who want to filter)
    if department:
        query = query.filter(Job.department == department)
    
    # If Interviewer or Hiring Manager, filter by department
    if current_user.role in [UserRole.INTERVIEWER, UserRole.HIRING_MANAGER] and current_user.department:
        query = query.filter(Job.department == current_user.department)
        
    jobs = query.options(joinedload(Job.applications)).all()
    results = []
    for j in jobs:
        # Count only active candidates (exclude Rejected/Withdrawn)
        active_apps = [app for app in j.applications if app.status not in ["Rejected", "Withdrawn"]]
        
        # Create a clean dict from the ORM object, excluding internal state
        j_dict = {k: v for k, v in j.__dict__.items() if not k.startswith('_')}
        j_dict['candidate_count'] = len(active_apps)
        
        # Validate and create Pydantic model
        results.append(JobOut.model_validate(j_dict))
        
    return results

@router.patch("/{job_id}", response_model=JobOut)
async def update_job(job_id: int, job_data: JobUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
        raise HTTPException(403, "Not authorized to update jobs")

    job = db.query(Job).filter(Job.id == job_id, Job.company_id == current_user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
        
    # Hiring Manager Restriction: Can only update jobs in their department
    if current_user.role == UserRole.HIRING_MANAGER:
        if job.department != current_user.department:
             raise HTTPException(403, "Not authorized to update jobs outside your department")
    
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
    
    # Invalidate cache
    await invalidate_job_cache(current_user.company_id)
    
    return job

@router.delete("/{job_id}")
async def delete_job(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
        raise HTTPException(403, "Not authorized to delete jobs")

    job = db.query(Job).filter(Job.id == job_id, Job.company_id == current_user.company_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
        
    # Hiring Manager Restriction: Can only delete jobs in their department
    if current_user.role == UserRole.HIRING_MANAGER:
        if job.department != current_user.department:
             raise HTTPException(403, "Not authorized to delete jobs outside your department")
    db.delete(job)
    db.commit()
    touch_company_state(db, current_user.company_id)
    
    # Invalidate cache
    await invalidate_job_cache(current_user.company_id)
    
    return {"status": "deleted"}