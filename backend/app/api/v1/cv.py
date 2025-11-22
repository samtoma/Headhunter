from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from pathlib import Path
import os
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import models
from app.services.parse_service import process_cv_background

router = APIRouter(prefix="/cv", tags=["CV"])
RAW_DIR = Path("/app/data/raw")
RAW_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_cv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(400, "Only PDF/DOCX allowed")

    save_path = RAW_DIR / file.filename
    with open(save_path, "wb") as f:
        f.write(await file.read())

    new_cv = models.CV(filename=file.filename, filepath=str(save_path))
    db.add(new_cv)
    db.commit()
    db.refresh(new_cv)

    background_tasks.add_task(process_cv_background, new_cv.id, db)
    return {"id": new_cv.id, "status": "queued"}

@router.delete("/{cv_id}")
def delete_cv(cv_id: int, db: Session = Depends(get_db)):
    cv = db.query(models.CV).filter(models.CV.id == cv_id).first()
    if not cv:
        raise HTTPException(404, "CV not found")
    
    # Delete file from disk
    try:
        if os.path.exists(cv.filepath):
            os.remove(cv.filepath)
    except Exception as e:
        print(f"Error deleting file: {e}")

    # Delete from DB (Cascade deletes parsed data)
    db.delete(cv)
    db.commit()
    return {"status": "deleted", "id": cv_id}

@router.post("/{cv_id}/reprocess")
def reprocess_cv(
    cv_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    cv = db.query(models.CV).filter(models.CV.id == cv_id).first()
    if not cv:
        raise HTTPException(404, "CV not found")
    
    cv.is_parsed = False
    db.commit()
    
    background_tasks.add_task(process_cv_background, cv.id, db)
    return {"status": "re-queued", "id": cv_id}