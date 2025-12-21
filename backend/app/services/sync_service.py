
import logging
import json

from app.core.database import SessionLocal
from app.models.models import ParsedCV, CV
from app.services.vector_db import vector_db
from app.services.embeddings import generate_embedding

logger = logging.getLogger(__name__)

def construct_rich_text(parsed: ParsedCV) -> str:
    """Reconstruct rich text for embedding from ParsedCV fields."""
    
    def get_list(text_val):
        if not text_val: 
            return []
        try:
            val = json.loads(text_val)
            if isinstance(val, list): 
                return val
            if isinstance(val, dict): 
                return [str(val)]
            return [str(val)]
        except Exception:
            return [str(text_val)]

    job_history_list = get_list(parsed.job_history)
    titles = [j.get('title', '') for j in job_history_list if isinstance(j, dict)]
    titles_str = " ".join(titles)
    
    rich_text = f"""
    Name: {parsed.name or ''}
    Job Titles: {titles_str} {titles_str} {titles_str}
    Summary: {parsed.summary or ''}
    Skills: {parsed.skills or ''}
    Job History: {parsed.job_history or ''}
    Education: {parsed.education or ''}
    """
    return rich_text

async def sync_embeddings(limit: int = 500):
    """
    Synchronizes Postgres ParsedCVs with ChromaDB embeddings.
    Checks for missing candidates or incorrect metadata and updates them.
    """
    db = SessionLocal()
    try:
        # Fetch parsed CVs that have a company_id
        results = db.query(ParsedCV, CV).join(CV, ParsedCV.cv_id == CV.id).limit(limit).all()
        
        logger.info(f"[Sync] Found {len(results)} parsed CVs to check.")
        
        count_updated = 0
        count_new = 0
        
        for parsed, cv in results:
            if not cv.company_id:
                continue

            existing = None
            try:
                if hasattr(vector_db, 'collection'):
                    # Only ask for IDs and Metadatas first to be faster? 
                    # No, we need embeddings to know if we can skip generation.
                    # Getting embeddings is heavy payload.
                    # Optimization: Check ID existence first? 
                    # For now keep logic simple as in script.
                    existing = vector_db.collection.get(ids=[str(cv.id)], include=["embeddings", "metadatas"])
            except Exception as e:
                logger.warning(f"[Sync] Error reading Chroma for {cv.id}: {e}")

            embedding = None
            current_metadata = {}
            needs_update = False
            needs_new_embedding = False
            
            if existing and existing['ids'] and len(existing['ids']) > 0:
                # Exists
                has_embedding = existing['embeddings'] is not None and len(existing['embeddings']) > 0
                if existing['metadatas'] and len(existing['metadatas']) > 0:
                    current_metadata = existing['metadatas'][0]
                
                # Check Metadata
                if str(current_metadata.get('company_id')) != str(cv.company_id):
                    needs_update = True
                
                # Check Embedding
                if has_embedding:
                    embedding = existing['embeddings'][0]
                else:
                    needs_new_embedding = True
            else:
                needs_new_embedding = True
                needs_update = True  # It's a new insert

            if not needs_update and not needs_new_embedding:
                continue

            if needs_new_embedding:
                logger.info(f"[Sync] Generating new embedding for CV {cv.id}...")
                rich_text = construct_rich_text(parsed)
                embedding = await generate_embedding(rich_text, cv_id=cv.id, company_id=cv.company_id, user_id=cv.uploaded_by)
                if not embedding:
                    logger.error(f"[Sync] Failed to generate embedding for CV {cv.id}")
                    continue
                count_new += 1
            else:
                count_updated += 1
                logger.info(f"[Sync] Updating metadata for CV {cv.id}...")

            # UPSERT
            metadata = {
                "name": parsed.name or "Unknown",
                "email": parsed.email or "[]",
                "filename": cv.filename,
                "cv_id": cv.id,
                "company_id": cv.company_id
            }
            
            try:
                vector_db.upsert(
                    ids=[str(cv.id)],
                    documents=[construct_rich_text(parsed)],
                    metadatas=[metadata],
                    embeddings=[embedding]
                )
            except Exception as e:
                logger.error(f"[Sync] Failed to upsert CV {cv.id}: {e}")

        logger.info(f"[Sync] Complete. New: {count_new}, Updated: {count_updated}")

    except Exception as e:
        logger.error(f"[Sync] Critical error: {e}")
    finally:
        db.close()
