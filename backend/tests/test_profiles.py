from datetime import datetime, timedelta, timezone
from app.models.models import CV, ParsedCV, Application, Job, User, UserRole, Interview

def test_profiles_lifecycle(authenticated_client, db):
    client = authenticated_client
    
    # Setup Data
    # 1. CV + Parsed Data
    cv = CV(filename="profile.pdf", filepath="/tmp/p.pdf", company_id=1, uploaded_at=datetime.now(timezone.utc))
    db.add(cv)
    db.commit()
    db.refresh(cv)
    
    parsed = ParsedCV(
        cv_id=cv.id, 
        name="John Doe", 
        skills="Python, React", 
        experience_years=5,
        last_job_title="Senior Dev",
        last_company="Tech Corp"
    )
    db.add(parsed)
    db.commit()
    
    # 2. Job
    job = Job(title="Dev Job", company_id=1)
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # 3. Application
    app = Application(cv_id=cv.id, job_id=job.id, status="New")
    db.add(app)
    db.commit()
    
    # --- Test Get All Profiles ---
    res = client.get("/profiles/")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert data["items"][0]["parsed_data"]["name"] == "John Doe"
    
    # --- Test Search ---
    res = client.get("/profiles/?search=Python")
    assert res.status_code == 200
    assert len(res.json()["items"]) >= 1
    
    res = client.get("/profiles/?search=Java")
    assert res.status_code == 200
    assert len(res.json()["items"]) == 0
    
    # --- Test Sorting ---
    client.get("/profiles/?sort_by=experience")
    client.get("/profiles/?sort_by=oldest")
    client.get("/profiles/?sort_by=name")
    
    # --- Test Get Single Profile ---
    res = client.get(f"/profiles/{cv.id}")
    assert res.status_code == 200
    assert res.json()["parsed_data"]["name"] == "John Doe"
    
    # --- Test Update Profile ---
    res = client.patch(f"/profiles/{cv.id}", json={"name": "Jane Doe", "skills": "Go"})
    assert res.status_code == 200
    assert res.json()["parsed_data"]["name"] == "Jane Doe"
    
    # --- Test Stats ---
    res = client.get("/profiles/stats/overview")
    assert res.status_code == 200
    assert res.json()["totalCandidates"] >= 1

def test_interviewer_restrictions(client, db):
    # Create Interviewer
    interviewer = User(email="int@test.com", hashed_password="pw", role=UserRole.INTERVIEWER, company_id=1)
    db.add(interviewer)
    db.commit()
    
    # Create CVs
    cv1 = CV(filename="assigned.pdf", filepath="p", company_id=1) # Assigned
    cv2 = CV(filename="unassigned.pdf", filepath="p", company_id=1) # Unassigned
    db.add(cv1)
    db.add(cv2)
    db.commit()
    
    # Assign cv1 to interviewer via application -> interview
    job = Job(title="J", company_id=1)
    db.add(job)
    db.commit()
    
    app1 = Application(cv_id=cv1.id, job_id=job.id)
    db.add(app1)
    db.commit()
    
    interview = Interview(application_id=app1.id, interviewer_id=interviewer.id, step="Screening")
    db.add(interview)
    db.commit()
    
    # Login as Interviewer
    from app.core.security import create_access_token
    token = create_access_token({"sub": "int@test.com"})
    client.headers = {"Authorization": f"Bearer {token}"}
    
    # 1. List Profiles (Should only see cv1)
    res = client.get("/profiles/")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == cv1.id
    
    # 2. Get Specific Profile
    res = client.get(f"/profiles/{cv1.id}")
    assert res.status_code == 200
    
    res = client.get(f"/profiles/{cv2.id}")
    assert res.status_code == 404
