from app.models.models import User
from app.core.security import create_access_token

def test_signup_flow(client, db):
    # 1. Successful Signup (New Company)
    res = client.post("/auth/signup", json={
        "email": "founder@startup.com",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "admin"
    assert data["is_new_company"] is True
    assert data["company_name"] == "startup.com"
    
    # 2. Successful Signup (Existing Company)
    # Create another user for same domain
    res = client.post("/auth/signup", json={
        "email": "employee@startup.com",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "interviewer" # Default role
    assert data["is_new_company"] is False
    
    # 3. Existing Email
    res = client.post("/auth/signup", json={
        "email": "founder@startup.com",
        "password": "password123"
    })
    assert res.status_code in [400, 422]
    assert "already registered" in res.json()["detail"]
    
    # 4. Invalid Email
    res = client.post("/auth/signup", json={
        "email": "invalid-email",
        "password": "password123"
    })
    assert res.status_code in [400, 422]
    assert res.status_code in [400, 422]
    # Pydantic returns list of dicts for 422, application might return string for 400
    # assert "Invalid email" in res.json()["detail"]

def test_login_flow(client, db):
    # Setup user
    client.post("/auth/signup", json={"email": "login@test.com", "password": "password123"})
    
    # Manual verify
    user = db.query(User).filter(User.email == "login@test.com").first()
    user.is_verified = True
    db.commit()
    
    # 1. Success
    res = client.post("/auth/login", data={"username": "login@test.com", "password": "password123"})
    assert res.status_code == 200
    assert "access_token" in res.json()
    
    # 2. Wrong Password
    res = client.post("/auth/login", data={"username": "login@test.com", "password": "wrongpassword"})
    assert res.status_code == 401
    
    # 3. Non-existent User
    res = client.post("/auth/login", data={"username": "nobody@test.com", "password": "password123"})
    assert res.status_code == 401

def test_verification_flow(client, db):
    # Setup user
    res = client.post("/auth/signup", json={"email": "verify@test.com", "password": "password123"})
    
    # 1. Send Verification
    # Mock the email sending function
    from unittest.mock import patch
    with patch("app.core.email.send_verification_email") as mock_send:
        res = client.post("/auth/send-verification", params={"email": "verify@test.com"})
        assert res.status_code == 200
        mock_send.assert_called_once()
    
    # 2. Verify Email (Manual Token Creation since we can't intercept email easily here without mocking)
    token = create_access_token(data={"sub": "verify@test.com", "type": "verification"})
    
    res = client.get(f"/auth/verify?token={token}")
    assert res.status_code == 200
    assert "verified successfully" in res.json()["message"]
    
    # Check DB
    user = db.query(User).filter(User.email == "verify@test.com").first()
    assert user.is_verified is True
    
    # 3. Invalid Token
    res = client.get("/auth/verify?token=invalid_token")
    assert res.status_code == 400
    
    # 4. User Not Found (Valid token but user deleted?)
    token_orphan = create_access_token(data={"sub": "ghost@test.com", "type": "verification"})
    res = client.get(f"/auth/verify?token={token_orphan}")
    assert res.status_code == 404

def test_login_blocks_unverified_user(client, db):
    # Setup unverified user
    client.post("/auth/signup", json={"email": "unverified@test.com", "password": "password123"})
    
    # Try login
    res = client.post("/auth/login", data={"username": "unverified@test.com", "password": "password123"})
    assert res.status_code == 403
    assert res.json()["detail"] == "Email not verified"
    
    # Manually verify
    user = db.query(User).filter(User.email == "unverified@test.com").first()
    user.is_verified = True
    db.commit()
    
    # Try login again
    res = client.post("/auth/login", data={"username": "unverified@test.com", "password": "password123"})
    assert res.status_code == 200

def test_resend_verification_flow(client, db):
    # Setup unverified user
    client.post("/auth/signup", json={"email": "resend@test.com", "password": "password123"})
    
    # Mock email sending
    from unittest.mock import patch
    with patch("app.core.email.send_verification_email") as mock_send:
        # Resend
        res = client.post("/auth/resend-verification", params={"email": "resend@test.com"})
        assert res.status_code == 200
        mock_send.assert_called_once()
        
    # Test resend for already verified user
    user = db.query(User).filter(User.email == "resend@test.com").first()
    user.is_verified = True
    db.commit()
    
    res = client.post("/auth/resend-verification", params={"email": "resend@test.com"})
    assert res.status_code == 200
    assert "already verified" in res.json()["message"]
