import sys
import os

# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.models import CV

def check_cv_paths():
    db = SessionLocal()
    try:
        cvs = db.query(CV).limit(5).all()
        print(f"Checking {len(cvs)} CVs...")
        print(f"Current Working Directory: {os.getcwd()}")
        
        for cv in cvs:
            print(f"CV ID: {cv.id}")
            print(f"  Filename: {cv.filename}")
            print(f"  Stored Path: {cv.filepath}")
            
            exists = os.path.exists(cv.filepath)
            print(f"  Exists (Relative): {exists}")
            
            abs_path = os.path.abspath(cv.filepath)
            print(f"  Absolute Path: {abs_path}")
            print(f"  Exists (Absolute): {os.path.exists(abs_path)}")
            
            # Check if file exists in /app/data/raw explicitly
            explicit_path = os.path.join("/app/data/raw", os.path.basename(cv.filepath))
            print(f"  Explicit /app/data/raw check: {os.path.exists(explicit_path)}")
            
    except Exception as e:
        print(f"Error checking CVs: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_cv_paths()
