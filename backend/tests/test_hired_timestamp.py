import pytest
from datetime import datetime, timedelta, timezone
from app.models.models import Job, Application, CV
from app.api.v1.analytics import get_dashboard_stats

from app.models.models import Job, Application, CV, User

def test_hired_timestamp_logic(authenticated_client, db):
    # Get the user created by authenticated_client fixture
    test_user = db.query(User).filter(User.email == "admin@test.com").first()
    
    # 1. Create Job and CV
    job = Job(title="Timestamp Test Job", company_id=test_user.company_id, is_active=True)
    cv = CV(filename="test.pdf", filepath="/tmp/test.pdf", company_id=test_user.company_id)
    db.add_all([job, cv])
    db.commit()
    
    # 2. Create Application (Applied 10 days ago)
    applied_at = datetime.now(timezone.utc) - timedelta(days=10)
    app = Application(job_id=job.id, cv_id=cv.id, status="New", applied_at=applied_at)
    db.add(app)
    db.commit()
    db.refresh(app)
    
    # 3. Update status to "Hired" via API
    res = authenticated_client.patch(f"/applications/{app.id}", json={"status": "Hired"})
    assert res.status_code == 200
    
    # 4. Verify hired_at is set
    db.refresh(app)
    assert app.hired_at is not None
    
    # Handle SQLite timezone naivety in tests
    hired_at = app.hired_at
    if hired_at.tzinfo is None:
        hired_at = hired_at.replace(tzinfo=timezone.utc)
        
    # Should be very recent
    assert (datetime.now(timezone.utc) - hired_at).total_seconds() < 10
    
    # 5. Verify Analytics (Time to Hire should be ~10 days)
    res = authenticated_client.get("/analytics/dashboard?days=30")
    assert res.status_code == 200
    data = res.json()
    
    # Check avg_time_to_hire
    # Since we have 1 hired app with ~10 days diff
    assert data["kpi"]["avg_time_to_hire"] == 10
