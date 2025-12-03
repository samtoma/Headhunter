from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, CV
from app.services.search.factory import get_search_engine
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/candidates", response_model=List[dict])
async def search_candidates(
    q: str = Query(..., description="Natural language query (e.g. 'Python developer with AWS')"),
    limit: int = Query(10, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Semantic search for candidates using Vector DB.
    """
    if not q:
        return []

    try:
        search_engine = get_search_engine()
        
        # Search Vector DB
        # The search engine handles embedding generation internally for the query if needed, 
        # but our current interface expects text.
        results = await search_engine.search(
            query_text=q,
            n_results=limit,
            filters={"company_id": current_user.company_id} if current_user.company_id else None
        )

        if not results:
            return []

        # 3. Fetch full CV details from DB
        cv_ids = [int(res['id']) for res in results]
        
        # Preserve order of results
        # We fetch all and then reorder in python
        cvs = db.query(CV).filter(CV.id.in_(cv_ids)).all()
        cv_map = {cv.id: cv for cv in cvs}
        
        # Map scores
        scores_map = {int(res['id']): res['score'] for res in results}
        
        # 4. Silver Medalist Logic
        # Fetch applications for these CVs to identify silver medalists
        # Silver Medalist = Candidate who reached advanced stages in previous applications
        from app.models.models import Application
        advanced_stages = ["Interview", "Offer", "Technical Assessment", "Final Round"]
        
        # Find CVs that have ANY application in advanced stages (even if rejected later)
        # We check for applications associated with these CVs
        silver_medalist_cv_ids = set()
        if cv_ids:
            silver_apps = db.query(Application.cv_id).filter(
                Application.cv_id.in_(cv_ids),
                Application.status.in_(advanced_stages)
            ).all()
            silver_medalist_cv_ids = {app.cv_id for app in silver_apps}

        ordered_response = []
        for cv_id in cv_ids:
            if cv_id in cv_map:
                cv = cv_map[cv_id]
                
                # Calculate final score with boost
                base_score = scores_map.get(cv.id, 0)
                is_silver_medalist = cv.id in silver_medalist_cv_ids
                
                # Apply 15% boost for silver medalists, capped at 1.0 (unless it was already 1.0)
                final_score = base_score
                if is_silver_medalist:
                    final_score = min(1.0, base_score * 1.15)
                
                # Basic info to return
                item = {
                    "id": cv.id,
                    "filename": cv.filename,
                    "score": final_score,
                    "is_silver_medalist": is_silver_medalist, # Return flag for UI if needed
                    "name": cv.parsed_data.name if cv.parsed_data else "Unknown",
                    "skills": cv.parsed_data.skills if cv.parsed_data else [],
                    "summary": cv.parsed_data.summary if cv.parsed_data else "",
                    "last_job_title": cv.parsed_data.last_job_title if cv.parsed_data else ""
                }
                ordered_response.append(item)
        
        # Re-sort by final score descending since boosts might have changed the order
        ordered_response.sort(key=lambda x: x["score"], reverse=True)
                
        return ordered_response

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
