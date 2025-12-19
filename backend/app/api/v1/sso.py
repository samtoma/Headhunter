import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi_sso.sso.microsoft import MicrosoftSSO
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Company, UserRole
from app.core.security import create_access_token
from datetime import timedelta
from app.core.security import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(tags=["SSO"])

# SSO Configuration
SSO_CLIENT_ID = os.getenv("SSO_CLIENT_ID", "client-id")
SSO_CLIENT_SECRET = os.getenv("SSO_CLIENT_SECRET", "client-secret")
SSO_TENANT_ID = os.getenv("SSO_TENANT_ID", "common")
SSO_CALLBACK_URL = os.getenv("SSO_CALLBACK_URL", "http://localhost:8000/api/v1/auth/microsoft/callback")

sso = MicrosoftSSO(
    client_id=SSO_CLIENT_ID,
    client_secret=SSO_CLIENT_SECRET,
    redirect_uri=SSO_CALLBACK_URL,
    allow_insecure_http=True, # For local dev
    tenant=SSO_TENANT_ID
)

@router.get("/microsoft/login")
async def microsoft_login():
    """Redirect user to Microsoft login page"""
    return await sso.get_login_redirect()

@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Microsoft login callback"""
    try:
        user = await sso.verify_and_process(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not user:
        raise HTTPException(status_code=400, detail="Failed to login with Microsoft")

    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user:
        # Create new user
        # Domain Extraction & Company Logic
        if "@" not in user.email:
             raise HTTPException(status_code=400, detail="Invalid email format from SSO provider")
        
        domain = user.email.split("@")[1]
        company = db.query(Company).filter(Company.domain == domain).first()
        
        user_role = UserRole.RECRUITER
        
        if not company:
            # New Domain -> Create Company -> Admin Role
            company = Company(domain=domain, name=domain) # Default name to domain
            db.add(company)
            db.commit()
            db.refresh(company)
            user_role = UserRole.ADMIN
        
        # We need a password for the model, but for SSO users it's not used.
        # We'll set a random unusable password or handle it in model (nullable password).
        # Existing model has nullable=False for hashed_password.
        # We'll generate a random hash.
        from app.core.security import get_password_hash
        import secrets
        
        random_password = secrets.token_urlsafe(32)
        hashed_password = get_password_hash(random_password)
        
        db_user = User(
            email=user.email,
            hashed_password=hashed_password,
            sso_provider="microsoft",
            sso_id=user.id,
            is_verified=True, # SSO users are verified by provider
            company_id=company.id,
            role=user_role
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    else:
        # Update existing user with SSO info if not present
        if not db_user.sso_provider:
            db_user.sso_provider = "microsoft"
            db_user.sso_id = user.id
            db_user.is_verified = True
            db.commit()
            
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    # Get company name and user details
    company_name = db_user.company.name if db_user.company else ""
    full_name = user.display_name or db_user.email.split('@')[0]
    picture = db_user.profile_picture or user.picture or ""
    
    # Update profile picture from Microsoft if we don't have one and Microsoft provides one
    if not db_user.profile_picture and user.picture:
        db_user.profile_picture = user.picture
        db.commit()
        picture = user.picture
    
    # URL-encode values to handle special characters
    from urllib.parse import quote
    encoded_company = quote(company_name, safe='')
    encoded_name = quote(full_name, safe='')
    encoded_picture = quote(picture, safe='')
    
    # Redirect to frontend with token and user info (matching Google SSO format)
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(
        url=f"{FRONTEND_URL}/auth/callback"
        f"?token={access_token}"
        f"&role={db_user.role}"
        f"&company_name={encoded_company}"
        f"&email={db_user.email}"
        f"&full_name={encoded_name}"
        f"&picture={encoded_picture}"
        f"&sso_provider=microsoft"
        f"&is_verified=true"
    )
