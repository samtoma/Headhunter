import os
from typing import Optional

class Settings:
    # Service Information
    PROJECT_NAME: str = "Headhunter AI"
    VERSION: str = "1.18.0"
    
    # Database Configurations
    # Main DB: Business Data (Users, Companies, Jobs)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:30002/headhunter_db")
    
    # Logs DB: High-volume System & LLM Logs
    # STRICTLY REQUIRED - Fail if missing to enforce architecture
    _logs_db_url = os.getenv("LOGS_DATABASE_URL")
    if not _logs_db_url:
        # Fallback for CI/Test environments if explicitly allowed, otherwise RAISE
        if os.getenv("ALLOW_MISSING_LOGS_DB", "false").lower() == "true":
            LOGS_DATABASE_URL = DATABASE_URL # Dangerous fallback, only for dev/test
            print("⚠️ WARNING: LOGS_DATABASE_URL invalid. Using DATABASE_URL fallback (Dev Mode).")
        else:
            raise ValueError("CRITICAL: LOGS_DATABASE_URL is not set. Architecture requires separate logs DB.")
    else:
        LOGS_DATABASE_URL: str = _logs_db_url

    # Redis Configuration
    # Unified Redis URL for proper connection pooling
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    
    # Redis legacy separate vars (for backward compat if needed, but we prefer REDIS_URL)
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    REDIS_DB: int = int(os.getenv("REDIS_DB", 0))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")

    @property
    def REDIS_KWARGS(self):
        """Helper for redis-py client initialization"""
        return {
            "host": self.REDIS_HOST,
            "port": self.REDIS_PORT,
            "db": self.REDIS_DB,
            "password": self.REDIS_PASSWORD,
            "decode_responses": True
        }

settings = Settings()
