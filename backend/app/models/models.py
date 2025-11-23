from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # --- NEW FIELDS ---
    required_experience = Column(Integer, default=0) # e.g. 5 (years)
    skills_required = Column(Text, nullable=True)    # e.g. ["Python", "React"]
    # ------------------

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")

class CV(Base):
    __tablename__ = "cvs"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_parsed = Column(Boolean, default=False)
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