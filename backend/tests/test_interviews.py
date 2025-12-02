from datetime import datetime, timedelta
from app.models.models import Application, Job, CV

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
