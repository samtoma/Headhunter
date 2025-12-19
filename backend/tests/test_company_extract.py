"""
Tests for company profile extraction and regeneration functionality.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import json
from app.models.models import UserRole


# Mock HTML content for testing
MOCK_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Test Company</title>
    <meta property="og:image" content="https://example.com/logo.png">
    <link rel="apple-touch-icon" href="/apple-icon.png">
    <script type="application/ld+json">
    {
        "@type": "Organization",
        "name": "Test Company Inc",
        "logo": "https://example.com/structured-logo.png",
        "foundingDate": "2018"
    }
    </script>
</head>
<body>
    <h1>Welcome to Test Company</h1>
    <p>We are a technology company founded in 2018.</p>
    <a href="https://linkedin.com/company/testco">LinkedIn</a>
    <a href="https://twitter.com/testco">Twitter</a>
</body>
</html>
"""

MOCK_AI_RESPONSE = {
    "name": "Test Company",
    "tagline": "Innovation at its best",
    "description": "A leading technology company",
    "industry": "Technology",
    "founded_year": 2018,
    "company_size": "51-200",
    "headquarters": "San Francisco, USA",
    "company_type": "Private",
    "specialties": ["AI", "Machine Learning", "Cloud"],
    "mission": "To innovate",
    "vision": "To lead the industry",
    "values": ["Innovation", "Integrity", "Teamwork"],
    "culture": "Fast-paced and collaborative",
    "products_services": "AI-powered solutions",
    "target_market": "Enterprise companies",
    "competitive_advantage": "Best-in-class AI technology",
    "departments": ["Engineering", "Sales", "Marketing", "Product"]
}


class TestExtractCompanyInfo:
    """Tests for the extract_company_info endpoint."""

    @pytest.fixture
    def mock_openai_response(self):
        """Create a mock OpenAI response."""
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = json.dumps(MOCK_AI_RESPONSE)
        return mock_completion

    @patch("app.api.v1.company.httpx.AsyncClient")
    @patch("app.api.v1.company.get_openai_client")
    def test_extract_preserves_website_url(
        self,
        mock_get_client,
        mock_http_client,
        authenticated_client,
        mock_openai_response,
    ):
        """Test that website URL is preserved in the extraction result."""
        # Setup mocks
        mock_client_instance = AsyncMock()
        mock_http_client.return_value.__aenter__.return_value = mock_client_instance
        
        mock_response = MagicMock()
        mock_response.text = MOCK_HTML
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_client_instance.get.return_value = mock_response
        
        mock_openai = AsyncMock()
        mock_openai.chat.completions.create.return_value = mock_openai_response
        mock_get_client.return_value = mock_openai

        # Make request
        test_url = "https://testcompany.com"
        response = authenticated_client.post(
            "/company/extract_info",
            json={"url": test_url}
        )

        # Verify website URL is in response
        assert response.status_code == 200
        data = response.json()
        assert "website" in data
        assert data["website"] == test_url

    @patch("app.api.v1.company.httpx.AsyncClient")
    @patch("app.api.v1.company.get_openai_client")
    def test_extract_includes_logo_url(
        self,
        mock_get_client,
        mock_http_client,
        authenticated_client,
        mock_openai_response,
    ):
        """Test that logo URL is extracted from og:image."""
        # Setup mocks
        mock_client_instance = AsyncMock()
        mock_http_client.return_value.__aenter__.return_value = mock_client_instance
        
        mock_response = MagicMock()
        mock_response.text = MOCK_HTML
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_client_instance.get.return_value = mock_response
        
        mock_openai = AsyncMock()
        mock_openai.chat.completions.create.return_value = mock_openai_response
        mock_get_client.return_value = mock_openai

        # Make request
        response = authenticated_client.post(
            "/company/extract_info",
            json={"url": "https://testcompany.com"}
        )

        # Verify logo URL is in response
        assert response.status_code == 200
        data = response.json()
        assert "logo_url" in data
        assert data["logo_url"] == "https://example.com/structured-logo.png"

    @patch("app.api.v1.company.httpx.AsyncClient")
    @patch("app.api.v1.company.get_openai_client")
    def test_extract_includes_departments(
        self,
        mock_get_client,
        mock_http_client,
        authenticated_client,
        mock_openai_response,
    ):
        """Test that departments are extracted and converted to JSON string."""
        # Setup mocks
        mock_client_instance = AsyncMock()
        mock_http_client.return_value.__aenter__.return_value = mock_client_instance
        
        mock_response = MagicMock()
        mock_response.text = MOCK_HTML
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_client_instance.get.return_value = mock_response
        
        mock_openai = AsyncMock()
        mock_openai.chat.completions.create.return_value = mock_openai_response
        mock_get_client.return_value = mock_openai

        # Make request
        response = authenticated_client.post(
            "/company/extract_info",
            json={"url": "https://testcompany.com"}
        )

        # Verify departments are in response as JSON string
        assert response.status_code == 200
        data = response.json()
        assert "departments" in data
        # Departments should be a JSON string
        departments = json.loads(data["departments"])
        assert isinstance(departments, list)
        assert "Engineering" in departments

    @patch("app.api.v1.company.httpx.AsyncClient")
    @patch("app.api.v1.company.get_openai_client")
    def test_extract_includes_social_links(
        self,
        mock_get_client,
        mock_http_client,
        authenticated_client,
        mock_openai_response,
    ):
        """Test that social media links are extracted from the page."""
        # Setup mocks
        mock_client_instance = AsyncMock()
        mock_http_client.return_value.__aenter__.return_value = mock_client_instance
        
        mock_response = MagicMock()
        mock_response.text = MOCK_HTML
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_client_instance.get.return_value = mock_response
        
        mock_openai = AsyncMock()
        mock_openai.chat.completions.create.return_value = mock_openai_response
        mock_get_client.return_value = mock_openai

        # Make request
        response = authenticated_client.post(
            "/company/extract_info",
            json={"url": "https://testcompany.com"}
        )

        # Verify social links are in response
        assert response.status_code == 200
        data = response.json()
        assert "social_linkedin" in data
        assert "linkedin.com" in data["social_linkedin"]
        assert "twitter.com" in data["social_twitter"]


class TestRegenerateCompanyProfile:
    """Tests for the regenerate company profile endpoint."""

    @patch("app.api.v1.company.extract_company_info")
    def test_regenerate_updates_company(
        self, mock_extract, authenticated_client, db
    ):
        """Test that regenerate updates the company with extracted data."""
        mock_extract.return_value = {
            "name": "Updated Company",
            "website": "https://updated.com",
            "logo_url": "https://updated.com/logo.png",
            "departments": '["Engineering", "Sales"]',
            "specialties": '["Tech", "AI"]',
            "values": '["Innovation"]'
        }

        response = authenticated_client.post(
            "/company/regenerate",
            json={"url": "https://updated.com"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Company"
        assert data["website"] == "https://updated.com"
