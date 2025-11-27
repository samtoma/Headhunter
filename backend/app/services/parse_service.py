import json
import logging
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.sql import func
from app.models.models import CV, ParsedCV
from app.services.parser import extract_text, parse_cv_with_llm

logger = logging.getLogger(__name__)

def clean_and_dump(data, keys):
    """
    Helper to find data across multiple keys and ensure it's a valid JSON string.
    Prevents double-encoding (e.g., '"[...]"') which breaks the frontend.
    """
    val = None
    # 1. Search for the value using all possible key names
    for k in keys:
        if data.get(k):
            val = data[k]
            break
            
    if not val:
        return json.dumps([])

    # 2. If it is already a list, dump it to JSON
    if isinstance(val, list):
        return json.dumps(val)

    # 3. If it is a string, checking if it is ALREADY a JSON list
    if isinstance(val, str):
        cleaned = val.strip()
        if cleaned.startswith("[") and cleaned.endswith("]"):
            try:
                # If it parses as a list, return the original string (don't dump again!)
                parsed = json.loads(cleaned)
                if isinstance(parsed, list):
                    return cleaned
            except Exception:
                pass
        # If it's just a raw string (e.g. "hello@world.com"), wrap it in a list
        return json.dumps([cleaned])

    return json.dumps([])


def process_cv_background(cv_id: int, engine):
    """Background task that creates its own DB session.
    `engine` is the SQLAlchemy engine (passed via `db.get_bind()` from the request).
    """
    # create a fresh session for this thread
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        logger.info(f"Processing CV ID {cv_id}...")
        cv = db.query(CV).filter(CV.id == cv_id).first()
        if not cv:
            logger.warning(f"CV with ID {cv_id} not found.")
            return

        full_text = extract_text(cv.filepath)
        if not full_text:
            logger.warning(f"No text extracted for CV ID {cv_id}.")
            return

        data = parse_cv_with_llm(full_text, cv.filename)
        logger.info(f"Parsed Data for CV {cv_id}: Keys={list(data.keys())}")

        parsed_record = db.query(ParsedCV).filter(ParsedCV.cv_id == cv.id).first()
        if not parsed_record:
            parsed_record = ParsedCV(cv_id=cv.id)
            db.add(parsed_record)

        # Populate fields
        parsed_record.raw_text = full_text
        parsed_record.name = data.get("name")
        parsed_record.summary = data.get("summary")
        parsed_record.email = clean_and_dump(data, ["email", "emails"])
        parsed_record.phone = clean_and_dump(data, ["phone", "phones"])
        parsed_record.social_links = clean_and_dump(data, ["social_links", "links"])
        parsed_record.skills = clean_and_dump(data, ["skills", "tech_stack"])
        parsed_record.education = json.dumps(data.get("education", []))
        parsed_record.job_history = json.dumps(data.get("job_history", []))
        parsed_record.address = data.get("address")
        parsed_record.age = data.get("age")
        parsed_record.marital_status = data.get("marital_status")
        parsed_record.military_status = data.get("military_status")
        parsed_record.bachelor_year = data.get("bachelor_year")
        parsed_record.last_job_title = data.get("last_job_title")
        parsed_record.last_company = data.get("last_company")
        parsed_record.experience_years = data.get("experience_years")
        parsed_record.parsed_at = func.now()
        cv.is_parsed = True
        db.commit()
        logger.info(f"Finished CV ID {cv_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing CV {cv_id}: {e}")
    finally:
        db.close()