"""
Tests for Public API endpoints (landing page functionality).
"""
import pytest
from io import BytesIO
import json

from app.models.models import Job, CV, Application, ParsedCV


class TestPublicJobAPI:
    """Tests for public job endpoints."""

    def test_get_public_job_success(self, client, db, test_company):
        """Test fetching a public job by slug."""
        # Create a job with landing page enabled
        job = Job(
            title="Senior Developer",
            department="Engineering",
            description="Test job description",
            company_id=test_company.id,
            landing_page_enabled=True,
            landing_page_slug="senior-developer-abc123",
            is_active=True
        )
        db.add(job)
        db.commit()

        response = client.get(f"/public/jobs/{job.landing_page_slug}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Senior Developer"
        assert data["department"] == "Engineering"
        assert data["company_name"] == test_company.name

    def test_get_public_job_not_found(self, client):
        """Test 404 when job slug doesn't exist."""
        response = client.get("/public/jobs/nonexistent-slug")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_public_job_landing_page_disabled(self, client, db, test_company):
        """Test 404 when landing page is disabled."""
        job = Job(
            title="Hidden Job",
            company_id=test_company.id,
            landing_page_enabled=False,
            landing_page_slug="hidden-job-xyz",
            is_active=True
        )
        db.add(job)
        db.commit()

        response = client.get(f"/public/jobs/{job.landing_page_slug}")
        
        assert response.status_code == 404

    def test_get_public_job_inactive(self, client, db, test_company):
        """Test 404 when job is inactive."""
        job = Job(
            title="Inactive Job",
            company_id=test_company.id,
            landing_page_enabled=True,
            landing_page_slug="inactive-job-xyz",
            is_active=False
        )
        db.add(job)
        db.commit()

        response = client.get(f"/public/jobs/{job.landing_page_slug}")
        
        assert response.status_code == 404

    def test_apply_to_job_success(self, client, db, test_company):
        """Test successful job application via landing page."""
        # Create a job
        job = Job(
            title="Test Position",
            company_id=test_company.id,
            landing_page_enabled=True,
            landing_page_slug="test-position-apply",
            is_active=True
        )
        db.add(job)
        db.commit()

        # Create a mock PDF file
        pdf_content = b"%PDF-1.4 mock pdf content"
        files = {
            "cv_file": ("resume.pdf", BytesIO(pdf_content), "application/pdf")
        }
        data = {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890",
            "utm_source": "linkedin",
            "utm_campaign": "winter_hiring"
        }

        response = client.post(
            f"/public/jobs/{job.landing_page_slug}/apply",
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["application_id"] is not None

        # Verify application was created
        application = db.query(Application).filter(
            Application.job_id == job.id
        ).first()
        assert application is not None
        assert application.source == "landing_page"
        
        # Verify tracking data
        tracking = json.loads(application.tracking_data)
        assert tracking["utm_source"] == "linkedin"
        assert tracking["utm_campaign"] == "winter_hiring"

        # Verify CV was created
        cv = db.query(CV).filter(CV.id == application.cv_id).first()
        assert cv is not None
        assert cv.company_id == test_company.id

        # Verify ParsedCV was created with form data
        parsed = db.query(ParsedCV).filter(ParsedCV.cv_id == cv.id).first()
        assert parsed is not None
        assert parsed.name == "John Doe"
        assert parsed.email == "john.doe@example.com"
        assert parsed.phone == "+1234567890"

    def test_apply_to_job_invalid_file_type(self, client, db, test_company):
        """Test rejection of invalid file types."""
        job = Job(
            title="Test Position",
            company_id=test_company.id,
            landing_page_enabled=True,
            landing_page_slug="test-invalid-file",
            is_active=True
        )
        db.add(job)
        db.commit()

        # Try to upload an image instead of a document
        files = {
            "cv_file": ("photo.jpg", BytesIO(b"fake image content"), "image/jpeg")
        }
        data = {
            "name": "Jane Doe",
            "email": "jane@example.com"
        }

        response = client.post(
            f"/public/jobs/{job.landing_page_slug}/apply",
            files=files,
            data=data
        )
        
        assert response.status_code == 400
        assert "PDF" in response.json()["detail"] or "Word" in response.json()["detail"]

    def test_apply_to_job_not_found(self, client):
        """Test applying to nonexistent job returns 404."""
        files = {
            "cv_file": ("resume.pdf", BytesIO(b"%PDF-1.4 content"), "application/pdf")
        }
        data = {
            "name": "Test User",
            "email": "test@example.com"
        }

        response = client.post(
            "/public/jobs/nonexistent-job/apply",
            files=files,
            data=data
        )
        
        assert response.status_code == 404

    def test_apply_preserves_all_utm_params(self, client, db, test_company):
        """Test that all UTM parameters are captured."""
        job = Job(
            title="Marketing Role",
            company_id=test_company.id,
            landing_page_enabled=True,
            landing_page_slug="marketing-role-utm",
            is_active=True
        )
        db.add(job)
        db.commit()

        files = {
            "cv_file": ("cv.pdf", BytesIO(b"%PDF-1.4"), "application/pdf")
        }
        data = {
            "name": "UTM Test",
            "email": "utm@example.com",
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "spring_2025",
            "utm_term": "developer jobs",
            "utm_content": "banner_ad",
            "referrer": "https://google.com/search"
        }

        response = client.post(
            f"/public/jobs/{job.landing_page_slug}/apply",
            files=files,
            data=data
        )
        
        assert response.status_code == 200

        application = db.query(Application).filter(
            Application.job_id == job.id
        ).first()
        
        tracking = json.loads(application.tracking_data)
        assert tracking["utm_source"] == "google"
        assert tracking["utm_medium"] == "cpc"
        assert tracking["utm_campaign"] == "spring_2025"
        assert tracking["utm_term"] == "developer jobs"
        assert tracking["utm_content"] == "banner_ad"
        assert tracking["referrer"] == "https://google.com/search"
