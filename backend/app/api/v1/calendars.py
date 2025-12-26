from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import Dict
import uuid
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.models import User, CalendarConnection
from app.core.security import encrypt_token, decrypt_token
from app.schemas.calendar import CalendarEventCreate
from app.services.calendar.google_calendar import GoogleCalendarProvider
from app.services.calendar.microsoft_calendar import MicrosoftCalendarProvider
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
providers = {
    "google": GoogleCalendarProvider(),
    "microsoft": MicrosoftCalendarProvider()
}

@router.get("/connect/{provider}")
def connect_calendar(
    provider: str,
    state: str = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Generate OAuth URL for a specific provider.
    """
    if provider not in providers:
        raise HTTPException(status_code=404, detail="Provider not not supported")
        
    if not state:
        state = str(uuid.uuid4())
    
    try:
        auth_url = providers[provider].get_auth_url(state=state)
        return {"url": auth_url, "state": state}
    except ValueError as e:
         # Missing ENV vars usually
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/callback/{provider}")
def calendar_callback(
    provider: str,
    payload: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exchange auth code for tokens and store encrypted in DB.
    """
    if provider not in providers:
        raise HTTPException(status_code=404, detail="Provider not supported")
        
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")
        
    cal_provider = providers[provider]
        
    try:
        tokens = cal_provider.exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")
        
    # Store in DB
    existing = db.query(CalendarConnection).filter(
        CalendarConnection.user_id == current_user.id,
        CalendarConnection.provider == provider
    ).first()
    
    if not tokens.get("access_token"):
        raise HTTPException(status_code=400, detail="No access token returned")

    encrypted_access = encrypt_token(tokens["access_token"])
    refresh_token_raw = tokens.get("refresh_token")
    
    # Fetch user email
    user_email = None
    try:
        target_refresh = refresh_token_raw
        if not target_refresh and existing and existing.refresh_token:
             target_refresh = decrypt_token(existing.refresh_token)
             
        user_email = cal_provider.get_user_email(tokens["access_token"], target_refresh or "")
    except Exception as e:
        logger.error(f"Failed to fetch user email: {e}")

    if existing:
        existing.access_token = encrypted_access
        if refresh_token_raw:
            existing.refresh_token = encrypt_token(refresh_token_raw)
        
        if user_email:
            existing.external_account_email = user_email
            
        existing.updated_at = func.now()
        existing.sync_enabled = True
    else:
        new_conn = CalendarConnection(
            user_id=current_user.id,
            provider=provider,
            access_token=encrypted_access,
            refresh_token=encrypt_token(refresh_token_raw) if refresh_token_raw else "",
            sync_enabled=True,
            external_account_email=user_email,
            token_expires_at=None
        )
        db.add(new_conn)
        
    db.commit()
    return {"status": "connected", "provider": provider, "email": existing.external_account_email if existing else user_email}

@router.get("/connections")
def list_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conns = db.query(CalendarConnection).filter(
        CalendarConnection.user_id == current_user.id
    ).all()
    
    return [{
        "provider": c.provider,
        "email": c.external_account_email,
        "sync_enabled": c.sync_enabled,
        "created_at": c.created_at
    } for c in conns]

@router.get("/events")
def list_events(
    provider: str = "google", 
    time_min: str = Query(None),
    time_max: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if provider not in providers:
        raise HTTPException(status_code=400, detail="Provider not supported")

    conn = db.query(CalendarConnection).filter(
        CalendarConnection.user_id == current_user.id,
        CalendarConnection.provider == provider
    ).first()
    
    if not conn:
        raise HTTPException(status_code=404, detail="Calendar not connected")
        
    decrypted_access = decrypt_token(conn.access_token)
    decrypted_refresh = decrypt_token(conn.refresh_token) if conn.refresh_token else None
    
    try:
        events = providers[provider].list_events(decrypted_access, decrypted_refresh, time_min, time_max)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events")
def create_event(
    event_data: CalendarEventCreate,
    provider: str = "google",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if provider not in providers:
        raise HTTPException(status_code=400, detail="Provider not supported")
        
    conn = db.query(CalendarConnection).filter(
        CalendarConnection.user_id == current_user.id,
        CalendarConnection.provider == provider
    ).first()
    
    if not conn:
        raise HTTPException(status_code=404, detail="Calendar not connected")
        
    decrypted_access = decrypt_token(conn.access_token)
    decrypted_refresh = decrypt_token(conn.refresh_token) if conn.refresh_token else None
    
    try:
        # Convert Pydantic model to dict for the provider
        event = providers[provider].create_event(decrypted_access, decrypted_refresh, event_data.model_dump())
        return event
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/disconnect/{provider}")
def disconnect_calendar(
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if provider not in providers:
        raise HTTPException(status_code=400, detail="Provider not supported")
        
    conn = db.query(CalendarConnection).filter(
        CalendarConnection.user_id == current_user.id,
        CalendarConnection.provider == provider
    ).first()
    
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    db.delete(conn)
    db.commit()
    return {"status": "disconnected"}
