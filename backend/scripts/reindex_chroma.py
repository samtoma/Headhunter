
import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.sync_service import sync_embeddings

if __name__ == "__main__":
    # Limit set to 1000 to cover all current CVs (270)
    print("Starting manual re-indexing...")
    asyncio.run(sync_embeddings(limit=1000))
    print("Manual re-indexing complete.")
