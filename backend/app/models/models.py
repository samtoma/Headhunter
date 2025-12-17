from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    INTERVIEWER = "interviewer"
    HIRING_MANAGER = "hiring_manager"
    SUPER_ADMIN = "super_admin"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    DEACTIVATED = "deactivated"
    SUSPENDED = "suspended"
    PENDING = "pending"

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True) # Can be inferred from domain or set manually
    domain = Column(String, unique=True, index=True, nullable=False) # e.g. "tpaymobile.com"
    website = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    culture = Column(Text, nullable=True)
    interview_stages = Column(Text, nullable=True) # JSON string of stages and fields
    
    # LinkedIn-style enhanced fields
    tagline = Column(String, nullable=True)  # Short company tagline
    founded_year = Column(Integer, nullable=True)  # Year founded
    company_size = Column(String, nullable=True)  # e.g. "51-200 employees"
    headquarters = Column(String, nullable=True)  # HQ location
    company_type = Column(String, nullable=True)  # Private, Public, Startup, etc.
    specialties = Column(Text, nullable=True)  # JSON array of specialties
    mission = Column(Text, nullable=True)  # Mission statement
    vision = Column(Text, nullable=True)  # Vision statement
    values = Column(Text, nullable=True)  # JSON array of core values
    products_services = Column(Text, nullable=True)  # Detailed products/services
    target_market = Column(Text, nullable=True)  # Target market description
    competitive_advantage = Column(Text, nullable=True)  # What makes them unique
    social_linkedin = Column(String, nullable=True)  # LinkedIn URL
    social_twitter = Column(String, nullable=True)  # Twitter URL
    social_facebook = Column(String, nullable=True)  # Facebook URL
    logo_url = Column(String, nullable=True)  # Company logo URL
    
    logo_url = Column(String, nullable=True)  # Company logo URL
    departments = Column(Text, nullable=True) # JSON list of departments
    
    last_data_update = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="company")
    jobs = relationship("Job", back_populates="company")
    departments_rel = relationship("Department", back_populates="company", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)  # Display name from SSO or user input
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    status = Column(String, default=UserStatus.ACTIVE, nullable=False) # "active", "deactivated", "suspended", "pending"
    role = Column(String, default=UserRole.RECRUITER) # "admin", "recruiter", "interviewer"
    department = Column(String, nullable=True) # e.g. "Engineering", "Sales"
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # SSO and Verification
    sso_provider = Column(String, nullable=True)
    sso_id = Column(String, nullable=True)
    sso_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    profile_picture = Column(Text, nullable=True) # Base64 encoded or URL
    feature_flags = Column(Text, nullable=True) # JSON for granular feature toggles
    
    company = relationship("Company", back_populates="users")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    login_count = Column(Integer, default=0)
    permissions = Column(Text, nullable=True) # JSON permissions e.g. {"view_salary": true}

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    technologies = Column(Text, nullable=True) # JSON list of shared technologies
    job_templates = Column(Text, nullable=True) # JSON list of specific sections for job titles
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    modified_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    company = relationship("Company", back_populates="departments_rel")
    creator = relationship("User", foreign_keys=[created_by])
    modifier = relationship("User", foreign_keys=[modified_by])

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True, index=True)
    action = Column(String, nullable=False) # e.g. "login", "view_candidate", "status_change", "note_added"
    details = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="activity_logs")

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=True, index=True)
    description = Column(Text, nullable=True)
    required_experience = Column(Integer, default=0)
    skills_required = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    status = Column(String, default="Open") # "Open", "Closed", "On Hold"
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    
    # Enhanced job description fields
    location = Column(String, nullable=True)  # e.g. "Remote", "New York, NY"
    employment_type = Column(String, nullable=True)  # Full-time, Part-time, Contract
    salary_range = Column(String, nullable=True)  # e.g. "$80k-$120k"
    responsibilities = Column(Text, nullable=True)  # JSON array of responsibilities
    qualifications = Column(Text, nullable=True)  # JSON array of required qualifications
    preferred_qualifications = Column(Text, nullable=True)  # JSON array of nice-to-haves
    benefits = Column(Text, nullable=True)  # JSON array of benefits
    team_info = Column(Text, nullable=True)  # Information about the team
    growth_opportunities = Column(Text, nullable=True)  # Career growth description
    application_process = Column(Text, nullable=True)  # Description of hiring process
    remote_policy = Column(String, nullable=True)  # Remote work policy
    
    # Landing Page fields
    landing_page_enabled = Column(Boolean, default=False)  # Enable public landing page
    landing_page_slug = Column(String, unique=True, index=True, nullable=True)  # Unique URL slug
    landing_page_config = Column(Text, nullable=True)  # JSON config for customization
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    modified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    modifier = relationship("User", foreign_keys=[modified_by])

class CV(Base):
    __tablename__ = "cvs"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_parsed = Column(Boolean, default=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    
    # Origin tracking - how did this CV enter the system?
    # Values: "manual" (user upload), "landing_page" (public apply), "api", "linkedin_import", etc.
    original_source = Column(String, nullable=True, default="manual")
    
    # Audit field
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    applications = relationship("Application", back_populates="cv", cascade="all, delete-orphan")
    parsed_data = relationship("ParsedCV", back_populates="cv", uselist=False, cascade="all, delete-orphan")
    uploader = relationship("User", foreign_keys=[uploaded_by])

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(Integer, ForeignKey("cvs.id", ondelete="CASCADE"), index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    status = Column(String, default="New", index=True)
    rating = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    current_salary = Column(String, nullable=True)
    expected_salary = Column(String, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    hired_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who added to this pipeline
    source = Column(String, nullable=True)  # "manual", "api", "landing_page", "bulk_assign"
    tracking_data = Column(Text, nullable=True)  # JSON: UTM params, referrer, user agent for analytics
    
    cv = relationship("CV", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="application", cascade="all, delete-orphan")
    assigner = relationship("User", foreign_keys=[assigned_by])

class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    step = Column(String, nullable=False) # e.g. "Screening", "Technical"
    status = Column(String, default="Scheduled", index=True) # "Scheduled", "Completed", "Cancelled", "No Show"
    outcome = Column(String, nullable=True) # e.g. "Passed", "Failed", "Pending"
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    custom_data = Column(Text, nullable=True) # JSON string of custom field values
    stage_feedback = Column(Text, nullable=True)  # JSON storing feedback per stage
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    application = relationship("Application", back_populates="interviews")
    interviewer = relationship("User", foreign_keys=[interviewer_id])

class PasswordResetToken(Base):
    """Model for password reset tokens with expiration and single-use functionality."""
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="password_reset_tokens")

class ParsedCV(Base):
    __tablename__ = "parsed_cvs"
    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(Integer, ForeignKey("cvs.id", ondelete="CASCADE"), unique=True)
    raw_text = Column(Text, nullable=True)
    name = Column(String, nullable=True)
    email = Column(Text, nullable=True) 
    phone = Column(Text, nullable=True)
    address = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    marital_status = Column(String, nullable=True)
    military_status = Column(String, nullable=True)
    bachelor_year = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True) 
    last_job_title = Column(String, nullable=True)
    last_company = Column(String, nullable=True)
    social_links = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    job_history = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    experience_years = Column(Integer, nullable=True)
    current_salary = Column(String, nullable=True)
    expected_salary = Column(String, nullable=True)
    parsed_at = Column(DateTime(timezone=True), server_default=func.now())
    cv = relationship("CV", back_populates="parsed_data")