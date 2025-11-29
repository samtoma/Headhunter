from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, CV, ParsedCV
from app.services.vector_db import vector_db
from app.services.embeddings import generate_embedding
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
        # 1. Generate embedding for the query
        query_embedding = await generate_embedding(q)
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate query embedding")

        # 2. Search Vector DB
        results = vector_db.search(
            query_embeddings=query_embedding,
            n_results=limit
        )

        if not results or not results['ids'] or not results['ids'][0]:
            return []

        # 3. Fetch full CV details from DB
        # results['ids'][0] is a list of IDs (because we passed a list of queries)
        cv_ids = [int(id_str) for id_str in results['ids'][0]]
        
        # Preserve order of results
        # We fetch all and then reorder in python
        cvs = db.query(CV).filter(CV.id.in_(cv_ids)).all()
        cv_map = {cv.id: cv for cv in cvs}
        
        ordered_response = []
        for i, cv_id in enumerate(cv_ids):
            if cv_id in cv_map:
                cv = cv_map[cv_id]
                # Basic info to return
                item = {
                    "id": cv.id,
                    "filename": cv.filename,
                    "score": results['distances'][0][i] if 'distances' in results else 0,
                    "name": cv.parsed_data.name if cv.parsed_data else "Unknown",
                    "skills": cv.parsed_data.skills if cv.parsed_data else [],
                    "summary": cv.parsed_data.summary if cv.parsed_data else "",
                    "last_job_title": cv.parsed_data.last_job_title if cv.parsed_data else ""
                }
                ordered_response.append(item)
                
        return ordered_response

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
