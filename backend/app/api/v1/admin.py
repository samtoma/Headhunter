"""
Comprehensive Admin API for System Monitoring and Logging

Provides endpoints for:
- System logs viewing and filtering
- Metrics and statistics
- User invitation tracking
- Deployment monitoring
- Error tracking and debugging
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, ConfigDict
from app.core.database import get_db
from app.models.models import SystemLog, UserInvitation, User, Company, ActivityLog, UserRole
from app.api.deps import get_current_user
import json

router = APIRouter(prefix="/admin", tags=["Admin"])

# ==================== Pydantic Models ====================

class SystemLogOut(BaseModel):
    id: int
    level: str
    component: str
    action: str
    message: str
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    request_id: Optional[str] = None
    http_method: Optional[str] = None
    http_path: Optional[str] = None
    http_status: Optional[int] = None
    response_time_ms: Optional[int] = None
    ip_address: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    deployment_version: Optional[str] = None
    deployment_environment: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    user_email: Optional[str] = None
    company_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserInvitationOut(BaseModel):
    id: int
    email: str
    role: str
    department: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    invited_by: int
    invited_by_email: Optional[str] = None
    company_id: int
    company_name: Optional[str] = None
    email_sent: bool
    email_sent_at: Optional[datetime] = None
    email_error: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SystemMetrics(BaseModel):
    total_logs: int
    logs_by_level: Dict[str, int]
    logs_by_component: Dict[str, int]
    error_count: int
    error_rate_24h: float
    avg_response_time_ms: float
    total_invitations: int
    invitations_by_status: Dict[str, int]
    active_users_24h: int
    api_requests_24h: int
    deployment_version: Optional[str] = None

class LogSearchParams(BaseModel):
    level: Optional[List[str]] = None
    component: Optional[List[str]] = None
    action: Optional[List[str]] = None
    company_id: Optional[int] = None
    user_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search_text: Optional[str] = None
    has_error: Optional[bool] = None
    limit: int = 100
    offset: int = 0

# ==================== Helper Functions ====================

def require_super_admin(current_user: User):
    """Ensure user is super admin"""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")

# ==================== System Logs Endpoints ====================

@router.get("/logs", response_model=List[SystemLogOut])
def get_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"),
    component: Optional[str] = Query(None, description="Filter by component"),
    action: Optional[str] = Query(None, description="Filter by action"),
    company_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search_text: Optional[str] = Query(None, description="Search in message and metadata"),
    has_error: Optional[bool] = Query(None, description="Filter logs with errors"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get system logs with advanced filtering.
    Super admin only.
    """
    require_super_admin(current_user)
    
    query = db.query(SystemLog)
    
    # Apply filters
    if level:
        levels = [l.strip().upper() for l in level.split(",")]
        query = query.filter(SystemLog.level.in_(levels))
    
    if component:
        components = [c.strip() for c in component.split(",")]
        query = query.filter(SystemLog.component.in_(components))
    
    if action:
        actions = [a.strip() for a in action.split(",")]
        query = query.filter(SystemLog.action.in_(actions))
    
    if company_id:
        query = query.filter(SystemLog.company_id == company_id)
    
    if user_id:
        query = query.filter(SystemLog.user_id == user_id)
    
    if start_date:
        query = query.filter(SystemLog.created_at >= start_date)
    
    if end_date:
        query = query.filter(SystemLog.created_at <= end_date)
    
    if search_text:
        search_pattern = f"%{search_text}%"
        query = query.filter(
            or_(
                SystemLog.message.ilike(search_pattern),
                SystemLog.extra_metadata.ilike(search_pattern)
            )
        )
    
    if has_error is not None:
        if has_error:
            query = query.filter(SystemLog.error_type.isnot(None))
        else:
            query = query.filter(SystemLog.error_type.is_(None))
    
    # Order by most recent first
    query = query.order_by(desc(SystemLog.created_at))
    
    # Pagination
    total = query.count()
    logs = query.offset(offset).limit(limit).all()
    
    # Enrich with user and company info
    result = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "level": log.level,
            "component": log.component,
            "action": log.action,
            "message": log.message,
            "user_id": log.user_id,
            "company_id": log.company_id,
            "request_id": log.request_id,
            "http_method": log.http_method,
            "http_path": log.http_path,
            "http_status": log.http_status,
            "response_time_ms": log.response_time_ms,
            "ip_address": log.ip_address,
            "error_type": log.error_type,
            "error_message": log.error_message,
            "deployment_version": log.deployment_version,
            "deployment_environment": log.deployment_environment,
            "metadata": json.loads(log.extra_metadata) if log.extra_metadata else None,
            "created_at": log.created_at,
            "user_email": None,
            "company_name": None
        }
        
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                log_dict["user_email"] = user.email
        
        if log.company_id:
            company = db.query(Company).filter(Company.id == log.company_id).first()
            if company:
                log_dict["company_name"] = company.name
        
        result.append(log_dict)
    
    return result

@router.get("/logs/stats", response_model=Dict[str, Any])
def get_log_statistics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about system logs.
    Super admin only.
    """
    require_super_admin(current_user)
    
    query = db.query(SystemLog)
    
    if start_date:
        query = query.filter(SystemLog.created_at >= start_date)
    if end_date:
        query = query.filter(SystemLog.created_at <= end_date)
    if company_id:
        query = query.filter(SystemLog.company_id == company_id)
    
    # Count by level
    logs_by_level = {}
    for level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        count = query.filter(SystemLog.level == level).count()
        logs_by_level[level] = count
    
    # Count by component
    component_counts = db.query(
        SystemLog.component,
        func.count(SystemLog.id).label("count")
    ).group_by(SystemLog.component)
    
    if start_date:
        component_counts = component_counts.filter(SystemLog.created_at >= start_date)
    if end_date:
        component_counts = component_counts.filter(SystemLog.created_at <= end_date)
    if company_id:
        component_counts = component_counts.filter(SystemLog.company_id == company_id)
    
    logs_by_component = {row.component: row.count for row in component_counts.all()}
    
    # Error statistics
    error_count = query.filter(SystemLog.error_type.isnot(None)).count()
    total_count = query.count()
    error_rate = (error_count / total_count * 100) if total_count > 0 else 0
    
    # Average response time
    avg_response_time = db.query(func.avg(SystemLog.response_time_ms)).filter(
        SystemLog.response_time_ms.isnot(None)
    ).scalar() or 0
    
    return {
        "total_logs": total_count,
        "logs_by_level": logs_by_level,
        "logs_by_component": logs_by_component,
        "error_count": error_count,
        "error_rate_percent": round(error_rate, 2),
        "avg_response_time_ms": round(float(avg_response_time), 2)
    }

# ==================== User Invitations Endpoints ====================

@router.get("/invitations", response_model=List[UserInvitationOut])
def get_user_invitations(
    status: Optional[str] = Query(None),
    company_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all user invitations with status tracking.
    Super admin only.
    """
    require_super_admin(current_user)
    
    query = db.query(UserInvitation)
    
    if status:
        query = query.filter(UserInvitation.status == status)
    
    if company_id:
        query = query.filter(UserInvitation.company_id == company_id)
    
    query = query.order_by(desc(UserInvitation.created_at))
    
    total = query.count()
    invitations = query.offset(offset).limit(limit).all()
    
    result = []
    for inv in invitations:
        inv_dict = {
            "id": inv.id,
            "email": inv.email,
            "role": inv.role,
            "department": inv.department,
            "status": inv.status,
            "sent_at": inv.sent_at,
            "expires_at": inv.expires_at,
            "accepted_at": inv.accepted_at,
            "invited_by": inv.invited_by,
            "invited_by_email": None,
            "company_id": inv.company_id,
            "company_name": None,
            "email_sent": inv.email_sent,
            "email_sent_at": inv.email_sent_at,
            "email_error": inv.email_error,
            "created_at": inv.created_at
        }
        
        # Get inviter email
        inviter = db.query(User).filter(User.id == inv.invited_by).first()
        if inviter:
            inv_dict["invited_by_email"] = inviter.email
        
        # Get company name
        company = db.query(Company).filter(Company.id == inv.company_id).first()
        if company:
            inv_dict["company_name"] = company.name
        
        result.append(inv_dict)
    
    return result

@router.get("/invitations/stats", response_model=Dict[str, Any])
def get_invitation_statistics(
    company_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about user invitations.
    Super admin only.
    """
    require_super_admin(current_user)
    
    query = db.query(UserInvitation)
    
    if company_id:
        query = query.filter(UserInvitation.company_id == company_id)
    if start_date:
        query = query.filter(UserInvitation.created_at >= start_date)
    if end_date:
        query = query.filter(UserInvitation.created_at <= end_date)
    
    total = query.count()
    
    # Count by status
    status_counts = db.query(
        UserInvitation.status,
        func.count(UserInvitation.id).label("count")
    ).group_by(UserInvitation.status)
    
    if company_id:
        status_counts = status_counts.filter(UserInvitation.company_id == company_id)
    if start_date:
        status_counts = status_counts.filter(UserInvitation.created_at >= start_date)
    if end_date:
        status_counts = status_counts.filter(UserInvitation.created_at <= end_date)
    
    invitations_by_status = {row.status: row.count for row in status_counts.all()}
    
    # Count by company
    company_counts = db.query(
        UserInvitation.company_id,
        func.count(UserInvitation.id).label("count")
    ).group_by(UserInvitation.company_id)
    
    if start_date:
        company_counts = company_counts.filter(UserInvitation.created_at >= start_date)
    if end_date:
        company_counts = company_counts.filter(UserInvitation.created_at <= end_date)
    
    invitations_by_company = {}
    for row in company_counts.all():
        company = db.query(Company).filter(Company.id == row.company_id).first()
        if company:
            invitations_by_company[company.name] = row.count
    
    return {
        "total_invitations": total,
        "invitations_by_status": invitations_by_status,
        "invitations_by_company": invitations_by_company
    }

# ==================== System Metrics Endpoint ====================

@router.get("/metrics", response_model=SystemMetrics)
def get_system_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive system metrics for the admin dashboard.
    Super admin only.
    """
    require_super_admin(current_user)
    
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    
    # Log statistics
    total_logs = db.query(func.count(SystemLog.id)).scalar() or 0
    
    logs_by_level = {}
    for level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        count = db.query(func.count(SystemLog.id)).filter(SystemLog.level == level).scalar() or 0
        logs_by_level[level] = count
    
    logs_by_component = {}
    component_counts = db.query(
        SystemLog.component,
        func.count(SystemLog.id).label("count")
    ).group_by(SystemLog.component).all()
    for row in component_counts:
        logs_by_component[row.component] = row.count
    
    # Error statistics
    error_count = db.query(func.count(SystemLog.id)).filter(
        SystemLog.error_type.isnot(None)
    ).scalar() or 0
    
    errors_24h = db.query(func.count(SystemLog.id)).filter(
        and_(
            SystemLog.error_type.isnot(None),
            SystemLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    logs_24h = db.query(func.count(SystemLog.id)).filter(
        SystemLog.created_at >= last_24h
    ).scalar() or 1
    
    error_rate_24h = (errors_24h / logs_24h * 100) if logs_24h > 0 else 0
    
    # Response time
    avg_response_time = db.query(func.avg(SystemLog.response_time_ms)).filter(
        SystemLog.response_time_ms.isnot(None)
    ).scalar() or 0
    
    # Invitation statistics
    total_invitations = db.query(func.count(UserInvitation.id)).scalar() or 0
    
    invitations_by_status = {}
    status_counts = db.query(
        UserInvitation.status,
        func.count(UserInvitation.id).label("count")
    ).group_by(UserInvitation.status).all()
    for row in status_counts:
        invitations_by_status[row.status] = row.count
    
    # Active users (users who logged in within 24h)
    active_users_24h = db.query(func.count(User.id)).filter(
        User.login_count > 0  # Simplified - in production, track last_login_at
    ).scalar() or 0
    
    # API requests in last 24h
    api_requests_24h = db.query(func.count(SystemLog.id)).filter(
        and_(
            SystemLog.component == "api",
            SystemLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    # Get latest deployment version
    latest_deployment = db.query(SystemLog.deployment_version).filter(
        SystemLog.deployment_version.isnot(None)
    ).order_by(desc(SystemLog.created_at)).first()
    
    deployment_version = latest_deployment[0] if latest_deployment else None
    
    return SystemMetrics(
        total_logs=total_logs,
        logs_by_level=logs_by_level,
        logs_by_component=logs_by_component,
        error_count=error_count,
        error_rate_24h=round(error_rate_24h, 2),
        avg_response_time_ms=round(float(avg_response_time), 2),
        total_invitations=total_invitations,
        invitations_by_status=invitations_by_status,
        active_users_24h=active_users_24h,
        api_requests_24h=api_requests_24h,
        deployment_version=deployment_version
    )

# ==================== Error Tracking Endpoint ====================

@router.get("/errors", response_model=List[SystemLogOut])
def get_recent_errors(
    limit: int = Query(50, ge=1, le=500),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent errors for debugging.
    Super admin only.
    """
    require_super_admin(current_user)
    
    query = db.query(SystemLog).filter(
        SystemLog.error_type.isnot(None)
    )
    
    if company_id:
        query = query.filter(SystemLog.company_id == company_id)
    
    errors = query.order_by(desc(SystemLog.created_at)).limit(limit).all()
    
    # Enrich with user and company info
    result = []
    for log in errors:
        log_dict = {
            "id": log.id,
            "level": log.level,
            "component": log.component,
            "action": log.action,
            "message": log.message,
            "user_id": log.user_id,
            "company_id": log.company_id,
            "request_id": log.request_id,
            "http_method": log.http_method,
            "http_path": log.http_path,
            "http_status": log.http_status,
            "response_time_ms": log.response_time_ms,
            "ip_address": log.ip_address,
            "error_type": log.error_type,
            "error_message": log.error_message,
            "deployment_version": log.deployment_version,
            "deployment_environment": log.deployment_environment,
            "metadata": json.loads(log.extra_metadata) if log.extra_metadata else None,
            "created_at": log.created_at,
            "user_email": None,
            "company_name": None
        }
        
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                log_dict["user_email"] = user.email
        
        if log.company_id:
            company = db.query(Company).filter(Company.id == log.company_id).first()
            if company:
                log_dict["company_name"] = company.name
        
        result.append(log_dict)
    
    return result

