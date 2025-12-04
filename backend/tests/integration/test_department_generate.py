"""
Tests for the AI-powered department profile generation feature.
Tests the /departments/generate endpoint and related functionality.
"""
from unittest.mock import patch


class TestDepartmentGenerate:
    """Tests for POST /departments/generate endpoint."""
    
    def test_generate_requires_authentication(self, integration_client):
        """Test that unauthenticated requests are rejected."""
        response = integration_client.post("/departments/generate", json={
            "name": "Engineering"
        })
        assert response.status_code == 401
    
    def test_generate_requires_name(self, integration_client, admin_auth_headers):
        """Test that name field is required."""
        response = integration_client.post(
            "/departments/generate", 
            json={},
            headers=admin_auth_headers
        )
        assert response.status_code == 422  # Validation error
    
    @patch("app.api.v1.departments.generate_department_profile")
    def test_generate_returns_ai_profile(self, mock_generate, integration_client, admin_auth_headers):
        """Test that endpoint returns AI-generated profile."""
        # Mock the AI response
        mock_generate.return_value = {
            "description": "The Engineering department builds and maintains our platform.",
            "technologies": ["Python", "React", "AWS"],
            "job_templates": [
                {
                    "title_match": "Backend",
                    "description": "Backend engineers focus on APIs and databases.",
                    "technologies": ["Python", "FastAPI", "PostgreSQL"]
                }
            ]
        }
        
        response = integration_client.post(
            "/departments/generate",
            json={"name": "Engineering"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "description" in data
        assert "technologies" in data
        assert "job_templates" in data
        assert len(data["technologies"]) > 0
        assert data["job_templates"][0]["title_match"] == "Backend"
    
    @patch("app.api.v1.departments.generate_department_profile")
    def test_generate_with_fine_tuning(self, mock_generate, integration_client, admin_auth_headers):
        """Test that fine-tuning instructions are passed to AI."""
        mock_generate.return_value = {
            "description": "A fintech engineering department.",
            "technologies": ["Python", "FastAPI"],
            "job_templates": []
        }
        
        response = integration_client.post(
            "/departments/generate",
            json={
                "name": "Engineering",
                "fine_tuning": "Focus on fintech and payment systems"
            },
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        # Verify fine_tuning was passed to the function
        mock_generate.assert_called_once()
        call_args = mock_generate.call_args
        assert call_args.kwargs.get("fine_tuning") == "Focus on fintech and payment systems"
    
    @patch("app.api.v1.departments.generate_department_profile")
    def test_generate_handles_ai_failure(self, mock_generate, integration_client, admin_auth_headers):
        """Test that AI failures return appropriate error."""
        mock_generate.return_value = {}  # Empty response indicates failure
        
        response = integration_client.post(
            "/departments/generate",
            json={"name": "Engineering"},
            headers=admin_auth_headers
        )
        
        assert response.status_code == 500
        assert "Failed to generate" in response.json()["detail"]
    
    def test_generate_forbidden_for_interviewer(self, integration_client, interviewer_auth_headers):
        """Test that interviewers cannot generate department profiles."""
        response = integration_client.post(
            "/departments/generate",
            json={"name": "Engineering"},
            headers=interviewer_auth_headers
        )
        
        assert response.status_code == 403
