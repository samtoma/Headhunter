

def test_hiring_manager_lifecycle(authenticated_client, client):
    """
    Verifies Hiring Manager permissions:
    1. Admin creates a Hiring Manager.
    2. HM logs in.
    3. HM creates a job in their department (Success).
    4. HM tries to create a job in another department (Should be forced to own dept).
    5. HM lists jobs (Should only see own dept).
    6. HM lists users (Should only see own dept).
    """
    
    # 1. Admin creates Hiring Manager
    hm_email = "manager_test@test.com"
    hm_password = "password123"
    hm_dept = "Engineering"
    
    hm_data = {
        "email": hm_email,
        "password": hm_password,
        "role": "hiring_manager",
        "department": hm_dept,
        "is_verified": True
    }
    
    res = authenticated_client.post("/users/", json=hm_data)
    assert res.status_code == 200
    
    # 2. Login as Hiring Manager
    # We need a fresh client for the HM
    res = client.post("/auth/login", data={"username": hm_email, "password": hm_password})
    assert res.status_code == 200
    token = res.json()["access_token"]
    
    hm_client = client
    hm_client.headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Job in OWN department
    job_data_ok = {
        "title": "Engineering Manager",
        "department": "Engineering",
        "description": "Manage the team",
        "required_experience": 5,
        "skills_required": ["Management", "Python"]
    }
    res = hm_client.post("/jobs/", json=job_data_ok)
    assert res.status_code == 200
    job = res.json()
    assert job["department"] == "Engineering"
    
    # 4. Create Job in ANOTHER department (Should be forced to Engineering)
    job_data_bad = {
        "title": "Sales Lead",
        "department": "Sales",
        "description": "Sell stuff",
        "required_experience": 5,
        "skills_required": ["Sales"]
    }
    res = hm_client.post("/jobs/", json=job_data_bad)
    assert res.status_code == 200
    job_bad = res.json()
    assert job_bad["department"] == "Engineering" # Forced to own dept
    
    # 5. List Jobs
    res = hm_client.get("/jobs/")
    assert res.status_code == 200
    jobs = res.json()
    # Ensure all jobs are Engineering
    assert all(j["department"] == "Engineering" for j in jobs)
    
    # 6. List Users
    res = hm_client.get("/users/")
    assert res.status_code == 200
    users = res.json()
    # Ensure all users are Engineering (or have no department if that logic allows, but here we expect filtering)
    # Note: Admin created in conftest has no department, so HM might NOT see Admin if logic is strict.
    # Let's check logic: if current_user.role == HM and current_user.department: filter(User.department == current_user.department)
    # So HM should ONLY see users with department="Engineering".
    
    for u in users:
        assert u["department"] == "Engineering"
