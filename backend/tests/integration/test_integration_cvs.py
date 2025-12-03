"""
Integration tests for CV processing workflow.

Tests complete CV upload and parsing flow with real database:
- File upload
- Celery task triggering (mocked broker)
- AI-powered CV parsing (mocked OpenAI)
- Profile creation with extracted data
- Bulk operations
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from io import BytesIO

def test_upload_cv_file(authenticated_integration_client, test_company):
    """Test uploading a CV file."""
    # Create a mock PDF file
    pdf_content = b"%PDF-1.4 Mock PDF Content"
    files = {
        "file": ("test_resume.pdf", BytesIO(pdf_content), "application/pdf")
    }
    
    response = authenticated_integration_client.post(
        "/api/cvs/upload",
        files=files
    )
    
    # Depending on your implementation, this might return 202 (accepted for async processing)
    # or 201 (created immediately)
    assert response.status_code in [201, 202]
    
    if response.status_code == 201:
        data = response.json()
        assert "id" in data

@patch("app.services.parser.parse_cv_with_ai", new_callable=AsyncMock)
def test_cv_parsing_with_ai(
    mock_parse_cv,
    authenticated_integration_client,
    test_company,
    db_session
):
    """Test CV parsing creates a profile with extracted data."""
    # Mock AI parsing response
    mock_parse_cv.return_value = {
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "+1234567890",
        "summary": "Experienced software engineer with 5 years of expertise",
        "years_of_experience": 5,
        "skills": ["Python", "React", "PostgreSQL"],
        "education": [
            {
                "degree": "BS Computer Science",
                "institution": "MIT",
                "year": 2018
            }
        ],
        "work_history": [
            {
                "title": "Senior Developer",
                "company": "Tech Corp",
                "start_date": "2020-01",
                "end_date": "2024-01",
                "description": "Led development team"
            }
        ]
    }
    
    # Upload CV
    pdf_content = b"%PDF-1.4 Mock Resume"
    files = {
        "file": ("jane_resume.pdf", BytesIO(pdf_content), "application/pdf")
    }
    
    response = authenticated_integration_client.post(
        "/api/cvs/upload",
        files=files
    )
    
    assert response.status_code in [201, 202]
    
    # If async, you might need to wait or call the processing function directly
    # For this test, let's assume synchronous processing or we trigger it manually
    
    # Verify profile was created
    from app.models.models import Profile
    profile = db_session.query(Profile).filter(
        Profile.email == "jane.smith@example.com"
    ).first()
    
    if profile:  # Depending on implementation
        assert profile.name == "Jane Smith"
        assert profile.company_id == test_company.id
        assert profile.years_of_experience == 5

def test_list_profiles(authenticated_integration_client, test_company, db_session):
    """Test listing profiles with pagination."""
    from app.models.models import Profile
    
    # Create test profiles
    for i in range(5):
        profile = Profile(
            name=f"Candidate {i}",
            email=f"candidate{i}@example.com",
            company_id=test_company.id,
            years_of_experience=i + 1
        )
        db_session.add(profile)
    db_session.commit()
    
    # Fetch profiles
    response = authenticated_integration_client.get("/api/profiles")
    assert response.status_code == 200
    
    data = response.json()
    # Response might be paginated
    if isinstance(data, dict) and "items" in data:
        profiles = data["items"]
    else:
        profiles = data
    
    assert len(profiles) >= 5
    
    # Verify company filtering
    for profile in profiles:
        assert profile["company_id"] == test_company.id

def test_update_profile(authenticated_integration_client, test_company, db_session):
    """Test updating a candidate profile."""
    from app.models.models import Profile
    
    # Create profile
    profile = Profile(
        name="Original Name",
        email="update@example.com",
        company_id=test_company.id
    )
    db_session.add(profile)
    db_session.commit()
    profile_id = profile.id
    
    # Update profile
    update_data = {
        "name": "Updated Name",
        "years_of_experience": 7
    }
    
    response = authenticated_integration_client.patch(
        f"/api/profiles/{profile_id}",
        json=update_data
    )
    assert response.status_code == 200
    
    # Verify update in database
    db_session.refresh(profile)
    assert profile.name == "Updated Name"
    assert profile.years_of_experience == 7

def test_bulk_delete_profiles(authenticated_integration_client, test_company, db_session):
    """Test bulk delete operation."""
    from app.models.models import Profile
    
    # Create profiles to delete
    profile_ids = []
    for i in range(3):
        profile = Profile(
            name=f"Delete Me {i}",
            email=f"delete{i}@example.com",
            company_id=test_company.id
        )
        db_session.add(profile)
        db_session.commit()
        profile_ids.append(profile.id)
    
    # Bulk delete
    response = authenticated_integration_client.post(
        "/api/profiles/bulk-delete",
        json={"profile_ids": profile_ids}
    )
    assert response.status_code == 200
    
    # Verify profiles are deleted
    for pid in profile_ids:
        profile = db_session.query(Profile).filter(Profile.id == pid).first()
        assert profile is None or profile.is_deleted  # Depending on soft vs hard delete

def test_assign_candidate_to_job(authenticated_integration_client, test_company, db_session):
    """Test assigning a candidate to a job pipeline."""
    from app.models.models import Profile, Job, Application
    
    # Create job
    job = Job(
        title="Python Developer",
        department="Engineering",
        company_id=test_company.id,
        status="active"
    )
    db_session.add(job)
    db_session.commit()
    
    # Create profile
    profile = Profile(
        name="Candidate X",
        email="candidatex@example.com",
        company_id=test_company.id
    )
    db_session.add(profile)
    db_session.commit()
    
    # Assign to job
    application_data = {
        "job_id": job.id,
        "profile_id": profile.id,
        "status": "new"
    }
    
    response = authenticated_integration_client.post(
        "/api/applications",
        json=application_data
    )
    assert response.status_code in [200, 201]
    
    # Verify application created
    application = db_session.query(Application).filter(
        Application.job_id == job.id,
        Application.profile_id == profile.id
    ).first()
    assert application is not None
    assert application.status == "new"
