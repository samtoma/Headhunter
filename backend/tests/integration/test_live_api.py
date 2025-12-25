import pytest
import httpx
import time
import os

# Base URL for the running application inside the container
# The app runs on port 8000 inside the container
BASE_URL = os.getenv("API_URL", "http://localhost:30001")

@pytest.fixture(scope="module")
def api_client():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        yield client

def test_health_check(api_client):
    """Verify health endpoint is active."""
    response = api_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_metrics_endpoint(api_client):
    """Verify metrics endpoint returns expected keys."""
    response = api_client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "db_pool_status" in data
    assert "total_jobs" in data

def test_full_recruitment_flow(api_client):
    """
    Verify the full recruitment flow via API:
    Register -> Login -> Create Job -> Upload CV -> Assign -> Update Status -> Verify -> Delete
    """
    # 1. Setup Unique User
    timestamp = int(time.time())
    email = f"pytest_e2e_{timestamp}@test-{timestamp}.com"
    password = "password123"
    
    # Register
    reg_response = api_client.post("/auth/signup", json={
        "email": email,
        "password": password,
        "full_name": "Pytest E2E",
        "company_name": f"Pytest Corp {timestamp}"
    })
    # 400 is acceptable if user exists (unlikely with timestamp)
    if reg_response.status_code != 200:
        assert reg_response.status_code == 400, f"Registration failed with {reg_response.status_code}: {reg_response.text}"
    
    # MANUAL VERIFICATION FOR E2E TEST
    # Since we are running inside the container, we can access the DB directly
    # NOTE: We cannot use app.core.database.SessionLocal because conftest.py overrides DATABASE_URL to SQLite
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.models import User
    
    # Connect directly to the live DB
    LIVE_DB_URL = "postgresql://user:password@db:5432/headhunter_db"
    live_engine = create_engine(LIVE_DB_URL)
    SessionLive = sessionmaker(bind=live_engine)
    
    db = SessionLive()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_verified = True
            db.commit()
    finally:
        db.close()

    # Login
    login_response = api_client.post("/auth/login", data={
        "username": email,
        "password": password
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Job
    job_data = {
        "title": "Integration Engineer",
        "department": "Engineering",
        "description": "Testing API flow",
        "skills_required": ["Python", "Pytest"]
    }
    job_response = api_client.post("/jobs/", json=job_data, headers=headers)
    assert job_response.status_code == 200
    job_id = job_response.json()["id"]
    
    # 3. Verify Caching (List Jobs)
    # First call - Cache Miss
    start_miss = time.time()
    api_client.get("/jobs/", headers=headers)
    duration_miss = time.time() - start_miss
    
    # Second call - Cache Hit
    start_hit = time.time()
    api_client.get("/jobs/", headers=headers)
    duration_hit = time.time() - start_hit
    
    # Log for info (assertions on timing can be flaky in CI, but good for manual verification)
    print(f"\nCache Miss: {duration_miss:.4f}s | Cache Hit: {duration_hit:.4f}s")
    
    # 4. Upload CV
    # Create dummy PDF content
    files = {'files': ('test_cv.pdf', b'%PDF-1.4 dummy content', 'application/pdf')}
    upload_response = api_client.post("/cv/upload_bulk", files=files, headers=headers)
    assert upload_response.status_code == 200
    cv_id = upload_response.json()["ids"][0]
    
    # 5. Assign to Job
    assign_response = api_client.post("/applications/", json={"cv_id": cv_id, "job_id": job_id}, headers=headers)
    assert assign_response.status_code == 200
    app_id = assign_response.json()["id"]
    
    # 6. Verify Initial Status
    profile_response = api_client.get(f"/profiles/{cv_id}", headers=headers)
    app = next(a for a in profile_response.json()["applications"] if a["job_id"] == job_id)
    assert app["status"] == "New"
    
    # 7. Update Status
    update_response = api_client.patch(f"/applications/{app_id}", json={"status": "Interview"}, headers=headers)
    assert update_response.status_code == 200
    
    # 8. Verify Updated Status
    profile_response_2 = api_client.get(f"/profiles/{cv_id}", headers=headers)
    app_updated = next(a for a in profile_response_2.json()["applications"] if a["job_id"] == job_id)
    assert app_updated["status"] == "Interview"
    
    # 9. Cleanup (Delete Job)
    delete_response = api_client.delete(f"/jobs/{job_id}", headers=headers)
    assert delete_response.status_code == 200

def test_bulk_assign_success(api_client):
    """
    Verify that /api/jobs/bulk_assign works correctly.
    """
    # Setup User
    timestamp = int(time.time())
    email = f"bulk_test_{timestamp}@test-{timestamp}.com"
    password = "password123"
    
    # Register & Login
    api_client.post("/auth/signup", json={"email": email, "password": password, "full_name": "Bulk Tester", "company_name": "Bulk Corp"})

    # MANUAL VERIFICATION
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.models import User
    
    # Connect directly to the live DB
    LIVE_DB_URL = "postgresql://user:password@db:5432/headhunter_db"
    live_engine = create_engine(LIVE_DB_URL)
    SessionLive = sessionmaker(bind=live_engine)

    db = SessionLive()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_verified = True
            db.commit()
    finally:
        db.close()

    login_res = api_client.post("/auth/login", data={"username": email, "password": password})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Job
    job_res = api_client.post("/jobs/", json={"title": "Bulk Job", "department": "Eng", "description": "Desc", "skills_required": []}, headers=headers)
    assert job_res.status_code == 200, f"Job creation failed: {job_res.text}"
    job_id = job_res.json()["id"]
    
    # Upload CV
    files = {'files': ('bulk_cv.pdf', b'%PDF-1.4 dummy', 'application/pdf')}
    cv_res = api_client.post("/cv/upload_bulk", files=files, headers=headers)
    cv_id = cv_res.json()["ids"][0]
    
    # Attempt Bulk Assign (Should succeed now)
    print("\nAttempting POST /jobs/bulk_assign...")
    res = api_client.post("/jobs/bulk_assign", json={"job_id": job_id, "cv_ids": [cv_id]}, headers=headers)
    
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
    assert res.json()["count"] == 1
    assert res.json()["status"] == "assigned"

