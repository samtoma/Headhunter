from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.models import User, UserRole, Job, Application, CV, ParsedCV
from datetime import datetime, timedelta, timezone

from app.core.security import get_password_hash

def test_analytics_access_denied_for_interviewer(client: TestClient, db: Session):
    # Create Interviewer
    interviewer = User(email="interviewer@analytics.com", hashed_password=get_password_hash("password"), role=UserRole.INTERVIEWER, company_id=1, is_verified=True)
    db.add(interviewer)
    db.commit()
    
    # Login
    login_res = client.post("/auth/login", data={"username": "interviewer@analytics.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try access
    res = client.get("/analytics/dashboard", headers=headers)
    assert res.status_code == 403
    
    res = client.get("/analytics/export", headers=headers)
    assert res.status_code == 403



def test_analytics_dashboard_data(authenticated_client: TestClient, db: Session):
    # Setup Data
    # Job
    job = Job(title="Analytics Job", company_id=1, is_active=True)
    db.add(job)
    db.commit()
    
    # Applications
    # 1 New (Today)
    app1 = Application(job_id=job.id, cv_id=1, status="New", applied_at=datetime.now(timezone.utc))
    # 1 Hired (Yesterday)
    app2 = Application(job_id=job.id, cv_id=2, status="Hired", applied_at=datetime.now(timezone.utc) - timedelta(days=1))
    
    db.add_all([app1, app2])
    db.commit()
    
    # Fetch Dashboard
    res = authenticated_client.get("/analytics/dashboard")
    assert res.status_code == 200
    data = res.json()
    
    # Verify Pipeline
    pipeline = {item['name']: item['value'] for item in data['pipeline']}
    assert pipeline['New'] >= 1
    assert pipeline['Hired'] >= 1
    
    # Verify KPI
    assert data['kpi']['total_hires'] >= 1
    assert data['kpi']['active_jobs'] >= 1

def test_analytics_export_csv(authenticated_client: TestClient, db: Session):
    # Setup Data with Parsed CV
    cv = CV(filename="test.pdf", filepath="/tmp/test.pdf", company_id=1)
    db.add(cv)
    db.commit()
    
    parsed = ParsedCV(cv_id=cv.id, name="Export Candidate", email="export@test.com", skills='["Python"]')
    db.add(parsed)
    
    job = Job(title="Export Job", company_id=1)
    db.add(job)
    db.commit()
    
    app = Application(job_id=job.id, cv_id=cv.id, status="New")
    db.add(app)
    db.commit()
    
    # Export
    res = authenticated_client.get("/analytics/export")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    
    content = res.text
    assert "Candidate Name,Email" in content
    assert "Export Candidate,export@test.com" in content
