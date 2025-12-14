
from app.models.models import User, UserStatus

def test_invite_user_as_admin(authenticated_client, db):
    """
    Test Admin inviting a new user.
    """
    invite_data = {
        "email": "invited_admin_test@headhunter.ai",
        "role": "recruiter",
        "department": "HR"
    }
    
    response = authenticated_client.post("/users/invite", json=invite_data)
    assert response.status_code == 200
    data = response.json()
    
    assert data["email"] == invite_data["email"]
    assert data["role"] == invite_data["role"]
    assert data["department"] == invite_data["department"]
    
    # Verify DB state
    user = db.query(User).filter(User.email == invite_data["email"]).first()
    assert user is not None
    assert user.status == UserStatus.PENDING
    assert user.feature_flags is None

    # Verify Invite Token created (simulated)
    # We can't easily check for token without querying DB directly for tokens
    from app.models.models import PasswordResetToken
    token = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
    assert token is not None

def test_invite_duplicate_user(authenticated_client):
    """
    Test inviting an existing email should fail.
    """
    # First invite
    invite_data = {
        "email": "duplicate_invite@headhunter.ai",
        "role": "recruiter"
    }
    authenticated_client.post("/users/invite", json=invite_data)
    
    # Second invite
    response = authenticated_client.post("/users/invite", json=invite_data)
    assert response.status_code == 400
    assert "exists" in response.json()["detail"]

def test_invite_permission_denied(client, db):
    """
    Test unauthenticated user cannot invite.
    """
    invite_data = {
        "email": "hacker_invite@headhunter.ai",
        "role": "admin"
    }
    response = client.post("/users/invite", json=invite_data)
    assert response.status_code == 401
