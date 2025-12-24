from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Department, User, UserRole, Company
from app.api.deps import get_current_user
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.services.sync import touch_company_state
from app.services.parser import generate_department_profile
from app.api.v1.activity import log_system_activity
from app.core.llm_logging import LLMLogger
from jose import jwt, JWTError
from app.core.security import SECRET_KEY, ALGORITHM
import asyncio
import time


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
        fine_tuning=request.fine_tuning,
        user_id=current_user.id,
        company_id=current_user.company_id
    )
    
    if not result:
        raise HTTPException(500, "Failed to generate department profile. Please try again.")

    return result


# ==================== WebSocket for Department Generation Progress ====================

async def authenticate_department_websocket(websocket: WebSocket) -> Optional[User]:
    """Authenticate WebSocket connection for department generation"""
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return None

    db_gen = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            await websocket.close(code=1008, reason="Invalid token")
            return None

        db_gen = get_db()
        db = next(db_gen)
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return None

            return user
        finally:
            try:
                next(db_gen, None)
            except StopIteration:
                pass
    except JWTError:
        await websocket.close(code=1008, reason="Invalid token")
        return None
    except Exception as e:
        await websocket.close(code=1011, reason=f"Authentication error: {str(e)}")
        return None
    finally:
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass


@router.websocket("/generate/stream")
async def stream_department_generation(websocket: WebSocket):
    """
    WebSocket endpoint for streaming department generation with step-by-step progress.

    Connect with: ws://host/api/departments/generate/stream?token=YOUR_JWT_TOKEN&name=Department+Name&fine_tuning=Optional+Instructions

    Query parameters:
    - token: JWT authentication token
    - name: Department name (required)
    - fine_tuning: Optional fine-tuning instructions

    Messages sent to client:
    - {"type": "step", "step": 1, "total_steps": 5, "message": "Analyzing department requirements..."}
    - {"type": "complete", "data": {...}, "tokens_used": 1234, "model": "...", "latency_ms": 5000}
    - {"type": "error", "message": "error message", "code": "ERROR_CODE"}
    """
    await websocket.accept()

    # Authenticate user
    user = await authenticate_department_websocket(websocket)
    if not user:
        return

    db_gen = None
    start_time = None
    tokens_used = 0
    tokens_input = 0
    tokens_output = 0
    model_used = "gpt-4o-mini"
    latency_ms = 0

    try:
        # Get query parameters
        name = websocket.query_params.get("name")
        if not name:
            await websocket.send_json({
                "type": "error",
                "message": "Department name is required",
                "code": "MISSING_NAME"
            })
            await websocket.close()
            return

        fine_tuning = websocket.query_params.get("fine_tuning")

        # Get database session
        db_gen = get_db()
        db = next(db_gen)

        # Re-fetch user with company relationship
        user = db.query(User).options(joinedload(User.company)).filter(User.id == user.id).first()
        if not user:
            await websocket.send_json({
                "type": "error",
                "message": "User not found",
                "code": "USER_NOT_FOUND"
            })
            await websocket.close()
            return

        # Prepare company context
        company_context = {}
        if user.company:
            company_context = {
                "name": user.company.name,
                "description": user.company.description or "",
                "industry": user.company.industry or "technology"
            }

        # Start timing
        start_time = time.time()

        # Step 1: Analyzing requirements
        await websocket.send_json({
            "type": "step",
            "step": 1,
            "total_steps": 5,
            "message": "Analyzing department requirements and company context..."
        })
        await asyncio.sleep(0.5)  # Brief pause for UX

        # Step 2: Researching best practices
        await websocket.send_json({
            "type": "step",
            "step": 2,
            "total_steps": 5,
            "message": "Researching industry best practices and department structures..."
        })
        await asyncio.sleep(0.5)

        # Step 3: Generating structure
        await websocket.send_json({
            "type": "step",
            "step": 3,
            "total_steps": 5,
            "message": "Generating department structure and responsibilities..."
        })

        # Actually generate the department profile
        result = await generate_department_profile(
            name=name,
            company_context=company_context,
            fine_tuning=fine_tuning,
            user_id=user.id,
            company_id=user.company_id
        )

        if not result:
            await websocket.send_json({
                "type": "error",
                "message": "Failed to generate department profile",
                "code": "GENERATION_FAILED"
            })
            return

        # Step 4: Creating templates
        await websocket.send_json({
            "type": "step",
            "step": 4,
            "total_steps": 5,
            "message": "Creating job templates and role definitions..."
        })
        await asyncio.sleep(0.3)

        # Step 5: Finalizing
        await websocket.send_json({
            "type": "step",
            "step": 5,
            "total_steps": 5,
            "message": "Finalizing department profile..."
        })
        await asyncio.sleep(0.2)

        # Calculate final metrics (estimate since we don't have direct access to OpenAI usage)
        latency_ms = int((time.time() - start_time) * 1000)
        tokens_used = len(name) * 2 + len(fine_tuning or "") * 1.5 + 800  # Rough estimate
        tokens_input = int(tokens_used * 0.8)
        tokens_output = int(tokens_used * 0.2)

        # Log successful operation
        LLMLogger.log_llm_operation(
            action="generate_department_profile",
            message=f"Generated department profile for '{name}'",
            user_id=user.id,
            company_id=user.company_id,
            model=model_used,
            tokens_used=tokens_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            streaming=False,
            metadata={"name": name, "fine_tuning": fine_tuning}
        )

        # Send completion
        await websocket.send_json({
            "type": "complete",
            "data": result,
            "tokens_used": tokens_used,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "model": model_used,
            "latency_ms": latency_ms
        })

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000) if start_time else 0
        await websocket.send_json({
            "type": "error",
            "message": f"Internal error: {str(e)}",
            "code": "INTERNAL_ERROR"
        })

        # Log error
        LLMLogger.log_llm_operation(
            action="generate_department_profile_error",
            message=f"Error generating department profile for '{name}': {str(e)}",
            user_id=user.id if user else None,
            company_id=user.company_id if user else None,
            model=model_used,
            tokens_used=tokens_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            error_type=type(e).__name__,
            error_message=str(e)
        )
    finally:
        # Clean up database connection
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass
        try:
            await websocket.close()
        except Exception:
            pass
