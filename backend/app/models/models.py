from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    SUPER_ADMIN = "super_admin"

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="company")
    jobs = relationship("Job", back_populates="company")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default=UserRole.RECRUITER) # "admin" or "recruiter"
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # SSO and Verification
    sso_provider = Column(String, nullable=True)
    sso_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    
    company = relationship("Company", back_populates="users")
    login_count = Column(Integer, default=0)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    action = Column(String, nullable=False) # e.g. "login", "view_candidate"
    details = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    required_experience = Column(Integer, default=0)
    skills_required = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")

class CV(Base):
    __tablename__ = "cvs"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_parsed = Column(Boolean, default=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    applications = relationship("Application", back_populates="cv", cascade="all, delete-orphan")
    parsed_data = relationship("ParsedCV", back_populates="cv", uselist=False, cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(Integer, ForeignKey("cvs.id", ondelete="CASCADE"))
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"))
    status = Column(String, default="New")
    rating = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    current_salary = Column(String, nullable=True)
    expected_salary = Column(String, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    cv = relationship("CV", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")

class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    step = Column(String, nullable=False) # e.g. "Screening", "Technical"
    outcome = Column(String, nullable=True) # e.g. "Passed", "Failed", "Pending"
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    custom_data = Column(Text, nullable=True) # JSON string of custom field values
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="interviews")
    interviewer = relationship("User")

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