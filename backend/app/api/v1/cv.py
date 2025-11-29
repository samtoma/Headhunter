from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends, Body
from fastapi.responses import FileResponse
from typing import List, Optional
import uuid
import aiofiles
from pathlib import Path
import os
from sqlalchemy.orm import Session
from app.core.database import get_db, engine
from app.models import models
from app.models.models import User
from app.api.deps import get_current_user, get_current_user_flexible
from app.tasks.cv_tasks import process_cv_task

router = APIRouter(prefix="/cv", tags=["CV"])
RAW_DIR = Path("data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload_bulk")
async def upload_bulk(
    files: List[UploadFile] = File(...),
    job_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file extensions
    for f in files:
        if not f.filename.lower().endswith((".pdf", ".docx")):
            raise HTTPException(400, f"Unsupported file: {f.filename}")

    created_ids: List[int] = []
    for f in files:
        # Generate a unique filename to avoid collisions
        unique_name = f"{uuid.uuid4().hex}_{f.filename}"
        save_path = RAW_DIR / unique_name
        async with aiofiles.open(save_path, "wb") as out:
            await out.write(await f.read())

        # Create CV record
        cv = models.CV(filename=f.filename, filepath=str(save_path), company_id=current_user.company_id)
        db.add(cv)
        db.flush()  # obtain cv.id without committing yet
        created_ids.append(cv.id)

        # Optional job link per CV
        if job_id:
            job = db.query(models.Job).filter(models.Job.id == job_id).first()
            if job:
                db.add(models.Application(cv_id=cv.id, job_id=job_id, status="New"))

    db.commit()  # single commit for all inserts

    # Queue parsing tasks
    for cv_id in created_ids:
        process_cv_task.delay(cv_id)

    return {"ids": created_ids, "status": "queued", "count": len(created_ids)}

@router.delete("/{cv_id}")
def delete_cv(cv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cv = db.query(models.CV).filter(models.CV.id == cv_id, models.CV.company_id == current_user.company_id).first()
    if not cv:
        raise HTTPException(404, "CV not found")
    
    try:
        if os.path.exists(cv.filepath):
            os.remove(cv.filepath)
    except Exception as e:
        print(f"Error deleting file: {e}")

    db.delete(cv)
    db.commit()
    return {"status": "deleted", "id": cv_id}

@router.post("/{cv_id}/reprocess")
def reprocess_cv(cv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cv = db.query(models.CV).filter(models.CV.id == cv_id, models.CV.company_id == current_user.company_id).first()
    if not cv:
        raise HTTPException(404, "CV not found")
    
    cv.is_parsed = False
    db.commit()
    
    process_cv_task.delay(cv.id)
    return {"status": "re-queued", "id": cv_id}

@router.post("/reprocess_bulk")
def reprocess_bulk(db: Session = Depends(get_db), cv_ids: List[int] = Body(...), current_user: User = Depends(get_current_user)):
    # Reset parsed flag for each CV
    for cv_id in cv_ids:
        cv = db.query(models.CV).filter(models.CV.id == cv_id, models.CV.company_id == current_user.company_id).first()
        if cv:
            cv.is_parsed = False
            process_cv_task.delay(cv.id)
            
    db.commit()
    return {"status": "re-queued", "ids": cv_ids}

@router.get("/status")
def get_processing_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns a list of IDs for CVs that are currently processing (is_parsed=False).
    Used for lightweight polling.
    """
    processing_cvs = db.query(models.CV.id).filter(models.CV.is_parsed.is_(False), models.CV.company_id == current_user.company_id).all()
    return {"processing_ids": [cv.id for cv in processing_cvs]}

@router.get("/{cv_id}/download")
def download_cv(
    cv_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user_flexible)
):
    """
    Download CV file. Supports both header-based and query-param token auth.
    Query param token is needed for iframe viewing since iframes can't send custom headers.
    """
    cv = db.query(models.CV).filter(models.CV.id == cv_id, models.CV.company_id == current_user.company_id).first()
    
    if not cv:
        raise HTTPException(404, "CV not found")
    
    # Try multiple path resolutions
    possible_paths = [
        Path(cv.filepath),
        RAW_DIR / os.path.basename(cv.filepath),
        Path("/app/data/raw") / os.path.basename(cv.filepath)
    ]
    
    final_path = None
    for p in possible_paths:
        if p.exists():
            final_path = p
            break
            
    if not final_path:
        raise HTTPException(404, "File not found on server")
    
    # Use StreamingResponse for full control over headers
    # This ensures the PDF displays inline instead of downloading
    def iterfile():
        with open(final_path, mode="rb") as file_like:
            yield from file_like
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iterfile(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{cv.filename}"',
        }
    )