def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["system"] == "Headhunter"

def test_create_and_list_job(client):
    # 1. Create a Job
    payload = {
        "title": "Software Engineer",
        "description": "Test Description",
        "skills_required": ["Python", "FastAPI"]
    }
    # CHANGED: Path is /jobs/, not /api/v1/jobs/
    response = client.post("/jobs/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Software Engineer"
    job_id = data["id"]

    # 2. List Jobs
    # CHANGED: Path is /jobs/, not /api/v1/jobs/
    response = client.get("/jobs/")
    assert response.status_code == 200
    jobs = response.json()
    assert any(j["id"] == job_id for j in jobs)