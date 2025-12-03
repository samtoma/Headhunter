from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.models import User, Company, UserRole
from unittest.mock import AsyncMock, patch
from app.api.v1.sso import sso

def test_microsoft_login_redirect(client: TestClient):
    with patch("app.api.v1.sso.sso.get_login_redirect", new_callable=AsyncMock) as mock_redirect:
        mock_redirect.return_value = "http://microsoft.com/login"
        res = client.get("/auth/microsoft/login")
        assert res.status_code == 200
        assert res.json() == "http://microsoft.com/login"

def test_microsoft_callback_new_user_new_company(client: TestClient, db: Session):
    # Mock SSO User
    mock_user = AsyncMock()
    mock_user.email = "newadmin@newcorp.com"
    mock_user.id = "ms_123"
    
    with patch("app.api.v1.sso.sso.verify_and_process", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_user
        
        # Call callback
        res = client.get("/auth/microsoft/callback", follow_redirects=False)
        
        # Verify Redirect
        assert res.status_code == 307 # Temporary Redirect
        assert "token=" in res.headers["location"]
        
        # Verify DB
        user = db.query(User).filter(User.email == "newadmin@newcorp.com").first()
        assert user is not None
        assert user.role == UserRole.ADMIN
        assert user.company.domain == "newcorp.com"
        assert user.sso_provider == "microsoft"

def test_microsoft_callback_new_user_existing_company(client: TestClient, db: Session):
    # Create Company
    company = Company(name="Existing Corp", domain="existing.com")
    db.add(company)
    db.commit()
    
    # Mock SSO User
    mock_user = AsyncMock()
    mock_user.email = "recruiter@existing.com"
    mock_user.id = "ms_456"
    
    with patch("app.api.v1.sso.sso.verify_and_process", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_user
        
        res = client.get("/auth/microsoft/callback", follow_redirects=False)
        
        assert res.status_code == 307
        
        user = db.query(User).filter(User.email == "recruiter@existing.com").first()
        assert user is not None
        assert user.role == UserRole.RECRUITER
        assert user.company_id == company.id

def test_microsoft_callback_existing_user(client: TestClient, db: Session):
    # Create User
    company = Company(name="Test Corp", domain="test.com")
    db.add(company)
    db.commit()
    
    user = User(email="user@test.com", hashed_password="hash", company_id=company.id, role=UserRole.RECRUITER)
    db.add(user)
    db.commit()
    
    # Mock SSO User
    mock_user = AsyncMock()
    mock_user.email = "user@test.com"
    mock_user.id = "ms_789"
    
    with patch("app.api.v1.sso.sso.verify_and_process", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_user
        
        res = client.get("/auth/microsoft/callback", follow_redirects=False)
        
        assert res.status_code == 307
        
        db.refresh(user)
        assert user.sso_provider == "microsoft"
        assert user.sso_id == "ms_789"
        assert user.is_verified == True

def test_microsoft_callback_invalid_email(client: TestClient):
    mock_user = AsyncMock()
    mock_user.email = "invalid-email"
    
    with patch("app.api.v1.sso.sso.verify_and_process", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = mock_user
        
        res = client.get("/auth/microsoft/callback")
        assert res.status_code == 400
        assert "Invalid email" in res.json()["detail"]

def test_microsoft_callback_failure(client: TestClient):
    with patch("app.api.v1.sso.sso.verify_and_process", new_callable=AsyncMock) as mock_verify:
        mock_verify.side_effect = Exception("SSO Failed")
        
        res = client.get("/auth/microsoft/callback")
        assert res.status_code == 400
        assert "SSO Failed" in res.json()["detail"]

def test_microsoft_callback_no_user(client: TestClient):
    with patch("app.api.v1.sso.sso.verify_and_process", new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = None
        
        res = client.get("/auth/microsoft/callback")
        assert res.status_code == 400
        assert "Failed to login" in res.json()["detail"]
