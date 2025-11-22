import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.models.models import CV, ParsedCV
from app.services.parser import extract_text, parse_cv_with_llm

logger = logging.getLogger(__name__)

def process_cv_background(cv_id: int, db: Session):
    logger.info(f"Processing CV ID {cv_id}...")
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if not cv: return

    try:
        full_text = extract_text(cv.filepath)
        if not full_text: return

        data = parse_cv_with_llm(full_text, cv.filename)

        parsed_record = db.query(ParsedCV).filter(ParsedCV.cv_id == cv.id).first()
        if not parsed_record:
            parsed_record = ParsedCV(cv_id=cv.id)
            db.add(parsed_record)
        
        parsed_record.raw_text = full_text
        parsed_record.name = data.get("name")
        parsed_record.email = json.dumps(data.get("emails", []))
        parsed_record.phone = json.dumps(data.get("phones", []))
        
        # Personal Details
        parsed_record.address = data.get("address")
        parsed_record.age = data.get("age")
        parsed_record.marital_status = data.get("marital_status")
        parsed_record.military_status = data.get("military_status")
        parsed_record.bachelor_year = data.get("bachelor_year")
        
        parsed_record.last_job_title = data.get("last_job_title")
        parsed_record.last_company = data.get("last_company")
        
        # Lists
        parsed_record.social_links = json.dumps(data.get("social_links", []))
        parsed_record.education = json.dumps(data.get("education", []))
        parsed_record.job_history = json.dumps(data.get("job_history", []))
        parsed_record.skills = json.dumps(data.get("skills", []))
        
        parsed_record.experience_years = data.get("experience_years")
        parsed_record.parsed_at = func.now()

        cv.is_parsed = True
        db.commit()
        logger.info(f"Finished CV ID {cv_id}")

    except Exception as e:
        db.rollback()
        logger.error(f"Error processing CV {cv_id}: {e}")