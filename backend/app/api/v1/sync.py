from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.api.deps import get_current_user
from typing import Dict
from datetime import datetime

router = APIRouter(prefix="/sync", tags=["Sync"])

@router.get("/version", response_model=Dict[str, str])
def get_data_version(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the current data version (timestamp) for the user's company.
    Frontend polls this to know when to refetch data.
    """
    if not current_user.company:
        return {"version": datetime.utcnow().isoformat()}
        
    # Refresh to ensure we get the latest from DB
    db.refresh(current_user.company)
    
    version = current_user.company.last_data_update
    if not version:
        version = current_user.company.created_at
        
    return {"version": version.isoformat() if version else datetime.utcnow().isoformat()}
