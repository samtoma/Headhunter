import pytest
from unittest.mock import AsyncMock, patch
from app.core.email import send_verification_email

@pytest.mark.asyncio
async def test_send_verification_email():
    with patch("app.core.email.FastMail") as MockFastMail:
        mock_fm_instance = AsyncMock()
        MockFastMail.return_value = mock_fm_instance
        
        await send_verification_email("test@example.com", "token123")
        
        # Verify send_message called
        mock_fm_instance.send_message.assert_called_once()
        call_args = mock_fm_instance.send_message.call_args
        message = call_args[0][0]
        
        # fastapi-mail might convert to objects, check email string
        assert message.recipients[0].email == "test@example.com"
        assert message.subject == "Headhunter - Verify your email"
        assert "token123" in message.body
