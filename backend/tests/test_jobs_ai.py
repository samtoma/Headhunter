from unittest.mock import patch, AsyncMock
import pytest

def test_generate_job_description(authenticated_client):
    client = authenticated_client
    
    # Mock generate_job_metadata
    with patch("app.api.v1.jobs.generate_job_metadata", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "description": "AI Generated Desc",
            "responsibilities": '["Resp 1"]',
            "qualifications": '["Qual 1"]',
            "skills_required": '["Skill 1"]'
        }
        
        res = client.post("/jobs/analyze", json={
            "title": "AI Job",
            "location": "Remote"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["description"] == "AI Generated Desc"
        assert "Resp 1" in data["responsibilities"]

def test_generate_job_description_error(authenticated_client):
    client = authenticated_client
    
    with patch("app.api.v1.jobs.generate_job_metadata", side_effect=Exception("AI Error")):
        # TestClient raises exceptions by default, so we expect the exception
        with pytest.raises(Exception) as exc:
            client.post("/jobs/analyze", json={"title": "Fail"})
        assert "AI Error" in str(exc.value)
