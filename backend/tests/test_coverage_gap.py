

def test_job_search_and_filters(authenticated_client, db):
    """Test job search and filtering logic in list_jobs"""
    # Create jobs with different statuses and departments
    client = authenticated_client
    
    # Job 1: Active, Engineering
    client.post("/jobs/", json={
        "title": "Python Dev",
        "department": "Engineering",
        "description": "Code python",
        "skills_required": ["Python"],
        "is_active": True
    })
    
    # Job 2: Inactive, Sales
    client.post("/jobs/", json={
        "title": "Sales Rep",
        "department": "Sales",
        "description": "Sell things",
        "skills_required": ["Sales"],
        "is_active": False
    })
    
    # Test Filter by Department
    res = client.get("/jobs/?department=Engineering")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert all(j["department"] == "Engineering" for j in data)
    
    # Test Filter by Status (Active)
    res = client.get("/jobs/?status=active")
    assert res.status_code == 200
    data = res.json()
    assert all(j["is_active"] is True for j in data)
    
    # Test Search
    res = client.get("/jobs/?q=Python")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert "Python" in data[0]["title"]

def test_application_lifecycle_full(authenticated_client, db):
    """Test full application lifecycle including edge cases"""
    client = authenticated_client
    
    # 1. Create Job
    res = client.post("/jobs/", json={
        "title": "App Test Job",
        "department": "HR",
        "description": "Test apps",
        "skills_required": ["Testing"]
    })
    job_id = res.json()["id"]
    
    # 2. Create CV (Mocking CV creation flow or direct DB insert)
    # For simplicity, we'll try to create an app with a random CV ID (might fail if FK constraint, but let's see)
    # Actually, we need a valid CV. Let's insert one directly via DB fixture if possible, or use the API if available.
    # Since we don't have a clean CV API test here, let's skip to what we can control.
    # We'll assume CV ID 1 exists or we can create it.
    
    # Let's try to create a dummy CV directly in DB
    from app.models.models import CV
    cv = CV(filename="test.pdf", filepath="/tmp/test.pdf", company_id=1)
    db.add(cv)
    db.commit()
    db.refresh(cv)
    
    # 3. Create Application
    app_data = {"cv_id": cv.id, "job_id": job_id}
    res = client.post("/applications/", json=app_data)
    assert res.status_code == 200
    app_id = res.json()["id"]
    
    # 4. Duplicate Application (Should return existing)
    res = client.post("/applications/", json=app_data)
    assert res.status_code == 200
    assert res.json()["id"] == app_id
    
    # 5. Update Application
    update_data = {"status": "Interviewing", "rating": 5, "notes": "Good candidate"}
    res = client.patch(f"/applications/{app_id}", json=update_data)
    assert res.status_code == 200
    assert res.json()["status"] == "Interviewing"
    
    # 6. Delete Application
    res = client.delete(f"/applications/{app_id}")
    assert res.status_code == 200
    
    # 7. Delete Non-existent
    res = client.delete(f"/applications/{app_id}")
    assert res.status_code == 404

def test_user_stats_and_edge_cases(authenticated_client):
    """Test user stats endpoint and role update edge cases"""
    client = authenticated_client
    
    # Get Stats
    res = client.get("/users/stats")
    assert res.status_code == 200
    stats = res.json()
    assert "total" in stats
    assert "roles" in stats
    assert "hiring_manager" in stats["roles"]
    
    # Create User for Edge Cases
    res = client.post("/users/", json={
        "email": "edge@test.com",
        "password": "pass",
        "role": "interviewer",
        "department": "Ops"
    })
    user_id = res.json()["id"]
    
    # Update with Partial Data
    res = client.patch(f"/users/{user_id}/role", json={"department": "New Ops"})
    assert res.status_code == 200
    assert res.json()["department"] == "New Ops"
