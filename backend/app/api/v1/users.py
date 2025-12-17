from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from PIL import Image
import io
import base64
from app.core.database import get_db
from app.models.models import User, UserRole
from app.api.deps import get_current_user
from app.core.security import get_password_hash
from app.api.v1.activity import log_system_activity

router = APIRouter(prefix="/users", tags=["Users"])

class UserOut(BaseModel):
    id: int
    email: str
    is_active: bool
    role: str
    department: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[str] = None # JSON string
    login_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "interviewer"
    department: Optional[str] = None
    is_verified: Optional[bool] = None  # Allow tests to set this directly

class UserInvite(BaseModel):
    email: str
    role: str
    department: Optional[str] = None
    feature_flags: Optional[str] = None # JSON string

@router.post("/invite", response_model=UserOut)
async def invite_user(
    invite_data: UserInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Invite a new team member.
    """
    # 1. Permission Check
    allowed_roles = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorized to invite users")
    
    # Hiring Managers can only invite to their own department (if they have one)
    if current_user.role == UserRole.HIRING_MANAGER and current_user.department:
        if invite_data.department != current_user.department:
            raise HTTPException(status_code=403, detail="Hiring Managers can only invite to their own department")

    # 2. Check if user exists
    existing_user = db.query(User).filter(User.email == invite_data.email).first()
    if existing_user:
        # Check if user is deactivated - if so, we can reactivate/re-invite them
        from app.models.models import UserStatus
        if existing_user.status == UserStatus.DEACTIVATED or not existing_user.is_active:
            # Reactivate logic
            existing_user.status = UserStatus.PENDING
            existing_user.is_active = True
            existing_user.role = invite_data.role
            existing_user.department = invite_data.department
            existing_user.is_verified = False # Require re-verification/password set
            
            # Reset password (invalidate old one)
            import uuid
            # get_password_hash is already imported at module level
            random_password = str(uuid.uuid4())
            existing_user.hashed_password = get_password_hash(random_password)
            
            db.commit()
            db.refresh(existing_user)
            
            # Reuse existing user for the rest of the flow
            new_user = existing_user
            
            # Skip creation, proceed to token generation
        else:
            raise HTTPException(status_code=400, detail="User with this email already exists")
    else:
        # 3. Create User (Pending Status)
        import uuid
        from app.models.models import UserStatus, PasswordResetToken
        from app.core.email import send_team_invite_email
        from datetime import datetime, timedelta, timezone

        random_password = str(uuid.uuid4()) # Unusable password until they set one
        hashed_password = get_password_hash(random_password)
        
        new_user = User(
            email=invite_data.email,
            hashed_password=hashed_password,
            company_id=current_user.company_id,
            role=invite_data.role,
            department=invite_data.department,
            status=UserStatus.PENDING,
            is_active=True, # Active but pending verification/setup
            is_verified=False,
            feature_flags=invite_data.feature_flags
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    
    # 4. Generate Invite Token (using PasswordResetToken for simplicity)
    # Note: If reusing user, we should invalidate old tokens first? 
    # PasswordResetToken relates to user_id, so we can just add a new one.
    import uuid
    from app.models.models import PasswordResetToken
    from datetime import datetime, timedelta, timezone
    
    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    
    reset_token = PasswordResetToken(
        token=token,
        user_id=new_user.id,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()

    # 5. Send Invite Email
    from app.core.email import send_team_invite_email
    company_name = current_user.company.name if current_user.company else "Headhunter"
    sender_name = current_user.full_name or "A colleague"
    
    await send_team_invite_email(
        email=new_user.email,
        token=token,
        sender_name=sender_name,
        company_name=company_name,
        role=new_user.role
    )

    # 6. Audit Log
    log_system_activity(
        db, "user_invited" if not existing_user else "user_reinvited", 
        current_user.id, current_user.company_id,
        {"invited_email": new_user.email, "role": new_user.role, "department": new_user.department}
    )
    
    return new_user

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
def get_users(
    status: Optional[str] = "active",
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    from app.models.models import UserStatus
    
    query = db.query(User)
    
    # Status Filtering
    if status == "archived":
        # Show deactivated users
        query = query.filter(User.status == UserStatus.DEACTIVATED)
    elif status == "all":
        # Show everything (admin might want this?)
        pass
    else:
        # Default: Active users (includes PENDING and ACTIVE)
        # We check is_active=True OR status=PENDING (because invite logic sets is_active=True for pending, 
        # but let's stick to is_active=True which covers both based on current logic)
        query = query.filter(User.is_active)
    
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
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
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
        is_active=True,
        is_verified=user.is_verified if user.is_verified is not None else False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Audit log: user created/invited
    log_system_activity(
        db, "user_invited", current_user.id, current_user.company_id,
        {"user_id": new_user.id, "email": new_user.email, "role": new_user.role}
    )
    
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
        
    user_email = user.email
    # Soft Delete Implementation
    from app.models.models import UserStatus
    user.is_active = False
    user.status = UserStatus.DEACTIVATED
    # We DO NOT delete the user record, preserving logs and foreign keys.
    
    db.commit()
    
    # Audit log: user deleted
    log_system_activity(
        db, "user_deleted", current_user.id, current_user.company_id,
        {"user_id": user_id, "email": user_email}
    )
    
    return {"status": "deleted"}

class UserUpdate(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None
    permissions: Optional[str] = None

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
    if user_update.department is not None:
        user.department = user_update.department
    if user_update.permissions is not None:
        user.permissions = user_update.permissions
        
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
    if user_update.permissions is not None:
        user.permissions = user_update.permissions
        
    db.commit()
    db.refresh(user)
    return user

# Avatar Upload Implementation

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
