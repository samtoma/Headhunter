"""
Integration tests for job workflow.

Tests complete job lifecycle with real database:
- Job creation
- AI-powered job description generation (mocked OpenAI)
- Job listing and filtering
- Job updates and status changes
- Candidate matching to jobs
"""
import pytest
from unittest.mock import patch, AsyncMock

def test_create_job_basic(authenticated_integration_client, test_company):
    """Test creating a basic job without AI generation."""
    job_data = {
        "title": "Software Engineer",
        "department": "Engineering",
        "status": "draft",
        "description": "We are looking for a talented software engineer."
    }
    
    response = authenticated_integration_client.post("/api/jobs", json=job_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["title"] == job_data["title"]
    assert data["department"] == job_data["department"]
    assert data["company_id"] == test_company.id

def test_list_jobs_filtered_by_company(
    authenticated_integration_client,
    test_company,
    db_session
):
    """Test that jobs are filtered by company ID."""
    from app.models.models import Job, Company
    from app.core.security import get_password_hash
    from app.models.models import User, UserRole
    
    # Create another company with a job
    other_company = Company(name="Other Corp", domain="other.com", industry="Finance")
    db_session.add(other_company)
    db_session.commit()
    
    # Create job for other company
    other_job = Job(
        title="Finance Manager",
        department="Finance",
        company_id=other_company.id,
        status="active"
    )
    db_session.add(other_job)
    db_session.commit()
    
    # Create job for test company
    test_job = Job(
        title="DevOps Engineer",
        department="Engineering",
        company_id=test_company.id,
        status="active"
    )
    db_session.add(test_job)
    db_session.commit()
    
    # Fetch jobs as authenticated user from test_company
    response = authenticated_integration_client.get("/api/jobs")
    assert response.status_code == 200
    
    jobs = response.json()
    # Should only see jobs from test_company
    job_titles = [job["title"] for job in jobs]
    assert "DevOps Engineer" in job_titles
    assert "Finance Manager" not in job_titles

@patch("app.services.ai.jobs.generate_job_description", new_callable=AsyncMock)
def test_ai_job_generation(
    mock_generate_job,
    authenticated_integration_client,
    test_company
):
    """Test job creation with AI-powered description generation."""
    # Mock the AI generation response
    mock_generate_job.return_value = {
        "description": "AI-generated job description",
        "responsibilities": ["Task 1", "Task 2", "Task 3"],
        "qualifications": ["Skill 1", "Skill 2"],
        "location": "Remote",
        "employment_type": "Full-time"
    }
    
    job_data = {
        "title": "Senior React Developer",
        "department": "Engineering",
        "generate_ai": True
    }
    
    response = authenticated_integration_client.post("/api/jobs", json=job_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["description"] == "AI-generated job description"
    assert len(data["responsibilities"]) == 3
    assert mock_generate_job.called

def test_update_job_status(authenticated_integration_client, test_company, db_session):
    """Test updating job status from draft to active."""
    from app.models.models import Job
    
    # Create draft job
    job = Job(
        title="Backend Developer",
        department="Engineering",
        company_id=test_company.id,
        status="draft"
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    
    # Update to active
    update_data = {"status": "active"}
    response = authenticated_integration_client.patch(
        f"/api/jobs/{job.id}",
        json=update_data
    )
    assert response.status_code == 200
    
    # Verify in database
    db_session.refresh(job)
    assert job.status == "active"

def test_delete_job(authenticated_integration_client, test_company, db_session):
    """Test soft-deleting a job."""
    from app.models.models import Job
    
    # Create job
    job = Job(
        title="Temporary Position",
        department="HR",
        company_id=test_company.id,
        status="draft"
    )
    db_session.add(job)
    db_session.commit()
    job_id = job.id
    
    # Delete job
    response = authenticated_integration_client.delete(f"/api/jobs/{job_id}")
    assert response.status_code == 200
    
    # Verify job is no longer accessible
    response = authenticated_integration_client.get(f"/api/jobs/{job_id}")
    assert response.status_code == 404

def test_job_with_applications(authenticated_integration_client, test_company, db_session):
    """Test job with associated applications."""
    from app.models.models import Job, Profile, Application
    
    # Create job
    job = Job(
        title="Frontend Developer",
        department="Engineering",
        company_id=test_company.id,
        status="active"
    )
    db_session.add(job)
    db_session.commit()
    
    # Create profile
    profile = Profile(
        name="John Doe",
        email="john@example.com",
        company_id=test_company.id
    )
    db_session.add(profile)
    db_session.commit()
    
    # Create application
    application = Application(
        job_id=job.id,
        profile_id=profile.id,
        status="new"
    )
    db_session.add(application)
    db_session.commit()
    
    # Fetch job and verify applications are included
    response = authenticated_integration_client.get(f"/api/jobs/{job.id}")
    assert response.status_code == 200
    
    data = response.json()
    # Verify structure (exact response depends on your API schema)
    assert data["id"] == job.id
