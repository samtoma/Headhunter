
import os
import sys
import logging


# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal
from app.models.models import ParsedCV
from app.services.vector_db import vector_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def check_status():
    print("\n=== AI Search Embedding Status ===\n")
    
    # 1. Get Count from Postgres (Source of Truth)
    db = SessionLocal()
    try:
        parsed_count = db.query(ParsedCV).count()
        print(f"✅ Total Parsed CVs in Database: {parsed_count}")
        
        # Get all parsed IDs for comparison
        parsed_ids = set(str(p.cv_id) for p in db.query(ParsedCV.cv_id).all())
        
    except Exception as e:
        print(f"❌ Error reading Postgres: {e}")
        return
    finally:
        db.close()

    # 2. Get Count from ChromaDB
    chroma_count = 0
    chroma_ids = set()
    try:
        if hasattr(vector_db, 'collection'):
            chroma_count = vector_db.collection.count()
            print(f"✅ Total Embedded CVs in Search Index: {chroma_count}")
            
            # Get IDs to find discrepancy
            # Chroma peek/get might be slow for ALL, but let's try getting just IDs
            results = vector_db.collection.get(include=[]) # Get all IDs only
            chroma_ids = set(results['ids'])
        else:
            print("❌ Vector DB not initialized correctly.")
    except Exception as e:
        print(f"❌ Error reading ChromaDB: {e}")
        return

    # 3. Compare
    print("\n--- Compliance Report ---")
    if parsed_count == chroma_count:
        print("🎉 SUCCESS: All parsed CVs are indexed!")
    else:
        diff = parsed_count - chroma_count
        print("⚠️  WARNING: Mismatch detected.")
        print(f"   Missing from Search: {diff} CVs")
        
        missing_ids = parsed_ids - chroma_ids
        if missing_ids:
            sample = list(missing_ids)[:10]
            print(f"   Sample Missing IDs: {sample}")
            print("\n   To fix, run:")
            print("   docker exec headhunter_backend python scripts/reindex_chroma.py")
            
    print("\n==================================")

if __name__ == "__main__":
    check_status()
