from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, ConfigDict
from app.core.database import get_db
from app.models.models import User, UserRole
from app.api.deps import get_current_user
from app.core.security import get_password_hash

from typing import Optional

router = APIRouter(prefix="/users", tags=["Users"])

class UserOut(BaseModel):
    id: int
    email: str
    is_active: bool
    role: str
    department: Optional[str] = None
    login_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "interviewer"
    department: Optional[str] = None

@router.get("/stats")
def get_user_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    query = db.query(User).filter(User.company_id == current_user.company_id)
    
    total = query.count()
    active = query.filter(User.is_active.is_(True)).count()
    recruiters = query.filter(User.role == UserRole.RECRUITER).count()
    interviewers = query.filter(User.role == UserRole.INTERVIEWER).count()
    admins = query.filter(User.role == UserRole.ADMIN).count()
    hiring_managers = query.filter(User.role == UserRole.HIRING_MANAGER).count()
    
    return {
        "total": total,
        "active": active,
        "roles": {
            "recruiter": recruiters,
            "interviewer": interviewers,
            "hiring_manager": hiring_managers,
            "admin": admins
        }
    }

@router.get("/", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(User).filter(User.is_active.is_(True))
    
    # Filter by Company
    if current_user.company_id:
        query = query.filter(User.company_id == current_user.company_id)
        
    # Filter by Department for Interviewers and Hiring Managers
    if current_user.role in [UserRole.INTERVIEWER, UserRole.HIRING_MANAGER] and current_user.department:
        query = query.filter(User.department == current_user.department)
        
    users = query.all()
    return users

@router.post("/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Check if user exists
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Enforce domain check
    if current_user.role == "admin":
        user_domain = user.email.split("@")[1]
        admin_domain = current_user.email.split("@")[1]
        if user_domain != admin_domain:
             raise HTTPException(status_code=400, detail="User must belong to the same domain")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        company_id=current_user.company_id,
        role=user.role,
        department=user.department,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Company check
    if current_user.role == "admin" and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Prevent self-delete
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    db.delete(user)
    db.commit()
    return {"status": "deleted"}

class UserUpdate(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None

@router.patch("/{user_id}", response_model=UserOut)
def update_user_role(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow Super Admin OR Company Admin (for their own company)
    if current_user.role == "super_admin":
        pass
    elif current_user.role == "admin":
        # Check if target user belongs to same company
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.company_id != current_user.company_id:
             raise HTTPException(status_code=404, detail="User not found")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_update.role:
        user.role = user_update.role
    if user_update.department is not None: # Allow clearing department
        user.department = user_update.department
        
    db.commit()
    db.refresh(user)
    return user

@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role_dedicated(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dedicated endpoint for role updates (matches frontend expectations)"""
    # Allow Super Admin OR Company Admin (for their own company)
    if current_user.role == "super_admin":
        pass
    elif current_user.role == "admin":
        # Check if target user belongs to same company
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.company_id != current_user.company_id:
             raise HTTPException(status_code=404, detail="User not found")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_update.role:
        user.role = user_update.role
    if user_update.department is not None:
        user.department = user_update.department
        
    db.commit()
    db.refresh(user)
    return user

# Avatar Upload Implementation
from fastapi import UploadFile, File
from PIL import Image
import io
import base64

# Register HEIC/HEIF support
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # HEIC support not available

@router.post("/me/avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB (in case of RGBA)
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
            
        # Resize to 150x150 (thumbnail)
        image.thumbnail((150, 150))
        
        # Compress
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=60, optimize=True)
        compressed_data = output.getvalue()
        
        # Encode
        base64_str = f"data:image/jpeg;base64,{base64.b64encode(compressed_data).decode('utf-8')}"
        
        # Update DB
        current_user.profile_picture = base64_str
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        return {"profile_picture": base64_str}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ProfileUpdate(BaseModel):
    """Schema for updating user profile (non-SSO users only)"""
    full_name: Optional[str] = None


@router.patch("/me/profile", response_model=dict)
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile. Only allowed for non-SSO users.
    SSO users have their profile managed by their identity provider.
    """
    # Block SSO users from editing profile
    if current_user.sso_provider:
        raise HTTPException(
            status_code=403, 
            detail="Profile editing is not allowed for SSO users"
        )
    
    # Update full_name if provided
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip() if data.full_name else None
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "profile_picture": current_user.profile_picture
    }
