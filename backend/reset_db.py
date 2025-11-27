import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.core.database import engine, Base
from app.models import models  # Import models to register them with Base

def reset_db():
    print("⚠️  WARNING: This will DELETE ALL DATA in the database.")
    confirmation = input("Type 'yes' to confirm: ")
    if confirmation != 'yes':
        print("❌ Aborted.")
        return

    print("🗑️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped.")
    
    print("🔄 Recreating tables with new schema...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables recreated successfully.")

if __name__ == "__main__":
    reset_db()
