import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    from app.models.models import UserRole, User
    
    assert UserRole.INTERVIEWER == "interviewer"
    assert hasattr(User, "department")
    
    print("Imports and model checks successful!")
except Exception as e:
    print(f"Check failed: {e}")
    sys.exit(1)
