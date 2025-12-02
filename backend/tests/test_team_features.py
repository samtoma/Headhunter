import pytest
from app.models.models import UserRole

def test_team_features_lifecycle(authenticated_client):
    """
    Verifies the lifecycle of team management:
    1. Create a user with a department.
    2. Verify the user was created correctly.
    3. Update the user's role and department.
    4. Verify the updates.
    5. Delete the user.
    """
    # 1. Create User with Department
    new_email = "teammate_test@test.com"
    user_data = {
        "email": new_email,
        "password": "password123",
        "role": "interviewer",
        "department": "Engineering"
    }
    
    # Using authenticated_client (which is an Admin)
    res = authenticated_client.post("/users/", json=user_data)
    assert res.status_code == 200
    user = res.json()
    
    assert user["email"] == new_email
    assert user["department"] == "Engineering"
    assert user["role"] == "interviewer"
    
    user_id = user["id"]
    
    # 2. Update User Role and Department
    update_data = {
        "role": "recruiter",
        "department": "HR"
    }
    res = authenticated_client.patch(f"/users/{user_id}/role", json=update_data)
    assert res.status_code == 200
    updated_user = res.json()
    
    assert updated_user["role"] == "recruiter"
    assert updated_user["department"] == "HR"
    
    # 3. Verify Login Count (should be 0)
    assert updated_user.get("login_count", 0) == 0
    
    # 4. Delete User
    res = authenticated_client.delete(f"/users/{user_id}")
    assert res.status_code == 200
    
    # Verify deletion
    res = authenticated_client.get("/users/")
    users = res.json()
    assert not any(u["id"] == user_id for u in users)
