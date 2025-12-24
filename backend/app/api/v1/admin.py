"""
Comprehensive Admin API for System Monitoring and Logging

Provides endpoints for:
- System logs viewing and filtering
- Metrics and statistics
- User invitation tracking
- Deployment monitoring
- Error tracking and debugging
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, Text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, ConfigDict
from app.core.database import get_db
from app.core.database_logs import get_logs_db
from app.models.models import UserInvitation, User, Company, UserRole
from app.models.log_models import SystemLog, LLMLog
from app.api.deps import get_current_user
from jose import jwt, JWTError
from app.core.security import SECRET_KEY, ALGORITHM
import json
import asyncio

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

class ServiceHealth(BaseModel):
    """Health status for a single service"""
    name: str
    status: str  # "healthy", "degraded", "unhealthy"
    response_time_ms: Optional[float] = None
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class SystemHealthResponse(BaseModel):
    """Overall system health status"""
    overall_status: str  # "healthy", "degraded", "unhealthy"
    services: List[ServiceHealth]
    timestamp: datetime

class UXAnalyticsResponse(BaseModel):
    """UX analytics metrics"""
    period_hours: int
    total_requests: int
    error_count: int
    error_rate_percent: float
    response_time_p50_ms: float
    response_time_p95_ms: float
    response_time_p99_ms: float
    slow_endpoints: List[Dict[str, Any]]
    error_endpoints: List[Dict[str, Any]]
    requests_by_hour: List[Dict[str, Any]]

class DatabaseStatsResponse(BaseModel):
    """Database statistics"""
    connection_pool_size: int
    connections_in_use: int
    connections_available: int
    pool_overflow: int
    total_tables: int
    table_sizes: List[Dict[str, Any]]
    total_db_size_mb: float

class HealthHistoryPoint(BaseModel):
    """Single point in health history"""
    timestamp: datetime
    services: List[ServiceHealth]
    error_rate_percent: float
    response_time_p50_ms: float
    response_time_p95_ms: float
    response_time_p99_ms: float

class HealthHistoryResponse(BaseModel):
    """Historical health data"""
    period_hours: int
    time_series: List[HealthHistoryPoint]
    
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
    db_logs: Session = Depends(get_logs_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get system logs with advanced filtering.
    Super admin only.
    """
    require_super_admin(current_user)
    
    query = db_logs.query(SystemLog)
    
    # Apply filters
    if level:
        levels = [lvl.strip().upper() for lvl in level.split(",")]
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
                SystemLog.extra_metadata.cast(Text).ilike(search_pattern)
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
    logs = query.offset(offset).limit(limit).all()
    
    # Batch-fetch users and companies to avoid N+1 queries
    user_ids = {log.user_id for log in logs if log.user_id}
    company_ids = {log.company_id for log in logs if log.company_id}
    
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u.email for u in users}
    
    companies_map = {}
    if company_ids:
        companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
        companies_map = {c.id: c.name for c in companies}
    
    # Build result with pre-fetched data
    result = []
    for log in logs:
        # Handle extra_metadata - JSONB returns dict, but handle string for backward compatibility
        metadata = None
        if log.extra_metadata:
            if isinstance(log.extra_metadata, dict):
                metadata = log.extra_metadata
            elif isinstance(log.extra_metadata, str):
                try:
                    metadata = json.loads(log.extra_metadata)
                except (json.JSONDecodeError, TypeError):
                    metadata = {"raw": log.extra_metadata}  # Fallback for malformed JSON
            else:
                metadata = log.extra_metadata
        
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
            "metadata": metadata,
            "created_at": log.created_at,
            "user_email": users_map.get(log.user_id),
            "company_name": companies_map.get(log.company_id)
        }
        result.append(log_dict)
    
    return result

@router.get("/logs/stats", response_model=Dict[str, Any])
def get_log_statistics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    company_id: Optional[int] = Query(None),
    db_logs: Session = Depends(get_logs_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about system logs.
    Super admin only.
    """
    require_super_admin(current_user)
    
    query = db_logs.query(SystemLog)
    
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
    component_counts = db_logs.query(
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
    avg_response_time = db_logs.query(func.avg(SystemLog.response_time_ms)).filter(
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
    
    invitations = query.offset(offset).limit(limit).all()
    
    # Batch-fetch users and companies to avoid N+1 queries
    inviter_ids = {inv.invited_by for inv in invitations}
    company_ids = {inv.company_id for inv in invitations}
    
    users_map = {}
    if inviter_ids:
        users = db.query(User).filter(User.id.in_(inviter_ids)).all()
        users_map = {u.id: u.email for u in users}
    
    companies_map = {}
    if company_ids:
        companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
        companies_map = {c.id: c.name for c in companies}
    
    # Build result with pre-fetched data
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
            "invited_by_email": users_map.get(inv.invited_by),
            "company_id": inv.company_id,
            "company_name": companies_map.get(inv.company_id),
            "email_sent": inv.email_sent,
            "email_sent_at": inv.email_sent_at,
            "email_error": inv.email_error,
            "created_at": inv.created_at
        }
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
    db_logs: Session = Depends(get_logs_db),
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
    total_logs = db_logs.query(func.count(SystemLog.id)).scalar() or 0
    
    logs_by_level = {}
    for level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        count = db_logs.query(func.count(SystemLog.id)).filter(SystemLog.level == level).scalar() or 0
        logs_by_level[level] = count
    
    logs_by_component = {}
    component_counts = db_logs.query(
        SystemLog.component,
        func.count(SystemLog.id).label("count")
    ).group_by(SystemLog.component).all()
    for row in component_counts:
        logs_by_component[row.component] = row.count
    
    # Error statistics
    error_count = db_logs.query(func.count(SystemLog.id)).filter(
        SystemLog.error_type.isnot(None)
    ).scalar() or 0
    
    errors_24h = db_logs.query(func.count(SystemLog.id)).filter(
        and_(
            SystemLog.error_type.isnot(None),
            SystemLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    logs_24h = db_logs.query(func.count(SystemLog.id)).filter(
        SystemLog.created_at >= last_24h
    ).scalar() or 1
    
    error_rate_24h = (errors_24h / logs_24h * 100) if logs_24h > 0 else 0
    
    # Response time
    avg_response_time = db_logs.query(func.avg(SystemLog.response_time_ms)).filter(
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
    
    # Active users (users who made API requests within 24h)
    # Note: Using SystemLog to count distinct users who made requests in last 24h
    # This is more accurate than login_count which doesn't track time
    active_users_24h = db_logs.query(func.count(func.distinct(SystemLog.user_id))).filter(
        and_(
            SystemLog.user_id.isnot(None),
            SystemLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    # API requests in last 24h (exclude LLM operations - LLM has its own component)
    api_requests_24h = db_logs.query(func.count(SystemLog.id)).filter(
        and_(
            SystemLog.component == "api",  # Only count "api" component, not "llm"
            SystemLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    # Get latest deployment version
    latest_deployment = db_logs.query(SystemLog.deployment_version).filter(
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
    include_4xx: bool = Query(True, description="Include 4xx client errors"),
    db: Session = Depends(get_db),
    db_logs: Session = Depends(get_logs_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent errors for debugging.
    Includes both exceptions (error_type set) and HTTP 4xx/5xx responses.
    Super admin only.
    """
    require_super_admin(current_user)
    
    # Include both exceptions and HTTP error responses
    if include_4xx:
        query = db_logs.query(SystemLog).filter(
            or_(
                SystemLog.error_type.isnot(None),
                SystemLog.http_status >= 400
            )
        )
    else:
        # Only 5xx server errors and exceptions
        query = db_logs.query(SystemLog).filter(
            or_(
                SystemLog.error_type.isnot(None),
                SystemLog.http_status >= 500
            )
        )
    
    if company_id:
        query = query.filter(SystemLog.company_id == company_id)
    
    errors = query.order_by(desc(SystemLog.created_at)).limit(limit).all()
    
    # Batch-fetch users and companies to avoid N+1 queries
    user_ids = {log.user_id for log in errors if log.user_id}
    company_ids = {log.company_id for log in errors if log.company_id}
    
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u.email for u in users}
    
    companies_map = {}
    if company_ids:
        companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
        companies_map = {c.id: c.name for c in companies}
    
    # Build result with pre-fetched data
    result = []
    for log in errors:
        # Handle extra_metadata - JSONB returns dict, but handle string for backward compatibility
        metadata = None
        if log.extra_metadata:
            if isinstance(log.extra_metadata, dict):
                metadata = log.extra_metadata
            elif isinstance(log.extra_metadata, str):
                try:
                    metadata = json.loads(log.extra_metadata)
                except (json.JSONDecodeError, TypeError):
                    metadata = {"raw": log.extra_metadata}  # Fallback for malformed JSON
            else:
                metadata = log.extra_metadata
        
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
            "metadata": metadata,
            "created_at": log.created_at,
            "user_email": users_map.get(log.user_id),
            "company_name": companies_map.get(log.company_id)
        }
        result.append(log_dict)
    
    return result

# ==================== System Health Endpoint ====================

@router.get("/health", response_model=SystemHealthResponse)
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive system health status.
    Checks Database, Redis, Celery, and ChromaDB.
    Super admin only.
    """
    require_super_admin(current_user)
    
    import time
    import os
    from sqlalchemy import text
    
    services = []
    
    # Check Database
    try:
        start = time.time()
        db.execute(text("SELECT 1"))
        db_time = (time.time() - start) * 1000
        
        # Get pool status
        pool = db.get_bind().pool
        pool_status = pool.status()
        
        services.append(ServiceHealth(
            name="Database",
            status="healthy" if db_time < 100 else "degraded",
            response_time_ms=round(db_time, 2),
            message="PostgreSQL connection OK",
            details={"pool_status": pool_status}
        ))
    except Exception as e:
        services.append(ServiceHealth(
            name="Database",
            status="unhealthy",
            message=str(e)
        ))
    
    # Check Redis
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        start = time.time()
        r = redis.from_url(redis_url)
        r.ping()
        redis_time = (time.time() - start) * 1000
        
        services.append(ServiceHealth(
            name="Redis",
            status="healthy" if redis_time < 100 else "degraded",
            response_time_ms=round(redis_time, 2),
            message="Redis connection OK"
        ))
    except Exception as e:
        services.append(ServiceHealth(
            name="Redis",
            status="unhealthy",
            message=str(e)
        ))
    
    # Check Celery (via Redis queue)
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r = redis.from_url(redis_url)
        queue_length = r.llen("celery")
        
        services.append(ServiceHealth(
            name="Celery",
            status="healthy",
            message=f"Queue length: {queue_length}",
            details={"queue_length": queue_length}
        ))
    except Exception as e:
        services.append(ServiceHealth(
            name="Celery",
            status="unhealthy",
            message=str(e)
        ))
    
    # Check ChromaDB
    try:
        start = time.time()
        import chromadb
        chroma_host = os.getenv("CHROMA_HOST", "vector_db")
        chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
        client = chromadb.HttpClient(host=chroma_host, port=chroma_port)
        collections = client.list_collections()
        chroma_time = (time.time() - start) * 1000
        
        services.append(ServiceHealth(
            name="ChromaDB",
            status="healthy" if chroma_time < 500 else "degraded",
            response_time_ms=round(chroma_time, 2),
            message=f"Collections: {len(collections)}",
            details={"collections": [c.name for c in collections]}
        ))
    except Exception as e:
        services.append(ServiceHealth(
            name="ChromaDB",
            status="degraded",
            message=str(e)
        ))
    
    # Check Logs Database (separate from main DB)
    try:
        from app.core.database_logs import get_logs_db
        db_logs_gen = get_logs_db()
        db_logs = next(db_logs_gen)
        try:
            start = time.time()
            db_logs.execute(text("SELECT 1"))
            logs_db_time = (time.time() - start) * 1000
            
            # Check if tables exist
            tables_exist = db_logs.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('system_logs', 'llm_logs')
                )
            """)).scalar()
            
            # Get recent log count (last hour) to verify writes
            recent_logs = db_logs.query(func.count(SystemLog.id)).filter(
                SystemLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=1)
            ).scalar() or 0
            
            services.append(ServiceHealth(
                name="Logs Database",
                status="healthy" if logs_db_time < 100 and tables_exist else "degraded",
                response_time_ms=round(logs_db_time, 2),
                message=f"Logs DB connection OK, {recent_logs} logs in last hour",
                details={
                    "tables_exist": tables_exist,
                    "recent_logs_1h": recent_logs
                }
            ))
        finally:
            try:
                next(db_logs_gen, None)
            except StopIteration:
                pass
    except Exception as e:
        services.append(ServiceHealth(
            name="Logs Database",
            status="unhealthy",
            message=str(e)
        ))
    
    # Check Logging Queue (Redis logs_queue)
    try:
        import redis
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r = redis.from_url(redis_url)
        logs_queue_length = r.llen("logs_queue")
        
        # Determine queue health
        queue_status = "healthy"
        if logs_queue_length > 1000:
            queue_status = "unhealthy"
            queue_message = f"CRITICAL: Queue backlog {logs_queue_length} - worker may be down"
        elif logs_queue_length > 100:
            queue_status = "degraded"
            queue_message = f"WARNING: Queue backlog {logs_queue_length} - worker may be slow"
        else:
            queue_message = f"Queue depth: {logs_queue_length}"
        
        services.append(ServiceHealth(
            name="Logging Queue",
            status=queue_status,
            message=queue_message,
            details={
                "queue_name": "logs_queue",
                "queue_length": logs_queue_length,
                "threshold_warning": 100,
                "threshold_critical": 1000
            }
        ))
    except Exception as e:
        services.append(ServiceHealth(
            name="Logging Queue",
            status="unhealthy",
            message=str(e)
        ))
    
    # Check Log Worker Status (check if process is running)
    try:
        import subprocess
        # Check for unified_log_worker process
        result = subprocess.run(
            ['pgrep', '-f', 'unified_log_worker'],
            capture_output=True,
            text=True,
            timeout=2
        )
        
        worker_running = result.returncode == 0
        worker_pids = result.stdout.strip().split('\n') if worker_running else []
        worker_pids = [pid for pid in worker_pids if pid]  # Remove empty strings
        
        if worker_running:
            services.append(ServiceHealth(
                name="Log Worker",
                status="healthy",
                message=f"Worker running (PIDs: {', '.join(worker_pids) if worker_pids else 'unknown'})",
                details={"pids": worker_pids, "process_name": "unified_log_worker"}
            ))
        else:
            services.append(ServiceHealth(
                name="Log Worker",
                status="unhealthy",
                message="Log worker process not found - logs may not be written to database",
                details={"process_name": "unified_log_worker"}
            ))
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        # pgrep not available or timeout - mark as unknown but not unhealthy
        services.append(ServiceHealth(
            name="Log Worker",
            status="degraded",
            message=f"Unable to check worker status: {str(e)}",
            details={"note": "Worker status check unavailable (pgrep not found or timeout)"}
        ))
    
    # Determine overall status
    statuses = [s.status for s in services]
    if "unhealthy" in statuses:
        overall = "unhealthy"
    elif "degraded" in statuses:
        overall = "degraded"
    else:
        overall = "healthy"
    
    return SystemHealthResponse(
        overall_status=overall,
        services=services,
        timestamp=datetime.now(timezone.utc)
    )

# ==================== UX Analytics Endpoint ====================

@router.get("/ux-analytics", response_model=UXAnalyticsResponse)
def get_ux_analytics(
    hours: int = Query(24, ge=1, le=168, description="Analysis period in hours"),
    db: Session = Depends(get_db),
    db_logs: Session = Depends(get_logs_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get UX analytics including response times and error rates.
    Super admin only.
    """
    require_super_admin(current_user)
    
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=hours)
    
    # Get all logs in period with response times (exclude LLM operations - they have their own monitoring)
    logs = db_logs.query(SystemLog).filter(
        and_(
            SystemLog.created_at >= start_time,
            SystemLog.response_time_ms.isnot(None),
            SystemLog.component == "api"  # Only API operations, not LLM
        )
    ).all()
    
    total_requests = len(logs)
    error_logs = [log for log in logs if log.http_status and log.http_status >= 400]
    error_count = len(error_logs)
    error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
    
    # Calculate percentiles
    response_times = sorted([log.response_time_ms for log in logs if log.response_time_ms])
    
    def percentile(data, p):
        if not data:
            return 0
        k = (len(data) - 1) * p / 100
        f = int(k)
        c = f + 1 if f + 1 < len(data) else f
        return data[f] + (data[c] - data[f]) * (k - f) if c != f else data[f]
    
    p50 = percentile(response_times, 50)
    p95 = percentile(response_times, 95)
    p99 = percentile(response_times, 99)
    
    # Slow endpoints (avg > 200ms) - exclude LLM operations
    from collections import defaultdict
    endpoint_times = defaultdict(list)
    endpoint_errors = defaultdict(int)
    
    for log in logs:
        # Skip LLM operations - they're tracked separately in LLM monitoring tab
        if log.component == "llm":
            continue
        if log.http_path:
            endpoint_times[log.http_path].append(log.response_time_ms or 0)
            if log.http_status and log.http_status >= 400:
                endpoint_errors[log.http_path] += 1
    
    slow_endpoints = []
    for path, times in endpoint_times.items():
        avg_time = sum(times) / len(times)
        if avg_time > 200:  # More than 200ms average
            slow_endpoints.append({
                "path": path,
                "avg_response_ms": round(avg_time, 2),
                "request_count": len(times),
                "max_response_ms": max(times)
            })
    slow_endpoints.sort(key=lambda x: x["avg_response_ms"], reverse=True)
    
    # Error endpoints
    error_endpoints = []
    for path, err_count in endpoint_errors.items():
        total = len(endpoint_times[path])
        error_endpoints.append({
            "path": path,
            "error_count": err_count,
            "total_requests": total,
            "error_rate": round(err_count / total * 100, 2)
        })
    error_endpoints.sort(key=lambda x: x["error_count"], reverse=True)
    
    # Requests by hour
    from collections import Counter
    hours_counter = Counter()
    for log in logs:
        hour_key = log.created_at.strftime("%Y-%m-%d %H:00")
        hours_counter[hour_key] += 1
    
    requests_by_hour = [
        {"hour": k, "count": v}
        for k, v in sorted(hours_counter.items())
    ]
    
    return UXAnalyticsResponse(
        period_hours=hours,
        total_requests=total_requests,
        error_count=error_count,
        error_rate_percent=round(error_rate, 2),
        response_time_p50_ms=round(p50, 2),
        response_time_p95_ms=round(p95, 2),
        response_time_p99_ms=round(p99, 2),
        slow_endpoints=slow_endpoints[:10],
        error_endpoints=error_endpoints[:10],
        requests_by_hour=requests_by_hour[-24:]  # Last 24 hours
    )

# ==================== Database Stats Endpoint ====================

@router.get("/database/stats", response_model=DatabaseStatsResponse)
def get_database_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get database statistics including connection pool and table sizes.
    Super admin only.
    """
    require_super_admin(current_user)
    
    from sqlalchemy import text
    
    # Get connection pool stats
    pool = db.get_bind().pool
    
    # Get table sizes
    table_sizes_query = text("""
        SELECT 
            tablename as table_name,
            pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
            pg_total_relation_size(schemaname || '.' || tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
        LIMIT 20
    """)
    
    try:
        table_sizes_result = db.execute(table_sizes_query).fetchall()
        table_sizes = [
            {"table": row[0], "size": row[1], "size_bytes": row[2]}
            for row in table_sizes_result
        ]
    except Exception:
        table_sizes = []
    
    # Get total database size
    db_size_query = text("SELECT pg_database_size(current_database())")
    try:
        db_size = db.execute(db_size_query).scalar() or 0
        db_size_mb = db_size / (1024 * 1024)
    except Exception:
        db_size_mb = 0
    
    return DatabaseStatsResponse(
        connection_pool_size=pool.size(),
        connections_in_use=pool.checkedout(),
        connections_available=pool.size() - pool.checkedout(),
        pool_overflow=pool.overflow(),
        total_tables=len(table_sizes),
        table_sizes=table_sizes,
        total_db_size_mb=round(db_size_mb, 2)
    )

# ==================== Log Cleanup Endpoint ====================

@router.delete("/logs/cleanup")
def cleanup_old_logs(
    older_than_days: int = Query(30, ge=1, le=365, description="Delete logs older than N days"),
    confirm: bool = Query(False, description="Must be true to execute deletion"),
    db_logs: Session = Depends(get_logs_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete system logs older than specified days.
    Requires confirm=true to execute.
    Super admin only.
    """
    require_super_admin(current_user)
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=older_than_days)
    
    # Count logs to be deleted
    count = db_logs.query(func.count(SystemLog.id)).filter(
        SystemLog.created_at < cutoff_date
    ).scalar() or 0
    
    if not confirm:
        return {
            "action": "preview",
            "logs_to_delete": count,
            "older_than_days": older_than_days,
            "cutoff_date": cutoff_date.isoformat(),
            "message": "Set confirm=true to delete these logs"
        }
    
    # Execute deletion
    deleted = db_logs.query(SystemLog).filter(
        SystemLog.created_at < cutoff_date
    ).delete(synchronize_session=False)
    db_logs.commit()
    
    return {
        "action": "deleted",
        "logs_deleted": deleted,
        "older_than_days": older_than_days,
        "cutoff_date": cutoff_date.isoformat()
    }

# ==================== Health History Endpoint ====================

@router.get("/health/history", response_model=HealthHistoryResponse)
def get_health_history(
    hours: int = Query(24, ge=1, le=168, description="History period in hours"),
    interval_minutes: float = Query(1.0, ge=0.5, le=60, description="Data point interval in minutes (0.5 = 30 seconds, 1 = 1 minute)"),
    db: Session = Depends(get_db),
    db_logs: Session = Depends(get_logs_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get historical health data over time.
    Returns time-series data for system health, response times, and error rates.
    Super admin only.
    """
    require_super_admin(current_user)
    
    import time
    import os
    from sqlalchemy import text
    from collections import defaultdict
    
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=hours)
    
    # Calculate number of intervals with higher precision
    interval_seconds = interval_minutes * 60
    num_intervals = int((hours * 3600) / interval_seconds)
    
    # Limit maximum data points to prevent performance issues (max 1000 points)
    max_points = 1000
    if num_intervals > max_points:
        # Auto-adjust interval to stay within limit
        interval_seconds = (hours * 3600) / max_points
        interval_minutes = interval_seconds / 60
        num_intervals = max_points
    
    # Generate time buckets
    time_buckets = []
    for i in range(num_intervals):
        bucket_time = start_time + timedelta(seconds=i * interval_seconds)
        time_buckets.append(bucket_time)
    
    # Get logs grouped by time buckets
    logs_by_bucket = defaultdict(list)
    
    # Query logs with index hint for better performance with high granularity
    # Use only necessary columns to reduce memory footprint
    logs = db_logs.query(SystemLog).filter(
        SystemLog.created_at >= start_time,
        SystemLog.created_at <= now
    ).order_by(SystemLog.created_at).all()
    
    # Group logs into time buckets
    for log in logs:
        # Find which bucket this log belongs to
        bucket_index = int((log.created_at - start_time).total_seconds() / interval_seconds)
        # Clamp bucket_index to valid range: logs at the boundary (now) go into the last bucket
        bucket_index = min(bucket_index, len(time_buckets) - 1)
        if bucket_index >= 0:
            logs_by_bucket[bucket_index].append(log)
    
    time_series = []
    
    # For each time bucket, calculate health metrics
    for i, bucket_time in enumerate(time_buckets):
        bucket_logs = logs_by_bucket.get(i, [])
        
        # Calculate response time percentiles for this bucket
        response_times = sorted([log.response_time_ms for log in bucket_logs if log.response_time_ms])
        
        def percentile(data, p):
            if not data:
                return 0
            k = (len(data) - 1) * p / 100
            f = int(k)
            c = f + 1 if f + 1 < len(data) else f
            return data[f] + (data[c] - data[f]) * (k - f) if c != f else data[f]
        
        p50 = percentile(response_times, 50)
        p95 = percentile(response_times, 95)
        p99 = percentile(response_times, 99)
        
        # Calculate error rate
        error_count = sum(1 for log in bucket_logs if log.http_status and log.http_status >= 400)
        total_requests = len([log for log in bucket_logs if log.http_status])
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        # Get service health (simulate based on logs or use current health)
        # For historical data, we'll infer health from response times and errors
        services = []
        
        # Database health - check for database-related errors
        db_errors = sum(1 for log in bucket_logs if 'database' in log.component.lower() or 'db' in log.component.lower())
        db_response_times = [log.response_time_ms for log in bucket_logs 
                            if log.http_path and ('/api' in log.http_path or '/admin' in log.http_path) 
                            and log.response_time_ms]
        avg_db_time = sum(db_response_times) / len(db_response_times) if db_response_times else 0
        
        db_status = "healthy"
        if db_errors > len(bucket_logs) * 0.1:  # More than 10% errors
            db_status = "unhealthy"
        elif avg_db_time > 500:  # Average response > 500ms
            db_status = "degraded"
        
        services.append(ServiceHealth(
            name="Database",
            status=db_status,
            response_time_ms=round(avg_db_time, 2) if avg_db_time > 0 else None,
            message=f"{len(bucket_logs)} requests, {db_errors} errors"
        ))
        
        # Redis health - check for redis-related errors
        redis_errors = sum(1 for log in bucket_logs if 'redis' in log.component.lower())
        redis_status = "healthy"
        if redis_errors > 0:
            redis_status = "degraded" if redis_errors < len(bucket_logs) * 0.1 else "unhealthy"
        
        services.append(ServiceHealth(
            name="Redis",
            status=redis_status,
            response_time_ms=None,
            message=f"{redis_errors} redis-related issues"
        ))
        
        # Celery health - check for celery-related errors
        celery_errors = sum(1 for log in bucket_logs if 'celery' in log.component.lower())
        celery_status = "healthy"
        if celery_errors > 0:
            celery_status = "degraded" if celery_errors < len(bucket_logs) * 0.1 else "unhealthy"
        
        services.append(ServiceHealth(
            name="Celery",
            status=celery_status,
            response_time_ms=None,
            message=f"{celery_errors} celery-related issues"
        ))
        
        # ChromaDB health - check for chroma-related errors
        chroma_errors = sum(1 for log in bucket_logs if 'chroma' in log.component.lower() or 'vector' in log.component.lower())
        chroma_status = "healthy"
        if chroma_errors > 0:
            chroma_status = "degraded" if chroma_errors < len(bucket_logs) * 0.1 else "unhealthy"
        
        services.append(ServiceHealth(
            name="ChromaDB",
            status=chroma_status,
            response_time_ms=None,
            message=f"{chroma_errors} chroma-related issues"
        ))
        
        time_series.append(HealthHistoryPoint(
            timestamp=bucket_time,
            services=services,
            error_rate_percent=round(error_rate, 2),
            response_time_p50_ms=round(p50, 2),
            response_time_p95_ms=round(p95, 2),
            response_time_p99_ms=round(p99, 2)
        ))
    
    return HealthHistoryResponse(
        period_hours=hours,
        time_series=time_series
    )

# ==================== WebSocket for Real-time Monitoring ====================

# Active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

async def authenticate_websocket(websocket: WebSocket) -> Optional[User]:
    """Authenticate WebSocket connection"""
    # Try to get token from query params
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
        
        # Get user from database - properly consume the generator
        db_gen = get_db()
        db = next(db_gen)
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return None
            
            # Check if super admin
            if user.role != UserRole.SUPER_ADMIN:
                await websocket.close(code=1008, reason="Super admin access required")
                return None
            
            return user
        finally:
            # Properly exhaust the generator to trigger its finally block
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
        # Ensure generator is exhausted even if exception occurred
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass

@router.websocket("/ws/monitoring")
async def websocket_monitoring(websocket: WebSocket):
    """
    WebSocket endpoint for real-time monitoring updates.
    Sends periodic updates for metrics, health, and analytics.
    Connect with: ws://host/api/v1/admin/ws/monitoring?token=YOUR_JWT_TOKEN
    """
    await websocket.accept()
    
    user = await authenticate_websocket(websocket)
    if not user:
        return
    
    connection_id = f"{user.id}_{datetime.now(timezone.utc).timestamp()}"
    active_connections[connection_id] = websocket
    refresh_interval = 5  # Default 5 seconds
    
    try:
        # Send initial data
        await send_monitoring_update(websocket, user)
        
        # Keep connection alive and send periodic updates
        while True:
            try:
                # Wait for client message or timeout
                try:
                    data = await asyncio.wait_for(websocket.receive_json(), timeout=refresh_interval)
                    if data.get("type") == "set_refresh_rate":
                        refresh_interval = max(1, min(data.get("refresh_interval", 5), 60))  # 1-60 seconds
                        await websocket.send_json({"type": "refresh_rate_updated", "interval": refresh_interval})
                except asyncio.TimeoutError:
                    # Timeout - send update
                    await send_monitoring_update(websocket, user)
            except WebSocketDisconnect:
                break
    except WebSocketDisconnect:
        pass
    finally:
        if connection_id in active_connections:
            del active_connections[connection_id]

async def send_monitoring_update(websocket: WebSocket, user: User):
    """Send monitoring data update via WebSocket"""
    db_gen = None
    try:
        # Get database session - properly consume the generator
        db_gen = get_db()
        db = next(db_gen)
        
        # Get Logs DB session
        db_logs_gen = get_logs_db()
        db_logs = next(db_logs_gen)
        
        try:
            # Get metrics
            now = datetime.now(timezone.utc)
            last_24h = now - timedelta(hours=24)
            
            # Quick metrics calculation
            total_logs = db_logs.query(func.count(SystemLog.id)).scalar() or 0
            errors_24h = db_logs.query(func.count(SystemLog.id)).filter(
                and_(
                    SystemLog.error_type.isnot(None),
                    SystemLog.created_at >= last_24h
                )
            ).scalar() or 0
            logs_24h = db_logs.query(func.count(SystemLog.id)).filter(
                SystemLog.created_at >= last_24h
            ).scalar() or 1
            error_rate = (errors_24h / logs_24h * 100) if logs_24h > 0 else 0
            
            # Get health status - check all services like the health endpoint
            import time
            import os
            from sqlalchemy import text
            
            services = []
            
            # Check Database
            try:
                start = time.time()
                db.execute(text("SELECT 1"))
                db_time = (time.time() - start) * 1000
                services.append({
                    "name": "Database",
                    "status": "healthy" if db_time < 100 else "degraded",
                    "response_time_ms": round(db_time, 2),
                    "message": "PostgreSQL connection OK"
                })
            except Exception as e:
                services.append({
                    "name": "Database",
                    "status": "unhealthy",
                    "message": str(e)
                })
            
            # Check Redis
            try:
                import redis
                redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
                start = time.time()
                r = redis.from_url(redis_url)
                r.ping()
                redis_time = (time.time() - start) * 1000
                services.append({
                    "name": "Redis",
                    "status": "healthy" if redis_time < 100 else "degraded",
                    "response_time_ms": round(redis_time, 2),
                    "message": "Redis connection OK"
                })
            except Exception as e:
                services.append({
                    "name": "Redis",
                    "status": "unhealthy",
                    "message": str(e)
                })
            
            # Check Celery (via Redis queue)
            try:
                import redis
                redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
                r = redis.from_url(redis_url)
                queue_length = r.llen("celery")
                services.append({
                    "name": "Celery",
                    "status": "healthy",
                    "message": f"Queue length: {queue_length}"
                })
            except Exception as e:
                services.append({
                    "name": "Celery",
                    "status": "unhealthy",
                    "message": str(e)
                })
            
            # Check ChromaDB
            try:
                start = time.time()
                import chromadb
                chroma_host = os.getenv("CHROMA_HOST", "vector_db")
                chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
                client = chromadb.HttpClient(host=chroma_host, port=chroma_port)
                collections = client.list_collections()
                chroma_time = (time.time() - start) * 1000
                services.append({
                    "name": "ChromaDB",
                    "status": "healthy" if chroma_time < 500 else "degraded",
                    "response_time_ms": round(chroma_time, 2),
                    "message": f"Collections: {len(collections)}"
                })
            except Exception as e:
                services.append({
                    "name": "ChromaDB",
                    "status": "degraded",
                    "message": str(e)
                })
            
            update_data = {
                "type": "monitoring_update",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metrics": {
                    "total_logs": total_logs,
                    "error_rate_24h": round(error_rate, 2),
                    "api_requests_24h": logs_24h
                },
                "health": {
                    "services": services,
                    "overall_status": "healthy" if all(s.get("status") == "healthy" for s in services) else "degraded"
                }
            }
            
            await websocket.send_json(update_data)
        finally:
            # Properly exhaust the generator to trigger its finally block
            try:
                next(db_gen, None)
            except StopIteration:
                pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass  # Connection might be closed
    finally:
        # Ensure generator is exhausted even if exception occurred
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass

# ==================== Threshold Configuration ====================

class ThresholdConfig(BaseModel):
    """Threshold configuration for monitoring"""
    response_time_warning_ms: int = 200  # Yellow threshold
    response_time_critical_ms: int = 500  # Red threshold
    error_rate_warning_percent: float = 1.0  # Yellow threshold
    error_rate_critical_percent: float = 5.0  # Red threshold
    p95_warning_ms: int = 300  # Yellow threshold for p95
    p95_critical_ms: int = 500  # Red threshold for p95
    p99_warning_ms: int = 500  # Yellow threshold for p99
    p99_critical_ms: int = 1000  # Red threshold for p99

@router.get("/thresholds", response_model=ThresholdConfig)
def get_thresholds(
    current_user: User = Depends(get_current_user)
):
    """Get threshold configuration for monitoring"""
    require_super_admin(current_user)
    return ThresholdConfig()

@router.post("/thresholds", response_model=ThresholdConfig)
def update_thresholds(
    thresholds: ThresholdConfig,
    current_user: User = Depends(get_current_user)
):
    """Update threshold configuration (stored in memory for now, could use Redis/DB)"""
    require_super_admin(current_user)
    # In production, store in Redis or database
    return thresholds

# ==================== LLM Metrics Endpoint ====================

class LLMMetricsResponse(BaseModel):
    """LLM-specific metrics"""
    total_operations: int
    operations_24h: int
    operations_by_action: Dict[str, int]
    total_tokens_used: int
    total_tokens_input: int
    total_tokens_output: int
    tokens_24h: int
    tokens_input_24h: int
    tokens_output_24h: int
    avg_tokens_per_operation: float
    avg_tokens_input_per_operation: float
    avg_tokens_output_per_operation: float
    total_cost_usd: float
    cost_24h_usd: float
    avg_latency_ms: float
    avg_latency_24h_ms: float
    total_errors: int
    errors_24h: int
    error_rate_percent: float
    operations_by_model: Dict[str, int]
    streaming_operations: int
    streaming_percentage: float
    latency_p50_ms: float
    latency_p95_ms: float
    latency_p99_ms: float
    thinking_time_avg_ms: Optional[float] = None
    response_time_avg_ms: Optional[float] = None
    implementation_time_avg_ms: Optional[float] = None
    operations_by_company: Dict[str, int]
    tokens_by_company: Dict[str, Dict[str, int]]  # {company_name: {total, input, output}}
    cost_by_company: Dict[str, float]
    operations_by_user: Dict[str, int]
    recent_operations: List[Dict[str, Any]]

@router.get("/llm/metrics", response_model=LLMMetricsResponse)
def get_llm_metrics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    db_logs: Session = Depends(get_logs_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive LLM operation metrics.
    Super admin only.
    Excludes LLM operations from API metrics.
    """
    require_super_admin(current_user)
    
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    
    # Use provided dates or default to last 24h
    start = start_date or last_24h
    end = end_date or now
    
    # Base query for LLM operations - Querying LLMLog table
    base_query = db_logs.query(LLMLog)
    
    if company_id:
        base_query = base_query.filter(LLMLog.company_id == company_id)
    
    if start_date:
        base_query = base_query.filter(LLMLog.created_at >= start)
    if end_date:
        base_query = base_query.filter(LLMLog.created_at <= end)
    
    # Total operations
    total_operations = base_query.count()
    
    # Operations in last 24h
    operations_24h = db_logs.query(func.count(LLMLog.id)).filter(
        and_(
            LLMLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    # Operations by action
    operations_by_action = {}
    action_counts = db_logs.query(
        LLMLog.action,
        func.count(LLMLog.id).label("count")
    ).filter(
        and_(
            LLMLog.created_at >= start,
            LLMLog.created_at <= end
        )
    ).group_by(LLMLog.action).all()
    for row in action_counts:
        operations_by_action[row.action] = row.count
    
    # Token statistics
    llm_logs = base_query.filter(
        LLMLog.extra_metadata.isnot(None)
    ).all()
    
    total_tokens = 0
    tokens_24h = 0
    total_tokens_input = 0
    tokens_input_24h = 0
    total_tokens_output = 0
    tokens_output_24h = 0
    total_cost = 0.0
    cost_24h = 0.0
    latencies = []
    latencies_24h = []
    streaming_count = 0
    models_used = {}
    thinking_times = []
    response_times = []
    implementation_times = []
    tokens_by_company_dict = {}
    cost_by_company_dict = {}
    
    for log in llm_logs:
        try:
            # Handle extra_metadata - JSONB returns dict, but handle string for backward compatibility
            if isinstance(log.extra_metadata, dict):
                metadata = log.extra_metadata
            elif isinstance(log.extra_metadata, str):
                metadata = json.loads(log.extra_metadata)
            else:
                metadata = log.extra_metadata if log.extra_metadata else {}
            
            # Token tracking
            tokens = metadata.get("tokens_used", 0)
            tokens_input = metadata.get("tokens_input", 0)
            tokens_output = metadata.get("tokens_output", 0)

            if tokens:
                total_tokens += tokens
                if log.created_at >= last_24h:
                    tokens_24h += tokens

            if tokens_input:
                total_tokens_input += tokens_input
                if log.created_at >= last_24h:
                    tokens_input_24h += tokens_input

            if tokens_output:
                total_tokens_output += tokens_output
                if log.created_at >= last_24h:
                    tokens_output_24h += tokens_output

            # Cost calculation
            cost = metadata.get("cost_usd", 0)
            if cost:
                total_cost += cost
                if log.created_at >= last_24h:
                    cost_24h += cost

            # Company-level aggregation
            if log.company_id:
                if log.company_id not in tokens_by_company_dict:
                    tokens_by_company_dict[log.company_id] = {"total": 0, "input": 0, "output": 0}
                tokens_by_company_dict[log.company_id]["total"] += tokens
                tokens_by_company_dict[log.company_id]["input"] += tokens_input
                tokens_by_company_dict[log.company_id]["output"] += tokens_output

                if cost:
                    if log.company_id not in cost_by_company_dict:
                        cost_by_company_dict[log.company_id] = 0.0
                    cost_by_company_dict[log.company_id] += cost

            # Latency tracking
            latency = metadata.get("latency_ms", 0)
            if latency:
                latencies.append(latency)
                if log.created_at >= last_24h:
                    latencies_24h.append(latency)
            
            # Streaming tracking
            if metadata.get("streaming", False):
                streaming_count += 1
            
            # Model tracking
            model = metadata.get("model", "unknown")
            models_used[model] = models_used.get(model, 0) + 1
            
            # Time breakdowns (if available)
            if metadata.get("thinking_time_ms"):
                thinking_times.append(metadata["thinking_time_ms"])
            if metadata.get("response_time_ms"):
                response_times.append(metadata["response_time_ms"])
            if metadata.get("implementation_time_ms"):
                implementation_times.append(metadata["implementation_time_ms"])
                
        except (json.JSONDecodeError, TypeError):
            continue
    
    # Calculate percentiles
    def percentile(data, p):
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * p / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    # Error statistics
    error_query = base_query.filter(LLMLog.error_type.isnot(None))
    total_errors = error_query.count()
    errors_24h = db_logs.query(func.count(LLMLog.id)).filter(
        and_(
            LLMLog.error_type.isnot(None),
            LLMLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    error_rate = (total_errors / total_operations * 100) if total_operations > 0 else 0
    
    # Operations by company
    operations_by_company = {}
    company_counts = db_logs.query(
        LLMLog.company_id,
        func.count(LLMLog.id).label("count")
    ).filter(
        and_(
            LLMLog.created_at >= start,
            LLMLog.created_at <= end,
            LLMLog.company_id.isnot(None)
        )
    ).group_by(LLMLog.company_id).all()
    for row in company_counts:
        company = db.query(Company).filter(Company.id == row.company_id).first()
        company_name = company.name if company else f"Company {row.company_id}"
        operations_by_company[company_name] = row.count
    
    # Tokens by company (with company names)
    tokens_by_company = {}
    cost_by_company = {}
    for company_id, token_data in tokens_by_company_dict.items():
        company = db.query(Company).filter(Company.id == company_id).first()
        company_name = company.name if company else f"Company {company_id}"
        tokens_by_company[company_name] = token_data
        if company_id in cost_by_company_dict:
            cost_by_company[company_name] = round(cost_by_company_dict[company_id], 4)
    
    # Operations by user
    operations_by_user = {}
    user_counts = db_logs.query(
        LLMLog.user_id,
        func.count(LLMLog.id).label("count")
    ).filter(
        and_(
            LLMLog.created_at >= start,
            LLMLog.created_at <= end,
            LLMLog.user_id.isnot(None)
        )
    ).group_by(LLMLog.user_id).all()
    for row in user_counts:
        user = db.query(User).filter(User.id == row.user_id).first()
        user_name = user.email if user else f"User {row.user_id}"
        operations_by_user[user_name] = row.count
    
    # Recent operations
    recent_operations = []
    recent_logs = base_query.order_by(desc(LLMLog.created_at)).limit(10).all()
    for log in recent_logs:
        metadata = {}
        try:
            if log.extra_metadata:
                # Handle extra_metadata - JSONB returns dict, but handle string for backward compatibility
                if isinstance(log.extra_metadata, dict):
                    metadata = log.extra_metadata
                elif isinstance(log.extra_metadata, str):
                    metadata = json.loads(log.extra_metadata)
                else:
                    metadata = log.extra_metadata
        except (json.JSONDecodeError, TypeError):
            metadata = {"raw": str(log.extra_metadata)} if log.extra_metadata else {}
        
        recent_operations.append({
            "id": log.id,
            "action": log.action,
            "message": log.message,
            "tokens_used": metadata.get("tokens_used", 0),
            "tokens_input": metadata.get("tokens_input", 0),
            "tokens_output": metadata.get("tokens_output", 0),
            "latency_ms": metadata.get("latency_ms", 0),
            "model": metadata.get("model", "unknown"),
            "streaming": metadata.get("streaming", False),
            "error": log.error_message,
            "created_at": log.created_at.isoformat()
        })
    
    return LLMMetricsResponse(
        total_operations=total_operations,
        operations_24h=operations_24h,
        operations_by_action=operations_by_action,
        total_tokens_used=total_tokens,
        total_tokens_input=total_tokens_input,
        total_tokens_output=total_tokens_output,
        tokens_24h=tokens_24h,
        tokens_input_24h=tokens_input_24h,
        tokens_output_24h=tokens_output_24h,
        avg_tokens_per_operation=round(total_tokens / total_operations, 2) if total_operations > 0 else 0,
        avg_tokens_input_per_operation=round(total_tokens_input / total_operations, 2) if total_operations > 0 else 0,
        avg_tokens_output_per_operation=round(total_tokens_output / total_operations, 2) if total_operations > 0 else 0,
        total_cost_usd=round(total_cost, 4),
        cost_24h_usd=round(cost_24h, 4),
        avg_latency_ms=round(sum(latencies) / len(latencies), 2) if latencies else 0,
        avg_latency_24h_ms=round(sum(latencies_24h) / len(latencies_24h), 2) if latencies_24h else 0,
        total_errors=total_errors,
        errors_24h=errors_24h,
        error_rate_percent=round(error_rate, 2),
        operations_by_model=models_used,
        streaming_operations=streaming_count,
        streaming_percentage=round(streaming_count / total_operations * 100, 2) if total_operations > 0 else 0,
        latency_p50_ms=round(percentile(latencies, 50), 2),
        latency_p95_ms=round(percentile(latencies, 95), 2),
        latency_p99_ms=round(percentile(latencies, 99), 2),
        thinking_time_avg_ms=round(sum(thinking_times) / len(thinking_times), 2) if thinking_times else None,
        response_time_avg_ms=round(sum(response_times) / len(response_times), 2) if response_times else None,
        implementation_time_avg_ms=round(sum(implementation_times) / len(implementation_times), 2) if implementation_times else None,
        operations_by_company=operations_by_company,
        tokens_by_company=tokens_by_company,
        cost_by_company=cost_by_company,
        operations_by_user=operations_by_user,
        recent_operations=recent_operations
    )
