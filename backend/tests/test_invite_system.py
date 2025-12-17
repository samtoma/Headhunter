"""
Tests for the user invitation system.
These tests mock the email sending to avoid SMTP connection issues in CI/CD.
"""
from unittest.mock import patch, AsyncMock
from app.models.models import User, UserStatus

@patch("app.core.email.send_team_invite_email", new_callable=AsyncMock)
def test_invite_user_as_admin(mock_email, authenticated_client, db):
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
    from app.models.models import PasswordResetToken
    token = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
    assert token is not None
    
    # Verify email was called
    mock_email.assert_called_once()

@patch("app.core.email.send_team_invite_email", new_callable=AsyncMock)
def test_invite_duplicate_user(mock_email, authenticated_client):
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

