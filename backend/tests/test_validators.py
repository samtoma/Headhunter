import pytest
from app.core.validators import validate_safe_url
from fastapi import HTTPException
from unittest.mock import patch

def test_validate_safe_url_valid_public():
    # Public IP (Google DNS)
    with patch("socket.gethostbyname", return_value="8.8.8.8"):
        assert validate_safe_url("https://google.com") is True

def test_validate_safe_url_private_ip_192():
    # 192.168.x.x is private
    with patch("socket.gethostbyname", return_value="192.168.1.1"):
        with pytest.raises(HTTPException) as exc:
            validate_safe_url("http://router")
        assert exc.value.status_code == 400
        assert "private/local" in exc.value.detail or "Access to" in exc.value.detail

def test_validate_safe_url_private_ip_10():
    # 10.x.x.x is private
    with patch("socket.gethostbyname", return_value="10.0.0.5"):
        with pytest.raises(HTTPException) as exc:
            validate_safe_url("http://internal")
        assert exc.value.status_code == 400

def test_validate_safe_url_localhost_string():
    # Explicit localhost check
    with pytest.raises(HTTPException) as exc:
         validate_safe_url("http://localhost:8000")
    assert "local" in exc.value.detail.lower()

def test_validate_safe_url_loopback_ip():
    # 127.0.0.1
    # Note: gethostbyname might not be called if we catch 127.0.0.1 string first, 
    # but let's assume we pass a domain that resolves to 127.0.0.1
    with patch("socket.gethostbyname", return_value="127.0.0.1"):
        with pytest.raises(HTTPException) as exc:
            validate_safe_url("http://my-local-domain.com")
    assert "private/local" in exc.value.detail or "Access to" in exc.value.detail

def test_validate_safe_url_invalid_scheme():
    with pytest.raises(HTTPException) as exc:
        validate_safe_url("ftp://example.com")
    assert "scheme" in exc.value.detail.lower()

def test_validate_safe_url_aws_metadata():
    # 169.254.169.254 (Link Local)
    with patch("socket.gethostbyname", return_value="169.254.169.254"):
        with pytest.raises(HTTPException) as exc:
            validate_safe_url("http://169.254.169.254/latest/meta-data")
    assert "private/local" in exc.value.detail or "Access to" in exc.value.detail
