from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class CV(Base):
    __tablename__ = "cvs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_parsed = Column(Boolean, default=False)

    parsed_data = relationship("ParsedCV", back_populates="cv", uselist=False, cascade="all, delete-orphan")

class ParsedCV(Base):
    __tablename__ = "parsed_cvs"
    
    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(Integer, ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, unique=True)
     
    raw_text = Column(Text, nullable=True)
    name = Column(String, nullable=True)
    
    email = Column(Text, nullable=True) 
    phone = Column(Text, nullable=True)
    
    # --- NEW PERSONAL FIELDS ---
    address = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    marital_status = Column(String, nullable=True)
    military_status = Column(String, nullable=True)
    bachelor_year = Column(Integer, nullable=True) # To calc post-grad exp
    # ---------------------------

    last_job_title = Column(String, nullable=True)
    last_company = Column(String, nullable=True)
    
    social_links = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    job_history = Column(Text, nullable=True) # Full history JSON
    skills = Column(Text, nullable=True)
    
    experience_years = Column(Integer, nullable=True) # Calculated one
    
    parsed_at = Column(DateTime(timezone=True), server_default=func.now())

    cv = relationship("CV", back_populates="parsed_data")