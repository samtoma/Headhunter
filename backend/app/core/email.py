import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List
from pathlib import Path

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@headhunter.ai"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_verification_email(email: EmailStr, token: str):
    """
    Sends a verification email with the given token.
    """
    # In a real app, this would link to the frontend verification page
    # For now, we'll just send the token
    
    html = f"""
    <p>Welcome to Headhunter!</p>
    <p>Please verify your account by using the following code:</p>
    <h3>{token}</h3>
    <p>Or click the link below (if frontend is configured):</p>
    <p><a href="http://localhost:3000/verify?token={token}">Verify Email</a></p>
    """

    message = MessageSchema(
        subject="Headhunter - Verify your email",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)
