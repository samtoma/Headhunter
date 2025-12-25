from datetime import datetime, timedelta
from app.models.models import Application, CV
from unittest.mock import patch

def test_interview_lifecycle(authenticated_client, db):
    client = authenticated_client
    
    # Setup: Create Job, CV, Application
    # 1. Job
    res = client.post("/jobs/", json={
        "title": "Interview Job",
        "department": "Engineering",
        "description": "Desc",
        "skills_required": ["Talk"]
    })
    job_id = res.json()["id"]
    
    # 2. CV (Direct DB)
    cv = CV(filename="test.pdf", filepath="/tmp/test.pdf", company_id=1)
    db.add(cv)
    db.commit()
    db.refresh(cv)
    
    # 3. Application
    app = Application(cv_id=cv.id, job_id=job_id, status="New")
    db.add(app)
    db.commit()
    db.refresh(app)
    
    # --- Test Create Interview ---
    interview_data = {
        "application_id": app.id,
        "step": "Screening",
        "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat()
    }
    res = client.post("/interviews/", json=interview_data)
    assert res.status_code == 200
    interview_id = res.json()["id"]
    
    # --- Test Get My Interviews ---
    res = client.get("/interviews/my")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["id"] == interview_id
    
    # --- Test Get Application Interviews ---
    res = client.get(f"/interviews/application/{app.id}")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    
    # --- Test Update Interview ---
    update_data = {
        "outcome": "Passed",
        "feedback": "Good candidate",
        "rating": 5
    }
    res = client.patch(f"/interviews/{interview_id}", json=update_data)
    assert res.status_code == 200
    assert res.json()["outcome"] == "Passed"
    
    # --- Test Delete Interview ---
    res = client.delete(f"/interviews/{interview_id}")
    assert res.status_code == 200
    
    # Verify Deletion
    res = client.get(f"/interviews/application/{app.id}")
    assert len(res.json()) == 0

def test_interview_edge_cases(authenticated_client):
    client = authenticated_client
    
    # Invalid Application ID
    res = client.post("/interviews/", json={
        "application_id": 9999,
        "step": "Screening"
    })
    assert res.status_code == 404
    
    # Update Non-existent
    res = client.patch("/interviews/9999", json={"step": "Next"})
    assert res.status_code == 404
    
    # Delete Non-existent
    res = client.delete("/interviews/9999")
    assert res.status_code == 404


def test_interview_timeline_success(authenticated_client, db):
    """Test timeline endpoint returns correct data structure"""
    client = authenticated_client
    
    # Setup: Create job with multiple candidates and interviews
    # 1. Create Job
    res = client.post("/jobs/", json={
        "title": "Senior Developer",
        "department": "Engineering",
        "description": "Test job",
        "skills_required": ["Python"]
    })
    job_id = res.json()["id"]
    
    # 2. Create 2 CVs
    cv1 = CV(filename="candidate1.pdf", filepath="/tmp/c1.pdf", company_id=1)
    cv2 = CV(filename="candidate2.pdf", filepath="/tmp/c2.pdf", company_id=1)
    db.add_all([cv1, cv2])
    db.commit()
    db.refresh(cv1)
    db.refresh(cv2)
    
    # 3. Create Applications
    app1 = Application(cv_id=cv1.id, job_id=job_id, status="Interview")
    app2 = Application(cv_id=cv2.id, job_id=job_id, status="Screening")
    db.add_all([app1, app2])
    db.commit()
    db.refresh(app1)
    db.refresh(app2)
    
    # 4. Create Interviews for candidate 1 (multiple stages)
    client.post("/interviews/", json={
        "application_id": app1.id,
        "step": "Screening",
        "status": "Completed",
        "outcome": "Passed",
        "scheduled_at": (datetime.now() - timedelta(days=2)).isoformat()
    })
    
    client.post("/interviews/", json={
        "application_id": app1.id,
        "step": "Technical",
        "status": "Scheduled",
        "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat()
    })
    
    # 5. Create Interview for candidate 2 (one stage)
    client.post("/interviews/", json={
        "application_id": app2.id,
        "step": "Screening",
        "status": "Scheduled",
        "scheduled_at": (datetime.now() + timedelta(days=2)).isoformat()
    })
    
    # --- Test Timeline Endpoint ---
    res = client.get(f"/interviews/timeline/{job_id}")
    assert res.status_code == 200
    
    data = res.json()
    
    # Verify response structure
    assert "job_id" in data
    assert "job_title" in data
    assert "stages" in data
    assert "candidates" in data
    
    assert data["job_id"] == job_id
    assert data["job_title"] == "Senior Developer"
    assert isinstance(data["stages"], list)
    assert len(data["stages"]) >= 4  # Screening, Technical, Culture, Final, Offer
    
    # Verify candidates
    assert len(data["candidates"]) == 2
    
    # Find candidate 1 (should have 2 interviews)
    candidate1 = next(c for c in data["candidates"] if c["application_id"] == app1.id)
    assert len(candidate1["interviews"]) == 2
    assert candidate1["interviews"][0]["stage"] == "Screening"
    assert candidate1["interviews"][0]["status"] == "Completed"
    assert candidate1["interviews"][0]["outcome"] == "Passed"
    assert candidate1["interviews"][1]["stage"] == "Technical"
    assert candidate1["interviews"][1]["status"] == "Scheduled"
    
    # Find candidate 2 (should have 1 interview)
    candidate2 = next(c for c in data["candidates"] if c["application_id"] == app2.id)
    assert len(candidate2["interviews"]) == 1
    assert candidate2["interviews"][0]["stage"] == "Screening"


def test_interview_timeline_permissions(authenticated_client, db):
    """Test timeline endpoint enforces permission checks"""
    from app.models.models import User, UserRole
    from app.core.security import get_password_hash
    
    client = authenticated_client
    
    # Create a job
    res = client.post("/jobs/", json={
        "title": "Test Job",
        "department": "Engineering",
        "description": "Test",
        "skills_required": ["Test"]
    })
    job_id = res.json()["id"]
    
    # Test: Create an interviewer user (should be denied)
    interviewer = User(
        email="interviewer@test.com",
        hashed_password=get_password_hash("test123"),
        role=UserRole.INTERVIEWER,
        company_id=1,
        is_verified=True
    )
    db.add(interviewer)
    db.commit()
    
    # Login as interviewer
    from fastapi.testclient import TestClient
    from app.main import app
    interviewer_client = TestClient(app)
    
    login_res = interviewer_client.post("/auth/login", data={
        "username": "interviewer@test.com",
        "password": "test123"
    })
    token = login_res.json()["access_token"]
    interviewer_client.headers = {"Authorization": f"Bearer {token}"}
    
    # Should be denied
    res = interviewer_client.get(f"/interviews/timeline/{job_id}")
    assert res.status_code == 403
    assert "Interviewers cannot access timeline view" in res.json()["detail"]


def test_interview_timeline_not_found(authenticated_client):
    """Test timeline endpoint with non-existent job"""
    client = authenticated_client
    
    res = client.get("/interviews/timeline/99999")
    assert res.status_code == 404
    assert "Job not found" in res.json()["detail"]


def test_interview_timeline_empty_job(authenticated_client, db):
    """Test timeline endpoint with job that has no applications"""
    client = authenticated_client
    
    # Create job with no applications
    res = client.post("/jobs/", json={
        "title": "Empty Job",
        "department": "Engineering",
        "description": "No candidates yet",
        "skills_required": ["Python"]
    })
    job_id = res.json()["id"]
    
    # Should return empty candidates list
    res = client.get(f"/interviews/timeline/{job_id}")
    assert res.status_code == 200
    
    data = res.json()
    assert data["job_id"] == job_id
    assert len(data["candidates"]) == 0
    assert len(data["stages"]) >= 4  # Still has predefined stages


def test_interview_notifications(authenticated_client, db):
    """Test interview notification flags"""
    client = authenticated_client
    
    # Setup: Create Job and Application
    res = client.post("/jobs/", json={
        "title": "Notification Job", 
        "department": "IT", 
        "description": "Desc", 
        "skills_required": ["X"]
    })
    job_id = res.json()["id"]
    
    cv = CV(filename="notif.pdf", filepath="/tmp/notif.pdf", company_id=1)
    db.add(cv)
    db.commit()
    
    app = Application(cv_id=cv.id, job_id=job_id, status="New")
    db.add(app)
    db.commit()
    db.refresh(app)
    
    # We need to mock the send_interview_notification function or the background tasks
    # However, since we can't easily assert on background tasks without broader mocking,
    # we'll assume the API accepts the flag correctly.
    # ideally we mock 'app.api.v1.interviews.send_interview_notification'
    
    with patch("app.api.v1.interviews.send_interview_notification") as mock_email:
        # Case 1: Notifications Disabled explicitly
        res = client.post("/interviews/", json={
            "application_id": app.id,
            "step": "Screening",
            "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat(),
            "send_notifications": False
        })
        assert res.status_code == 200
        mock_email.assert_not_called()
        
        # Case 2: Notifications Enabled explicitly
        res = client.post("/interviews/", json={
            "application_id": app.id,
            "step": "Technical",
            "scheduled_at": (datetime.now() + timedelta(days=2)).isoformat(),
            "send_notifications": True
        })
        assert res.status_code == 200
        # Since we are mocking a background task or direct call? 
        # In interviews.py: it calls `send_interview_notification(..., await=False)` or adds to background tasks? 
        # The code viewed in interviews.py showed: 
        # fm = FastMail(conf); await fm.send_message(message)
        # But wait, looking at `create_interview` code: it has `queue email in background`. 
        # Let's check `create_interview` implementation again. 
        # Ah, in `interviews.py`: 
        # `background_tasks.add_task(send_interview_notification, ...)` or similar?
        # Actually I saw: `await send_interview_notification(...)`?
        
        # Let's verify what I saw in `interviews.py` previously.
        # "Queue email in background (silently skip if SMTP not configured for tests)"
        # It seemed to call it directly in the try/except block if it was async.
        # IF it's async and called with `await`, `mock_email` should see it.
        # If it's `background_tasks.add_task`, we verify add_task.
        # Looking at previous file view of `interviews.py`: 
        # It had `async def create_interview`? Yes.
        # It had `await send_interview_notification(...)`?
        # Let's assume direct await or we will fail and I will fix.
        
        assert mock_email.called
