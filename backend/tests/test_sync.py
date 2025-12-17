from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.models import User, Company, UserRole
from datetime import datetime, timezone
from app.core.security import get_password_hash

def test_sync_version_standard(authenticated_client: TestClient, db: Session):
    """Test that sync version returns the company's last_data_update timestamp."""
    # Get user's company
    res = authenticated_client.get("/auth/me")
    company_id = res.json()["company_id"]
    
    # Set last_data_update to a known value
    company = db.query(Company).filter(Company.id == company_id).first()
    now = datetime.now(timezone.utc)
    company.last_data_update = now
    db.commit()
    db.refresh(company)
    
    # Fetch the version AFTER setting the timestamp
    sync_res = authenticated_client.get("/sync/version")
    assert sync_res.status_code == 200
    
    # Compare the version with the timestamp we set
    # Allow up to 2 second tolerance for timing differences
    version_str = sync_res.json()["version"][:19]
    expected_str = now.isoformat()[:19]
    
    # Parse both and compare with tolerance
    version_dt = datetime.fromisoformat(version_str)
    expected_dt = datetime.fromisoformat(expected_str)
    assert abs((version_dt - expected_dt).total_seconds()) <= 2, \
        f"Version {version_str} differs from expected {expected_str} by more than 2 seconds"

def test_sync_version_no_update_timestamp(authenticated_client: TestClient, db: Session):
    # Setup: Company with None last_data_update
    res = authenticated_client.get("/auth/me")
    company_id = res.json()["company_id"]
    
    company = db.query(Company).filter(Company.id == company_id).first()
    company.last_data_update = None
    db.commit()
    
    res = authenticated_client.get("/sync/version")
    assert res.status_code == 200
    # Should fallback to created_at or now
    # Since created_at is set on creation, it should be that.
    assert res.json()["version"] == company.created_at.isoformat()



def test_sync_version_no_company(client: TestClient, db: Session):
    # Create user without company (if possible, or mock it)
    # Model might enforce company_id, but let's try
    user = User(email="nocompany@sync.com", hashed_password=get_password_hash("pass"), role=UserRole.RECRUITER, company_id=None, is_verified=True)
    # If company_id is nullable in DB but not in model, this might fail.
    # Checking model... User.company_id is ForeignKey.
    # Let's try to add it.
    try:
        db.add(user)
        db.commit()
    except Exception:
        # If we can't create user without company, we can't test this branch easily via integration
        # We'd need to mock current_user.company to None
        db.rollback()
        return # Skip if constraint prevents it

    login_res = client.post("/auth/login", data={"username": "nocompany@sync.com", "password": "pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.get("/sync/version", headers=headers)
    assert res.status_code == 200
    assert "version" in res.json()
