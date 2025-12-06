from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi_sso.sso.google import GoogleSSO
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Company, UserRole
from app.core.security import create_access_token, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.logging import auth_logger
from datetime import timedelta
import os
import secrets
import string

router = APIRouter(tags=["Google SSO"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# Default to localhost:30004/api as seen in docker-compose + proxy
# User might need to change this if domain differs
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:30004/api")
CALLBACK_URI = f"{API_BASE_URL}/auth/google/callback"

# Frontend URL for final redirect with token
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:30004")

sso = GoogleSSO(
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    redirect_uri=CALLBACK_URI,
    allow_insecure_http=True
)

@router.get("/google/login")
async def google_login():
    """Redirects user to Google Login page"""
    with sso:
        return await sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handles Google Callback, creates/links user, and redirects to frontend with token"""
    try:
        with sso:
            user_info = await sso.verify_and_process(request)
    except Exception as e:
        # Redirect to login with error
        return RedirectResponse(f"{FRONTEND_URL}/login?error=sso_failed&details={str(e)}")

    if not user_info or not user_info.email:
         return RedirectResponse(f"{FRONTEND_URL}/login?error=no_email")

    email = user_info.email
    user = db.query(User).filter(User.email == email).first()
    is_new_company = False
    
    if not user:
        # Create new user logic
        domain = email.split("@")[1]
        company = db.query(Company).filter(Company.domain == domain).first()
        user_role = UserRole.INTERVIEWER
        
        if not company:
             company = Company(domain=domain, name=domain)
             db.add(company)
             db.commit()
             db.refresh(company)
             is_new_company = True
             user_role = UserRole.ADMIN
        
        # Random secure password
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for i in range(20))
        hashed_password = get_password_hash(password)
        
        user = User(
            email=email,
            hashed_password=hashed_password,
            company_id=company.id,
            role=user_role,
            is_verified=True,
            sso_provider="google",
            sso_id=user_info.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        auth_logger.log_action(
            action="signup_google",
            message=f"New user registered via Google: {email}",
            user_id=user.id,
            user_email=email,
            company_id=company.id,
            company_name=company.name
        )
    else:
        # Link account if needed
        if not user.sso_id:
            user.sso_provider = "google"
            user.sso_id = user_info.id
            user.is_verified = True
            db.commit()
            
    # Generate Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    user.login_count = (user.login_count or 0) + 1
    db.commit()
    
    # Get company name
    company_name = user.company.name if user.company else ""

    # Get display name and picture (prefer Google info if available/new, or user stored info)
    # user_info.display_name and user_info.picture are available from GoogleSSO
    # We should update the user record if we have new info from Google
    if user_info.display_name and (not user.email or user.email == user.email): # Simple check
         pass # Logic could be here to update name if model had name field aside from email
         
    # Pass details in redirect
    # We need to ensure we don't break the URL length limits, but these are generally safe
    full_name = user_info.display_name or user.email.split('@')[0]
    picture = user.profile_picture or user_info.picture or ""

    # Update profile picture from Google if we don't have one and Google provides one
    if not user.profile_picture and user_info.picture:
        user.profile_picture = user_info.picture
        db.commit()
        picture = user_info.picture

    # URL-encode values to handle special characters
    from urllib.parse import quote
    encoded_company = quote(company_name, safe='')
    encoded_name = quote(full_name, safe='')
    encoded_picture = quote(picture, safe='')

    return RedirectResponse(
        f"{FRONTEND_URL}/auth/callback"
        f"?token={access_token}"
        f"&role={user.role}"
        f"&company_name={encoded_company}"
        f"&email={user.email}"
        f"&full_name={encoded_name}"
        f"&picture={encoded_picture}"
    )
