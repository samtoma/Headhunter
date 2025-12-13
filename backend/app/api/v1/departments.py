from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Department, User, UserRole, Company
from app.api.deps import get_current_user
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.services.sync import touch_company_state
from app.services.parser import generate_department_profile
from app.api.v1.activity import log_system_activity


# Schema for AI generation request
class GenerateDepartmentRequest(BaseModel):
    """Request schema for AI department profile generation."""
    name: str
    fine_tuning: Optional[str] = None


router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("/", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    depts = db.query(Department).filter(Department.company_id == current_user.company_id).all()
    
    # Add user names for audit attribution
    for dept in depts:
        if dept.creator:
            dept.created_by_name = dept.creator.full_name or dept.creator.email
        if dept.modifier:
            dept.modified_by_name = dept.modifier.full_name or dept.modifier.email
    return depts

@router.post("/", response_model=DepartmentOut)
def create_department(
    dept: DepartmentCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
        raise HTTPException(403, "Not authorized to create departments")
    
    new_dept = Department(
        **dept.model_dump(), 
        company_id=current_user.company_id,
        created_by=current_user.id
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    touch_company_state(db, current_user.company_id)
    
    # Audit log: department created
    log_system_activity(
        db, "department_created", current_user.id, current_user.company_id,
        {"department_id": new_dept.id, "name": new_dept.name}
    )
    
    # Add user name for response
    new_dept.created_by_name = current_user.full_name or current_user.email
    return new_dept

@router.get("/{dept_id}", response_model=DepartmentOut)
def get_department(dept_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == current_user.company_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    
    # Add user names for response
    if dept.creator:
        dept.created_by_name = dept.creator.full_name or dept.creator.email
    if dept.modifier:
        dept.modified_by_name = dept.modifier.full_name or dept.modifier.email
    return dept

@router.patch("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int, 
    data: DepartmentUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
        raise HTTPException(403, "Not authorized to update departments")

    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == current_user.company_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    
    old_name = dept.name
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)
    
    # Set modified_by for audit trail
    dept.modified_by = current_user.id
        
    db.commit()
    db.refresh(dept)
    touch_company_state(db, current_user.company_id)
    
    # Audit log: department updated
    log_system_activity(
        db, "department_updated", current_user.id, current_user.company_id,
        {"department_id": dept.id, "name": dept.name, "changes": update_data}
    )
    
    # Add user names for response
    if dept.creator:
        dept.created_by_name = dept.creator.full_name or dept.creator.email
    dept.modified_by_name = current_user.full_name or current_user.email
    return dept

@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Only admins can delete departments")

    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == current_user.company_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    
    dept_name = dept.name
    db.delete(dept)
    db.commit()
    touch_company_state(db, current_user.company_id)
    
    # Audit log: department deleted
    log_system_activity(
        db, "department_deleted", current_user.id, current_user.company_id,
        {"department_id": dept_id, "name": dept_name}
    )
    
    return {"status": "deleted"}


@router.post("/generate")
async def generate_department(
    request: GenerateDepartmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a department profile using AI.
    
    Takes a department name and optional fine-tuning instructions,
    returns AI-generated description, technologies, and job templates.
    Does NOT save to database - user reviews and saves manually.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]:
        raise HTTPException(403, "Not authorized to generate department profiles")
    
    # Get company context if available
    company_context = None
    if current_user.company_id:
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        if company:
            company_context = {
                "name": company.name,
                "description": company.description or "",
                "industry": company.industry or "technology"
            }
    
    # Generate the profile using AI
    result = await generate_department_profile(
        name=request.name,
        company_context=company_context,
        fine_tuning=request.fine_tuning
    )
    
    if not result:
        raise HTTPException(500, "Failed to generate department profile. Please try again.")
    
    return result
