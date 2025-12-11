"""
Database seeding script for E2E tests.

Populates the test database with realistic data for E2E testing:
- Companies
- Users with different roles
- Jobs in various states
- CVs with parsed data
- Applications and interviews

Usage:
    PYTHONPATH=/app python tests/seed_test_data.py
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import (
    Company, User, Job, CV, ParsedCV, Application, Interview,
    UserRole
)
from app.core.security import get_password_hash
import os
import json
import sys

# E2E test database URL - ONLY use for testing!
DATABASE_URL = os.getenv(
    "DATABASE_URL_TEST",
    os.getenv("DATABASE_URL", "postgresql://testuser:testpass@db-e2e:5432/headhunter_e2e_db")
)

def seed_database():
    """
    Seed the database with test data.
    
    ⚠️  WARNING: This script will DROP ALL TABLES and recreate them.
    Only run this on test databases, never on production!
    """
    
    # Safety check to prevent running on production database
    if "headhunter_db" in DATABASE_URL or "production" in DATABASE_URL.lower():
        print("❌ ERROR: Refusing to run on production/development database!")
        print(f"   Database URL contains 'headhunter_db' or 'production': {DATABASE_URL[:50]}...")
        print("   This script is ONLY for E2E test databases.")
        print("   Set DATABASE_URL_TEST environment variable to override.")
        sys.exit(1)
    
    print(f"🔧 Connecting to: {DATABASE_URL[:50]}...")
    
    # Allow auto-confirmation via environment variable (for CI/CD)
    auto_confirm = os.getenv("AUTO_CONFIRM", "false").lower() == "true"
    
    if auto_confirm:
        print("⚠️  AUTO_CONFIRM=true - Skipping confirmation prompt")
        print("⚠️  This will DROP ALL TABLES and recreate them.")
    else:
        response = input("⚠️  This will DROP ALL TABLES. Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            sys.exit(0)
    
    engine = create_engine(DATABASE_URL)
    
    # Create all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🌱 Seeding E2E test database...")
        
        # Create Companies
        company1 = Company(
            name="TechCorp",
            domain="techcorp.com",
            industry="Technology",
            tagline="Building the future",
            description="A leading technology company specializing in AI solutions",
            mission="Empower businesses with AI",
            headquarters="San Francisco, CA",
            company_size="100-500",
            founded_year=2010,
            departments="Engineering, Sales, HR"
        )
        
        company2 = Company(
            name="FinanceHub",
            domain="financehub.com",
            industry="Finance",
            tagline="Financial innovation",
            description="Modern fintech solutions",
            headquarters="New York, NY",
            company_size="50-100",
            founded_year=2015
        )
        
        session.add_all([company1, company2])
        session.commit()
        print(f"✅ Created companies: {company1.name}, {company2.name}")
        
        # Create Users for TechCorp
        admin = User(
            email="admin@techcorp.com",
            hashed_password=get_password_hash("Admin123!"),
            role=UserRole.ADMIN,
            company_id=company1.id,
            is_verified=True
        )
        
        recruiter = User(
            email="recruiter@techcorp.com",
            hashed_password=get_password_hash("Recruiter123!"),
            role=UserRole.RECRUITER,
            company_id=company1.id,
            is_verified=True,
            department="HR"
        )
        
        hiring_manager = User(
            email="hm@techcorp.com",
            hashed_password=get_password_hash("Manager123!"),
            role=UserRole.HIRING_MANAGER,
            company_id=company1.id,
            is_verified=True,
            department="Engineering"
        )
        
        interviewer = User(
            email="interviewer@techcorp.com",
            hashed_password=get_password_hash("Interview123!"),
            role=UserRole.INTERVIEWER,
            company_id=company1.id,
            is_verified=True,
            department="Engineering"
        )
        
        session.add_all([admin, recruiter, hiring_manager, interviewer])
        session.commit()
        print("✅ Created users: Admin, Recruiter, Hiring Manager, Interviewer")
        
        # Create Jobs
        job1 = Job(
            title="Senior Full-Stack Developer",
            department="Engineering",
            company_id=company1.id,
            status="active",
            description="We are looking for an experienced full-stack developer",
            responsibilities=json.dumps(["Build scalable applications", "Lead technical projects"]),
            qualifications=json.dumps(["5+ years experience", "React & Python expertise"]),
            location="Remote",
            employment_type="Full-time",
            salary_range="$120k-$180k"
        )
        
        job2 = Job(
            title="DevOps Engineer",
            department="Engineering",
            company_id=company1.id,
            status="active",
            description="Join our DevOps team",
            responsibilities=json.dumps(["Manage CI/CD pipelines", "Infrastructure as code"]),
            qualifications=json.dumps(["Docker & Kubernetes", "AWS experience"]),
            location="San Francisco, CA",
            employment_type="Full-time"
        )
        
        job3 = Job(
            title="Product Designer",
            department="Design",
            company_id=company1.id,
            status="draft",
            description="Creative product designer needed",
            location="Remote"
        )
        
        session.add_all([job1, job2, job3])
        session.commit()
        print(f"✅ Created jobs: {job1.title}, {job2.title}, {job3.title}")
        
        # Create CVs with ParsedCV data (candidates)
        cvs = []
        parsed_cvs_data = [
            {
                "name": "Alice Johnson",
                "email": "alice@example.com",
                "phone": "+1-555-0101",
                "summary": "Full-stack developer with 7 years of experience",
                "experience_years": 7,
                "skills": json.dumps(["React", "Python", "PostgreSQL", "AWS"]),
                "current_salary": "110000",
                "expected_salary": "140000",
                "last_job_title": "Senior Developer",
                "last_company": "TechStartup Inc"
            },
            {
                "name": "Bob Smith",
                "email": "bob@example.com",
                "phone": "+1-555-0102",
                "summary": "DevOps specialist focused on Kubernetes",
                "experience_years": 5,
                "skills": json.dumps(["Kubernetes", "Docker", "Terraform", "AWS"]),
                "current_salary": "100000",
                "expected_salary": "130000",
                "last_job_title": "DevOps Engineer",
                "last_company": "CloudCo"
            },
            {
                "name": "Carol Williams",
                "email": "carol@example.com",
                "phone": "+1-555-0103",
                "summary": "Senior software engineer with backend focus",
                "experience_years": 8,
                "skills": json.dumps(["Python", "Django", "PostgreSQL", "Redis"]),
                "current_salary": "120000",
                "expected_salary": "150000",
                "last_job_title": "Staff Engineer",
                "last_company": "BigTech Corp"
            },
            {
                "name": "David Brown",
                "email": "david@example.com",
                "summary": "Junior developer eager to learn",
                "experience_years": 2,
                "skills": json.dumps(["JavaScript", "React", "Node.js"]),
                "expected_salary": "80000",
                "last_job_title": "Junior Developer",
                "last_company": "Startup XYZ"
            },
        ]
        
        for i, data in enumerate(parsed_cvs_data):
            cv = CV(
                filename=f"resume_{i+1}.pdf",
                filepath=f"/app/data/raw/resume_{i+1}.pdf",
                is_parsed=True,
                company_id=company1.id
            )
            session.add(cv)
            session.flush()  # Get the cv.id
            
            parsed_cv = ParsedCV(
                cv_id=cv.id,
                name=data["name"],
                email=data["email"],
                phone=data.get("phone"),
                summary=data["summary"],
                experience_years=data["experience_years"],
                skills=data["skills"],
                current_salary=data.get("current_salary"),
                expected_salary=data.get("expected_salary"),
                last_job_title=data.get("last_job_title"),
                last_company=data.get("last_company")
            )
            session.add(parsed_cv)
            cvs.append(cv)
        
        session.commit()
        print(f"✅ Created {len(cvs)} CVs with parsed data")
        
        # Create Applications
        app1 = Application(
            job_id=job1.id,
            cv_id=cvs[0].id,  # Alice -> Senior Full-Stack
            status="Interview"
        )
        
        app2 = Application(
            job_id=job2.id,
            cv_id=cvs[1].id,  # Bob -> DevOps
            status="Screening"
        )
        
        app3 = Application(
            job_id=job1.id,
            cv_id=cvs[2].id,  # Carol -> Senior Full-Stack
            status="New"
        )
        
        app4 = Application(
            job_id=job1.id,
            cv_id=cvs[3].id,  # David -> Senior Full-Stack
            status="New"
        )
        
        session.add_all([app1, app2, app3, app4])
        session.commit()
        print("✅ Created 4 applications")
        
        # Create Interview for Alice
        interview1 = Interview(
            application_id=app1.id,
            interviewer_id=interviewer.id,
            step="Technical",
            outcome="Passed",
            feedback="Strong technical skills, excellent problem solving",
            rating=9
        )
        
        session.add(interview1)
        session.commit()
        print("✅ Created interview record")
        
        print("\n🎉 Database seeding completed successfully!")
        print("\n📊 Summary:")
        print("   - Companies: 2")
        print("   - Users: 4 (Admin, Recruiter, Hiring Manager, Interviewer)")
        print("   - Jobs: 3")
        print(f"   - CVs: {len(cvs)}")
        print("   - Applications: 4")
        print("   - Interviews: 1")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_database()
