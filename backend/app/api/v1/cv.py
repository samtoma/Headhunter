from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path

router = APIRouter(prefix="/cv", tags=["CV"])

# Save inside container path mapped to host
DATA_DIR = Path("/app/data/raw")
DATA_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_cv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF or DOCX files are allowed.")
    
    file_path = DATA_DIR / file.filename
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    return {"filename": file.filename, "status": "saved", "path": str(file_path)}