import socket
import ipaddress
from urllib.parse import urlparse
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

def validate_safe_url(url: str):
    """
    Validates that a URL is safe to fetch (SSRF protection).
    - Must be http or https
    - Hostname must resolve
    - Resolved IP must not be private, loopback, or link-local
    """
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL format.")

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Invalid URL scheme. Only HTTP and HTTPS are allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid URL: Hostname missing.")
    
    # Explicitly block common local aliases
    if hostname.lower() in ["localhost", "127.0.0.1", "0.0.0.0", "::1"]:
        raise HTTPException(status_code=400, detail="Access to local network resources is denied.")

    try:
        # DNS Resolution (Blocking, but acceptable for this use case)
        # Note: This checks the IP at validation time.
        # A TOCTOU (Time-of-Check Time-of-Use) race condition is theoretically possible 
        # if DNS changes between check and fetch, but this mitigates the vast majority of SSRF.
        # For stricter security, one would need a custom Transport that checks IPs per connection.
        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)

        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved:
            logger.warning(f"Blocked SSRF attempt to {url} (Resolved to {ip})")
            raise HTTPException(status_code=400, detail="Access to private/local network resources is denied.")
            
    except socket.gaierror:
        # If it doesn't resolve, we can't fetch it anyway, or maybe we consider it unsafe?
        # Standard behavior: fail safely.
        raise HTTPException(status_code=400, detail=f"Could not resolve hostname: {hostname}")
    except ValueError:
        # Should catch invalid IP strings if socket somehow returned garbage
        raise HTTPException(status_code=400, detail="Invalid IP address resolved.")

    return True
