from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from pathlib import Path
import os
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.services.parse_service import process_cv_background

router = APIRouter(prefix="/cv", tags=["CV"])
RAW_DIR = Path("/data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_cv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    job_id: Optional[int] = Form(None), # <--- Added this to accept the ID
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(400, "Only PDF/DOCX allowed")

    save_path = RAW_DIR / file.filename
    with open(save_path, "wb") as f:
        f.write(await file.read())

    # 1. Create CV Record
    new_cv = models.CV(
        filename=file.filename, 
        filepath=str(save_path)
    )
    db.add(new_cv)
    db.commit()
    db.refresh(new_cv)

    # 2. Link to Job (if uploaded to a track)
    if job_id:
        # Check if job exists first
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if job:
            application = models.Application(
                cv_id=new_cv.id, 
                job_id=job_id, 
                status="New"
            )
            db.add(application)
            db.commit()

    # 3. Queue AI Parsing
    background_tasks.add_task(process_cv_background, new_cv.id, db)
    
    return {"id": new_cv.id, "status": "queued"}

@router.delete("/{cv_id}")
def delete_cv(cv_id: int, db: Session = Depends(get_db)):
    cv = db.query(models.CV).filter(models.CV.id == cv_id).first()
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
def reprocess_cv(cv_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    cv = db.query(models.CV).filter(models.CV.id == cv_id).first()
    if not cv: raise HTTPException(404, "CV not found")
    
    cv.is_parsed = False
    db.commit()
    
    background_tasks.add_task(process_cv_background, cv.id, db)
    return {"status": "re-queued", "id": cv_id}