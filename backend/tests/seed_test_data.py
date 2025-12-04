"""
Database seeding script for E2E tests.

Populates the test database with realistic data for E2E testing:
- Companies
- Users with different roles
- Jobs in various states
- Candidate profiles
- Applications and interviews

Usage:
    python backend/tests/seed_test_data.py
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import (
    Company, User, Job, Profile, Application, Interview,
    UserRole, InterviewStage, InterviewOutcome
)
from app.core.security import get_password_hash
import os

# E2E test database URL
DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://testuser:testpass@localhost:30012/headhunter_e2e_db"
)

def seed_database():
    """Seed the database with test data."""
    engine = create_engine(DATABASE_URL)
    
    # Create all tables
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
            founded_year=2010
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
            is_verified=True,
            full_name="Admin User"
        )
        
        recruiter = User(
            email="recruiter@techcorp.com",
            hashed_password=get_password_hash("Recruiter123!"),
            role=UserRole.RECRUITER,
            company_id=company1.id,
            is_verified=True,
            full_name="Sarah Recruiter",
            department="HR"
        )
        
        hiring_manager = User(
            email="hm@techcorp.com",
            hashed_password=get_password_hash("Manager123!"),
            role=UserRole.HIRING_MANAGER,
            company_id=company1.id,
            is_verified=True,
            full_name="Mike Manager",
            department="Engineering"
        )
        
        interviewer = User(
            email="interviewer@techcorp.com",
            hashed_password=get_password_hash("Interview123!"),
            role=UserRole.INTERVIEWER,
            company_id=company1.id,
            is_verified=True,
            full_name="Emma Interviewer",
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
            responsibilities=["Build scalable applications", "Lead technical projects"],
            qualifications=["5+ years experience", "React & Python expertise"],
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
            responsibilities=["Manage CI/CD pipelines", "Infrastructure as code"],
            qualifications=["Docker & Kubernetes", "AWS experience"],
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
        
        # Create Candidate Profiles
        profiles = [
            Profile(
                name="Alice Johnson",
                email="alice@example.com",
                phone="+1-555-0101",
                company_id=company1.id,
                summary="Full-stack developer with 7 years of experience",
                years_of_experience=7,
                skills=["React", "Python", "PostgreSQL", "AWS"],
                current_salary=110000,
                expected_salary=140000
            ),
            Profile(
                name="Bob Smith",
                email="bob@example.com",
                phone="+1-555-0102",
                company_id=company1.id,
                summary="DevOps specialist focused on Kubernetes",
                years_of_experience=5,
                skills=["Kubernetes", "Docker", "Terraform", "AWS"],
                current_salary=100000,
                expected_salary=130000
            ),
            Profile(
                name="Carol Williams",
                email="carol@example.com",
                phone="+1-555-0103",
                company_id=company1.id,
                summary="Senior software engineer with backend focus",
                years_of_experience=8,
                skills=["Python", "Django", "PostgreSQL", "Redis"],
                current_salary=120000,
                expected_salary=150000
            ),
            Profile(
                name="David Brown",
                email="david@example.com",
                company_id=company1.id,
                summary="Junior developer eager to learn",
                years_of_experience=2,
                skills=["JavaScript", "React", "Node.js"],
                expected_salary=80000
            ),
        ]
        
        session.add_all(profiles)
        session.commit()
        print(f"✅ Created {len(profiles)} candidate profiles")
        
        # Create Applications
        app1 = Application(
            job_id=job1.id,
            profile_id=profiles[0].id,  # Alice -> Senior Full-Stack
            status="interview"
        )
        
        app2 = Application(
            job_id=job2.id,
            profile_id=profiles[1].id,  # Bob -> DevOps
            status="screening"
        )
        
        app3 = Application(
            job_id=job1.id,
            profile_id=profiles[2].id,  # Carol -> Senior Full-Stack
            status="new"
        )
        
        app4 = Application(
            job_id=job1.id,
            profile_id=profiles[3].id,  # David -> Senior Full-Stack
            status="new"
        )
        
        session.add_all([app1, app2, app3, app4])
        session.commit()
        print(f"✅ Created {4} applications")
        
        # Create Interview for Alice
        interview1 = Interview(
            application_id=app1.id,
            interviewer_id=interviewer.id,
            stage=InterviewStage.TECHNICAL,
            outcome=InterviewOutcome.PASSED,
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
        print(f"   - Candidate Profiles: {len(profiles)}")
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
