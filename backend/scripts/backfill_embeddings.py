import asyncio
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.models.models import ParsedCV
from app.services.search.factory import get_search_engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database connection
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/headhunter")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def backfill():
    db = SessionLocal()
    search_engine = get_search_engine()
    
    try:
        logger.info("Starting backfill of embeddings...")
        
        # Fetch all parsed CVs
        parsed_cvs = db.query(ParsedCV).join(ParsedCV.cv).all()
        logger.info(f"Found {len(parsed_cvs)} candidates to index.")
        
        count = 0
        for pcv in parsed_cvs:
            try:
                # Construct rich text
                rich_text = f"""
                Name: {pcv.name or ''}
                Summary: {pcv.summary or ''}
                Skills: {pcv.skills or ''}
                Job History: {pcv.job_history or ''}
                Education: {pcv.education or ''}
                """
                
                # Index candidate
                # We use CV ID as the candidate ID for consistency
                success = await search_engine.index_candidate(
                    candidate_id=str(pcv.cv_id),
                    text=rich_text,
                    metadata={
                        "name": pcv.name or "Unknown",
                        "company_id": pcv.cv.company_id
                    }
                )
                
                if success:
                    count += 1
                    if count % 10 == 0:
                        logger.info(f"Indexed {count}/{len(parsed_cvs)} candidates.")
                else:
                    logger.error(f"Failed to index candidate {pcv.cv_id}")
                    
            except Exception as e:
                logger.error(f"Error processing candidate {pcv.cv_id}: {e}")
                
        logger.info(f"Backfill complete. Successfully indexed {count} candidates.")
        
    except Exception as e:
        logger.error(f"Backfill failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(backfill())
