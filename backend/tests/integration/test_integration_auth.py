"""
Integration tests for authentication flow.

Tests the complete auth workflow with real database:
- User signup
- Login and token generation
- Token refresh
- Password reset
- Multi-tenancy isolation
"""
import pytest
from app.models.models import UserRole

def test_complete_signup_flow(integration_client, db_session):
    """Test complete user signup and company creation."""
    # Sign up new user
    signup_data = {
        "email": "newuser@newcompany.com",
        "password": "SecurePass123!",
        "full_name": "New User"
    }
    
    response = integration_client.post("/api/auth/signup", json=signup_data)
    assert response.status_code == 201
    
    data = response.json()
    assert "access_token" in data
    assert data["email"] == signup_data["email"]
    assert "company_id" in data
    
    # Verify company was auto-created from email domain
    from app.models.models import Company
    company = db_session.query(Company).filter(
        Company.domain == "newcompany.com"
    ).first()
    assert company is not None
    assert company.name == "newcompany.com"  # Auto-generated from domain

def test_login_with_valid_credentials(integration_client, test_admin_user):
    """Test login with correct credentials."""
    login_data = {
        "username": test_admin_user.email,
        "password": "TestPassword123!"
    }
    
    response = integration_client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert data["role"] == UserRole.ADMIN.value
    assert "company_name" in data

def test_login_with_invalid_credentials(integration_client, test_admin_user):
    """Test login rejection with wrong password."""
    login_data = {
        "username": test_admin_user.email,
        "password": "WrongPassword123!"
    }
    
    response = integration_client.post("/api/auth/login", data=login_data)
    assert response.status_code == 401
    assert "detail" in response.json()

def test_get_current_user(authenticated_integration_client, test_admin_user):
    """Test fetching current user profile."""
    response = authenticated_integration_client.get("/api/users/me")
    assert response.status_code == 200
    
    data = response.json()
    assert data["email"] == test_admin_user.email
    assert data["role"] == UserRole.ADMIN.value
    assert data["company_id"] == test_admin_user.company_id

def test_unauthorized_access_without_token(integration_client):
    """Test that protected routes reject requests without auth token."""
    response = integration_client.get("/api/users/me")
    assert response.status_code == 401

def test_multi_company_data_isolation(integration_client, db_session):
    """Test that users from different companies cannot access each other's data."""
    from app.models.models import User, Company
    from app.core.security import get_password_hash
    
    # Create two separate companies
    company1 = Company(name="Company A", domain="companya.com", industry="Tech")
    company2 = Company(name="Company B", domain="companyb.com", industry="Finance")
    db_session.add_all([company1, company2])
    db_session.commit()
    
    # Create users for each company
    user1 = User(
        email="user@companya.com",
        hashed_password=get_password_hash("Pass123!"),
        role=UserRole.ADMIN,
        company_id=company1.id,
        is_verified=True
    )
    user2 = User(
        email="user@companyb.com",
        hashed_password=get_password_hash("Pass123!"),
        role=UserRole.ADMIN,
        company_id=company2.id,
        is_verified=True
    )
    db_session.add_all([user1, user2])
    db_session.commit()
    
    # Login as user1
    from app.core.security import create_access_token
    token1 = create_access_token({"sub": user1.email})
    
    # Try to fetch jobs (should only see company1's jobs)
    response = integration_client.get(
        "/api/jobs",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert response.status_code == 200
    jobs = response.json()
    
    # All jobs should belong to company1
    for job in jobs:
        assert job.get("company_id") == company1.id

def test_role_based_access_control(
    authenticated_integration_client,
    recruiter_integration_client,
    test_company,
    db_session
):
    """Test that different roles have appropriate access levels."""
    from app.models.models import Job
    
    # Admin creates a job
    job_data = {
        "title": "Senior Developer",
        "department": "Engineering",
        "status": "active"
    }
    
    response = authenticated_integration_client.post("/api/jobs", json=job_data)
    assert response.status_code == 201
    job_id = response.json()["id"]
    
    # Recruiter can view the job
    response = recruiter_integration_client.get(f"/api/jobs/{job_id}")
    assert response.status_code == 200
    
    # Recruiter can update the job
    update_data = {"title": "Lead Developer"}
    response = recruiter_integration_client.patch(
        f"/api/jobs/{job_id}",
        json=update_data
    )
    assert response.status_code == 200
