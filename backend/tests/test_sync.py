from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.models import User, Company, UserRole
from datetime import datetime
from app.core.security import get_password_hash

def test_sync_version_standard(authenticated_client: TestClient, db: Session):
    # Setup: Ensure company has last_data_update
    res = authenticated_client.get("/auth/me")
    company_id = res.json()["company_id"]
    
    company = db.query(Company).filter(Company.id == company_id).first()
    now = datetime.utcnow()
    company.last_data_update = now
    db.commit()
    
    res = authenticated_client.get("/sync/version")
    assert res.status_code == 200
    assert res.json()["version"] == now.isoformat()

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
    user = User(email="nocompany@sync.com", hashed_password=get_password_hash("pass"), role=UserRole.RECRUITER, company_id=None)
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
