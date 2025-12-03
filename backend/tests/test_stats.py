from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.models import User, UserRole, Job, Application, ActivityLog
from datetime import datetime, timedelta
from app.core.security import get_password_hash

def test_get_department_stats(authenticated_client: TestClient, db: Session):
    # 1. Setup Data
    # Get current user company
    res = authenticated_client.get("/auth/me")
    company_id = res.json()["company_id"]

    # Create Jobs in different departments
    job_eng = Job(title="Dev", department="Engineering", company_id=company_id, is_active=True, status="Open")
    job_sales = Job(title="Sales Rep", department="Sales", company_id=company_id, is_active=True, status="Open")
    job_closed = Job(title="Old Job", department="Engineering", company_id=company_id, is_active=False, status="Closed")
    job_hold = Job(title="Future Job", department="HR", company_id=company_id, is_active=True, status="On Hold")
    
    db.add_all([job_eng, job_sales, job_closed, job_hold])
    db.commit()

    # Create Applications
    # Engineering: 1 Active Job, 2 Total Jobs
    # 1 Hired, 1 New
    app1 = Application(job_id=job_eng.id, cv_id=1, status="Hired")
    app2 = Application(job_id=job_eng.id, cv_id=2, status="New")
    
    db.add_all([app1, app2])
    db.commit()

    # 2. Call API
    res = authenticated_client.get("/stats/departments")
    assert res.status_code == 200
    data = res.json()
    
    # 3. Verify Engineering Stats
    eng_stats = next(d for d in data if d["department"] == "Engineering")
    assert eng_stats["total_jobs"] == 2
    assert eng_stats["active_jobs"] == 1
    assert eng_stats["total_candidates"] == 2
    assert eng_stats["hired_count"] == 1
    
    # 4. Verify Sales Stats
    sales_stats = next(d for d in data if d["department"] == "Sales")
    assert sales_stats["total_jobs"] == 1
    assert sales_stats["active_jobs"] == 1
    
    # 5. Verify HR Stats (On Hold)
    hr_stats = next(d for d in data if d["department"] == "HR")
    assert hr_stats["on_hold_jobs"] == 1

def test_department_stats_rbac(client: TestClient, db: Session):
    # Create Interviewer (Not allowed)
    interviewer = User(email="interviewer@stats.com", hashed_password=get_password_hash("pass"), role=UserRole.INTERVIEWER, company_id=1)
    db.add(interviewer)
    db.commit()
    
    # Login
    login_res = client.post("/auth/login", data={"username": "interviewer@stats.com", "password": "pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.get("/stats/departments", headers=headers)
    assert res.status_code == 403

def test_login_activity(client: TestClient, db: Session):
    # 1. Create Super Admin
    admin = User(email="super@stats.com", hashed_password=get_password_hash("pass"), role=UserRole.SUPER_ADMIN, company_id=1)
    db.add(admin)
    db.commit()
    
    # Login
    login_res = client.post("/auth/login", data={"username": "super@stats.com", "password": "pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Logs
    # Today: 2 logins
    # Yesterday: 1 login
    today = datetime.utcnow()
    yesterday = today - timedelta(days=1)
    
    log1 = ActivityLog(company_id=1, user_id=admin.id, action="login", created_at=today)
    log2 = ActivityLog(company_id=1, user_id=admin.id, action="login", created_at=today)
    log3 = ActivityLog(company_id=1, user_id=admin.id, action="login", created_at=yesterday)
    
    db.add_all([log1, log2, log3])
    db.commit()
    
    # 3. Call API
    res = client.get("/stats/login-activity/1", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    # 4. Verify Data
    today_str = today.strftime('%Y-%m-%d')
    yesterday_str = yesterday.strftime('%Y-%m-%d')
    
    today_stat = next(d for d in data if d["date"] == today_str)
    assert today_stat["logins"] >= 2 # >= because login itself creates a log
    
    yesterday_stat = next(d for d in data if d["date"] == yesterday_str)
    assert yesterday_stat["logins"] == 1

def test_login_activity_rbac(authenticated_client: TestClient):
    # Regular Admin (Not Super Admin) should be denied
    res = authenticated_client.get("/stats/login-activity/1")
    assert res.status_code == 403
