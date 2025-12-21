from sqlalchemy import Column, Integer, String, Text, DateTime, BigInteger, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

# Separate Base for Logs DB to prevent metadata conflicts
LogBase = declarative_base()

class SystemLog(LogBase):
    """
    Comprehensive system log for tracking all system events, errors, deployments, and operations.
    Resides in 'headhunter_logs' database.
    """
    __tablename__ = "system_logs"
    id = Column(Integer, primary_key=True, index=True)
    
    # Log metadata
    level = Column(String, nullable=False, index=True)  # "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"
    component = Column(String, nullable=False, index=True)  # "api", "celery", "auth", "cv_parser", etc.
    action = Column(String, nullable=False, index=True)  # "user_invited", "deployment", "error", etc.
    message = Column(Text, nullable=False)
    
    # Context (No Foreign Keys to Main DB)
    user_id = Column(Integer, nullable=True, index=True)
    company_id = Column(Integer, nullable=True, index=True)
    request_id = Column(String, nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    
    # Request/Response tracking
    http_method = Column(String, nullable=True)
    http_path = Column(String, nullable=True, index=True)
    http_status = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Error tracking
    error_type = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    
    # Additional context
    extra_metadata = Column(JSONB, nullable=True)  # Native JSONB for proper dict handling
    
    # Deployment tracking
    deployment_version = Column(String, nullable=True, index=True)
    deployment_environment = Column(String, nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class LLMLog(LogBase):
    """
    LLM Log model for analytics.
    Resides in 'headhunter_logs' database.
    """
    __tablename__ = "llm_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    level = Column(String(20), nullable=False, index=True)
    component = Column(String(50), nullable=False, default="llm", index=True)
    action = Column(String(100), nullable=False, index=True)
    message = Column(Text, nullable=False)
    
    # Context (No FKs)
    user_id = Column(Integer, index=True)
    company_id = Column(Integer, index=True)
    interview_id = Column(Integer)
    
    # Error tracking
    error_type = Column(String(100))
    error_message = Column(Text)
    
    # Metadata
    extra_metadata = Column(JSONB, nullable=True)  # Native JSONB for proper dict handling 
    
    deployment_version = Column(String(50))
    deployment_environment = Column(String(50))
