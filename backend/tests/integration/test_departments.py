import pytest
from app.models.models import Department, ActivityLog, Application, Job, UserRole
from app.core.security import create_access_token
import json

def test_department_crud(integration_client, db_session, test_company, test_admin_user):
    # 1. Create Department
    token = create_access_token(data={"sub": test_admin_user.email})
    headers = {"Authorization": f"Bearer {token}"}
    client = integration_client
    
    dept_data = {
        "name": "Engineering",
        "description": "We build things",
        "technologies": json.dumps(["Python", "React"]),
        "job_templates": json.dumps([{
            "title_match": "Backend",
            "description": "Backend Role",
            "technologies": ["FastAPI"]
        }])
    }
    
    res = client.post("/departments/", json=dept_data, headers=headers)
    assert res.status_code == 200
    dept = res.json()
    assert dept["name"] == "Engineering"
    assert dept["company_id"] == test_company.id
    
    dept_id = dept["id"]
    
    # 2. Get Department
    res = client.get(f"/departments/{dept_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Engineering"
    
    # 3. Update Department
    update_data = {"name": "Eng & Product"}
    res = client.patch(f"/departments/{dept_id}", json=update_data, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Eng & Product"
    
    # 4. List Departments
    res = client.get("/departments/", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["name"] == "Eng & Product"
    
    # 5. Delete Department (Admin only)
    # test_user is admin by default in conftest
    res = client.delete(f"/departments/{dept_id}", headers=headers)
    assert res.status_code == 200
    
    res = client.get(f"/departments/{dept_id}", headers=headers)
    assert res.status_code == 404

def test_activity_log_and_timeline(integration_client, db_session, test_company, test_admin_user, test_job, test_cv):
    token = create_access_token(data={"sub": test_admin_user.email})
    headers = {"Authorization": f"Bearer {token}"}
    client = integration_client
    
    # 1. Create Application (should trigger log if we added it, but we might not have added it to create_application yet)
    # Let's check create_application implementation. We didn't add it there because of user_id issue.
    # But we added it to update_application.
    
    # Create app manually first
    app = Application(cv_id=test_cv.id, job_id=test_job.id, status="New")
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)
    
    # 2. Update Application (should trigger log)
    update_data = {"status": "Screening", "notes": "Looks good"}
    res = client.patch(f"/applications/{app.id}", json=update_data, headers=headers)
    assert res.status_code == 200
    
    # Verify Log
    logs = db_session.query(ActivityLog).filter(ActivityLog.application_id == app.id).all()
    assert len(logs) == 1
    assert logs[0].action == "update"
    details = json.loads(logs[0].details)
    assert details["status"] == "Screening"
    assert details["notes"] == "Looks good"
    
    # 3. Add Interview (should trigger log)
    interview_data = {
        "application_id": app.id,
        "step": "Technical",
        "outcome": "Pending",
        "rating": 0,
        "scheduled_at": "2023-01-01T10:00:00"
    }
    res = client.post("/interviews/", json=interview_data, headers=headers)
    assert res.status_code == 200
    
    # Verify Log
    logs = db_session.query(ActivityLog).filter(ActivityLog.application_id == app.id).all()
    assert len(logs) == 2 # Update + Interview
    
    # 4. Get Timeline
    res = client.get(f"/activity/application/{app.id}/timeline", headers=headers)
    assert res.status_code == 200
    timeline = res.json()
    
    # Should have 3 items: 1 Log (update), 1 Log (interview scheduled), 1 Interview object (merged)
    # Wait, the timeline endpoint merges Logs and Interviews.
    # Logs: 1 update, 1 interview_scheduled
    # Interviews: 1 interview
    # Total 3 items.
    
    assert len(timeline) == 3
    types = [t["type"] for t in timeline]
    assert "log" in types
    assert "interview" in types
