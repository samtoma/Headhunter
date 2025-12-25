from datetime import datetime, timedelta, timezone
from typing import Optional
import os
from cryptography.fernet import Fernet
from jose import jwt
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

# SECRET_KEY should be in env vars in production
SECRET_KEY = "supersecretkey" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Default DEV key (replace with real one in production env)
DEV_KEY = "DT5F69b_Al-O81XZnOK5V9WDB8OH21uMfdgZzh3SKpE="
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", DEV_KEY)

try:
    fernet = Fernet(ENCRYPTION_KEY)
except Exception as e:
    logger.warning(f"Invalid ENCRYPTION_KEY, using default dev key. Error: {e}")
    fernet = Fernet(DEV_KEY)

def encrypt_token(token: str) -> str:
    """Encrypts a token string."""
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    """Decrypts an encrypted token string."""
    return fernet.decrypt(encrypted_token.encode()).decode()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
