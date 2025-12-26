import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Settings:
    # Service Information
    PROJECT_NAME: str = "Headhunter AI"
    VERSION: str = "1.18.2"
    
    # Database Configurations
    # Main DB: Business Data (Users, Companies, Jobs)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:30002/headhunter_db")
    
    # Logs DB: High-volume System & LLM Logs
    # Default to DATABASE_URL if LOGS_DATABASE_URL is missing to simplify onboarding
    LOGS_DATABASE_URL: str = os.getenv("LOGS_DATABASE_URL") or DATABASE_URL
    
    if LOGS_DATABASE_URL == DATABASE_URL:
        logger.warning("LOGS_DATABASE_URL not set. Falling back to main DATABASE_URL.")

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
    
    # Logging Configuration
    LOG_THREAD_POOL_SIZE: int = int(os.getenv("LOG_THREAD_POOL_SIZE", "2"))  # Thread pool size for logging operations

    # Security Configuration
    DEV_KEY: str = "DT5F69b_Al-O81XZnOK5V9WDB8OH21uMfdgZzh3SKpE="
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", DEV_KEY)

settings = Settings()
