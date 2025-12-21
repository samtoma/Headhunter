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
from app.models.models import SystemLog, UserInvitation, User, Company, UserRole
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
    include_4xx: bool = Query(True, description="Include 4xx client errors"),
    db: Session = Depends(get_db),
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
        query = db.query(SystemLog).filter(
            or_(
                SystemLog.error_type.isnot(None),
                SystemLog.http_status >= 400
            )
        )
    else:
        # Only 5xx server errors and exceptions
        query = db.query(SystemLog).filter(
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
    current_user: User = Depends(get_current_user)
):
    """
    Get UX analytics including response times and error rates.
    Super admin only.
    """
    require_super_admin(current_user)
    
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=hours)
    
    # Get all logs in period with response times
    logs = db.query(SystemLog).filter(
        SystemLog.created_at >= start_time,
        SystemLog.response_time_ms.isnot(None)
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
    
    # Slow endpoints (avg > 500ms)
    from collections import defaultdict
    endpoint_times = defaultdict(list)
    endpoint_errors = defaultdict(int)
    
    for log in logs:
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
    db: Session = Depends(get_db),
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
    count = db.query(func.count(SystemLog.id)).filter(
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
    deleted = db.query(SystemLog).filter(
        SystemLog.created_at < cutoff_date
    ).delete(synchronize_session=False)
    db.commit()
    
    return {
        "action": "deleted",
        "logs_deleted": deleted,
        "older_than_days": older_than_days,
        "cutoff_date": cutoff_date.isoformat()
    }
