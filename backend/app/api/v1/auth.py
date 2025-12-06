from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.models.models import User, Company, UserRole, ActivityLog
from app.api.deps import get_current_user
from app.core.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.logging import auth_logger
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["Authentication"])

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    company_name: Optional[str] = None
    is_new_company: bool = False
    email: Optional[str] = None
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    sso_provider: Optional[str] = None  # 'google', 'microsoft', or null for password

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None  # Optional display name

@router.post("/signup", response_model=Token)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Domain Extraction & Company Logic
    if "@" not in user.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    domain = user.email.split("@")[1]
    company = db.query(Company).filter(Company.domain == domain).first()
    
    is_new_company = False
    user_role = UserRole.INTERVIEWER
    
    if not company:
        # New Domain -> Create Company -> Admin Role
        company = Company(domain=domain, name=domain) # Default name to domain
        db.add(company)
        db.commit()
        db.refresh(company)
        is_new_company = True
        user_role = UserRole.ADMIN
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email, 
        hashed_password=hashed_password,
        company_id=company.id,
        role=user_role,
        full_name=user.full_name  # Store provided name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send Verification Email
    try:
        verification_token = create_access_token(
            data={"sub": new_user.email, "type": "verification"}, 
            expires_delta=timedelta(hours=24)
        )
        from app.core.email import send_verification_email
        await send_verification_email(new_user.email, verification_token)
    except Exception as e:
        auth_logger.log_action(action="error", message=f"Failed to send verification email: {str(e)}", user_id=new_user.id, user_email=new_user.email, company_id=company.id)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    
    # Audit log for signup
    auth_logger.log_action(
        action="signup",
        message=f"New user registered: {new_user.email}",
        user_id=new_user.id,
        user_email=new_user.email,
        company_id=company.id,
        company_name=company.name,
        is_new_company=is_new_company
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": new_user.role,
        "company_name": company.name,
        "is_new_company": is_new_company,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "profile_picture": new_user.profile_picture
    }

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check Verification
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Track Login
    user.login_count = (user.login_count or 0) + 1
    
    # Log Activity
    log = ActivityLog(
        user_id=user.id,
        company_id=user.company_id,
        action="login",
        details="{}"
    )
    db.add(log)
    db.commit()
    
    # Audit log for login
    auth_logger.log_action(
        action="login",
        message=f"User logged in: {user.email}",
        user_id=user.id,
        user_email=user.email,
        company_id=user.company_id,
        company_name=user.company.name if user.company else None
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "company_name": user.company.name if user.company else None,
        "is_new_company": False,
        "email": user.email,
        "full_name": user.full_name,
        "profile_picture": user.profile_picture,
        "sso_provider": user.sso_provider
    }

@router.post("/resend-verification")
async def resend_verification(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        return {"message": "Email already verified"}
        
    verification_token = create_access_token(data={"sub": user.email, "type": "verification"}, expires_delta=timedelta(hours=24))
    
    from app.core.email import send_verification_email
    await send_verification_email(user.email, verification_token)
    
    return {"message": "Verification email sent"}

@router.post("/send-verification")
async def send_verification(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In a real app, generate a secure random token and store it in DB or Redis with expiration
    # For simplicity, we'll use a dummy token or a signed JWT
    # Let's use a signed JWT for verification
    verification_token = create_access_token(data={"sub": user.email, "type": "verification"}, expires_delta=timedelta(hours=24))
    
    from app.core.email import send_verification_email
    await send_verification_email(user.email, verification_token)
    
    return {"message": "Verification email sent"}

@router.get("/verify")
async def verify_email(token: str, db: Session = Depends(get_db)):
    from jose import jwt, JWTError
    from app.core.security import SECRET_KEY, ALGORITHM
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "verification":
            raise HTTPException(status_code=400, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_verified = True
    db.commit()
    
    return {"message": "Email verified successfully"}

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "company_id": current_user.company_id,
        "department": current_user.department,
        "is_active": current_user.is_active
    }
