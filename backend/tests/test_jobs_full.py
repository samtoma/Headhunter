import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from app.models.models import UserRole, Job

def test_create_job(authenticated_client):
    """Test creating a job."""
    res = authenticated_client.post("/jobs/", json={
        "title": "New Job",
        "department": "Engineering",
        "location": "Remote",
        "employment_type": "Full-time",
        "description": "Desc",
        "skills_required": ["Python"],
        "responsibilities": ["Code"],
        "qualifications": ["Degree"],
        "preferred_qualifications": ["Masters"],
        "benefits": ["Health"]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "New Job"
    assert data["department"] == "Engineering"

def test_list_jobs(authenticated_client):
    """Test listing jobs."""
    # Create a job first
    authenticated_client.post("/jobs/", json={
        "title": "Job 1",
        "department": "Sales",
        "description": "Desc"
    })
    
    res = authenticated_client.get("/jobs/")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert any(j["title"] == "Job 1" for j in data)

def test_update_job(authenticated_client):
    """Test updating a job."""
    # Create
    create_res = authenticated_client.post("/jobs/", json={
        "title": "Old Title",
        "description": "Desc"
    })
    job_id = create_res.json()["id"]
    
    # Update
    res = authenticated_client.patch(f"/jobs/{job_id}", json={
        "title": "New Title"
    })
    assert res.status_code == 200
    assert res.json()["title"] == "New Title"

def test_delete_job(authenticated_client):
    """Test deleting a job."""
    # Create
    create_res = authenticated_client.post("/jobs/", json={
        "title": "To Delete",
        "description": "Desc"
    })
    job_id = create_res.json()["id"]
    
    # Delete
    res = authenticated_client.delete(f"/jobs/{job_id}")
    assert res.status_code == 200
    
    # Verify gone
    get_res = authenticated_client.get("/jobs/")
    assert not any(j["id"] == job_id for j in get_res.json())

def test_regenerate_job(authenticated_client):
    """Test regenerating job description."""
    # Create
    create_res = authenticated_client.post("/jobs/", json={
        "title": "Regen Job",
        "description": "Old Desc"
    })
    job_id = create_res.json()["id"]
    
    # Mock AI
    with patch("app.api.v1.jobs.generate_job_metadata", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"description": "New AI Desc"}
        
        res = authenticated_client.post(f"/jobs/{job_id}/regenerate", json={"fine_tuning": "Make it better"})
        assert res.status_code == 200
        assert res.json()["description"] == "New AI Desc"

def test_matches_endpoint(authenticated_client):
    """Test candidate matching endpoint."""
    # Mock search engine
    with patch("app.services.search.factory.get_search_engine") as mock_get_engine:
        mock_engine = AsyncMock()
        mock_get_engine.return_value = mock_engine
        
        # Mock vector search results
        mock_engine.search.return_value = [
            {"id": "1", "score": 0.9}
        ]
        
        # We need to ensure the candidate exists in DB for the fallback/join query
        # But for unit testing the endpoint logic, we can rely on mocks or just check response structure
        # Since we use an in-memory DB, we can't easily inject a CV with ID 1 unless we create it.
        # Let's just test the endpoint handles the request and calls the search engine.
        
        res = authenticated_client.post("/jobs/matches", json={
            "job_title": "Dev",
            "required_experience": 5,
            "skills_required": ["Python"]
        })
        
        assert res.status_code == 200
        mock_engine.search.assert_called_once()

def test_hiring_manager_restrictions(authenticated_client, db):
    """Test Hiring Manager role restrictions."""
    # Create HM user
    from app.models.models import User
    from app.core.security import get_password_hash
    
    hm_user = User(
        email="hm@test.com",
        hashed_password=get_password_hash("pass"),
        role=UserRole.HIRING_MANAGER,
        company_id=1,
        department="Engineering"
    )
    db.add(hm_user)
    db.commit()
    
    # Create token for HM
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": hm_user.email})
    client = authenticated_client
    client.headers["Authorization"] = f"Bearer {token}"
    
    # 1. Create Job (Allowed in Dept)
    res = client.post("/jobs/", json={
        "title": "Eng Job",
        "description": "Desc"
    })
    assert res.status_code == 200
    job_id = res.json()["id"]
    assert res.json()["department"] == "Engineering" # Auto-assigned
    
    # 2. Update Job (Allowed)
    res = client.patch(f"/jobs/{job_id}", json={"title": "Updated"})
    assert res.status_code == 200
    
    # 3. Create Job (Wrong Dept - should be overridden or error? Code says it overrides)
    # The code overrides the department, so we can't really fail here unless we check the logic.
    # Let's check Update restriction.
    
    # Create a job in another department (as Admin first)
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    admin_token = create_access_token(data={"sub": admin_user.email})
    client.headers["Authorization"] = f"Bearer {admin_token}"
    
    res = client.post("/jobs/", json={
        "title": "Sales Job",
        "department": "Sales",
        "description": "Desc"
    })
    sales_job_id = res.json()["id"]
    
    # Switch back to HM
    client.headers["Authorization"] = f"Bearer {token}"
    
    # Try to update Sales job
    res = client.patch(f"/jobs/{sales_job_id}", json={"title": "Hacked"})
    assert res.status_code == 403
