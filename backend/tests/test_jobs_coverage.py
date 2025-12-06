from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.models import User, UserRole, Job, Company, CV, ParsedCV, Application
from unittest.mock import AsyncMock, patch
from app.core.security import get_password_hash

def test_hiring_manager_rbac(client: TestClient, db: Session):
    # Setup: Hiring Manager in "Engineering"
    hm = User(email="hm@jobs.com", hashed_password=get_password_hash("pass"), role=UserRole.HIRING_MANAGER, company_id=1, department="Engineering", is_verified=True)
    db.add(hm)
    db.commit()
    
    login_res = client.post("/auth/login", data={"username": "hm@jobs.com", "password": "pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create Job (Success - Auto assigns department)
    res = client.post("/jobs/", json={"title": "Dev", "location": "Remote"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["department"] == "Engineering"
    job_id = res.json()["id"]
    
    # 2. Update Job (Success - Same department)
    res = client.patch(f"/jobs/{job_id}", json={"title": "Senior Dev"}, headers=headers)
    assert res.status_code == 200
    
    # 3. Create Job in another department (Should ignore input and use HM department, or fail if logic enforces it? Code says it overrides)
    # Code: job_dict['department'] = current_user.department
    res = client.post("/jobs/", json={"title": "Sales", "department": "Sales"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["department"] == "Engineering"
    
    # 4. Update Job in another department (Fail)
    # Create a Sales job (by Admin)
    admin = User(email="admin@jobs.com", hashed_password=get_password_hash("pass"), role=UserRole.ADMIN, company_id=1)
    db.add(admin)
    db.commit()
    
    sales_job = Job(title="Sales Rep", department="Sales", company_id=1)
    db.add(sales_job)
    db.commit()
    
    res = client.patch(f"/jobs/{sales_job.id}", json={"title": "Updated Sales"}, headers=headers)
    assert res.status_code == 403
    
    # 5. Delete Job in another department (Fail)
    res = client.delete(f"/jobs/{sales_job.id}", headers=headers)
    assert res.status_code == 403

def test_match_candidates_edge_cases(authenticated_client: TestClient, db: Session):
    # Setup Data
    res = authenticated_client.get("/auth/me")
    company_id = res.json()["company_id"]
    
    # Candidate with invalid JSON skills
    cv1 = CV(filename="bad_json.pdf", filepath="path", company_id=company_id)
    db.add(cv1)
    db.commit()
    parsed1 = ParsedCV(cv_id=cv1.id, name="Bad JSON", skills="invalid-json")
    db.add(parsed1)
    
    # Candidate Silver Medalist
    cv2 = CV(filename="silver.pdf", filepath="path", company_id=company_id)
    db.add(cv2)
    db.commit()
    parsed2 = ParsedCV(cv_id=cv2.id, name="Silver", skills='["Python"]', experience_years=5)
    db.add(parsed2)
    
    job = Job(title="Test Job", company_id=company_id)
    db.add(job)
    db.commit()
    
    app = Application(job_id=job.id, cv_id=cv2.id, status="Silver Medalist")
    db.add(app)
    db.commit()
    
    # Mock Search Engine to return empty results (trigger fallback)
    mock_engine = AsyncMock()
    mock_engine.search.return_value = []
    
    with patch("app.services.search.factory.get_search_engine", return_value=mock_engine):
        res = authenticated_client.post("/jobs/matches", json={
            "job_title": "Python Dev",
            "required_experience": 3,
            "skills_required": ["Python"]
        })
        assert res.status_code == 200
        matches = res.json()
        
        # Verify Silver Medalist logic
        silver = next(m for m in matches if m["name"] == "Silver")
        assert silver["status"] == "Silver Medalist"
        # Score check: 
        # Vector: 0 (fallback)
        # Keyword: 10 (Python)
        # Exp: 10 (5 >= 3)
        # Silver: 5
        # Total: 25
        assert silver["score"] == 25
        
        # Verify Bad JSON didn't crash
        bad = next((m for m in matches if m["name"] == "Bad JSON"), None)
        # It might be in matches with 0 score if fallback returns it
        if bad:
            assert bad["score"] == 0

def test_analyze_job_with_company_context(authenticated_client: TestClient, db: Session):
    # Ensure company has context
    res = authenticated_client.get("/auth/me")
    company_id = res.json()["company_id"]
    company = db.query(Company).filter(Company.id == company_id).first()
    company.mission = "To save the world"
    db.commit()
    
    with patch("app.api.v1.jobs.generate_job_metadata", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"description": "Generated"}
        
        res = authenticated_client.post("/jobs/analyze", json={"title": "Hero"})
        assert res.status_code == 200
        
        # Verify context passed
        call_args = mock_gen.call_args
        context = call_args.kwargs["company_context"]
        assert context["mission"] == "To save the world"
