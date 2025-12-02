import pytest
from unittest.mock import MagicMock, patch
from app.tasks.cv_tasks import process_cv_task

@patch("app.tasks.cv_tasks.r")
@patch("app.tasks.cv_tasks.process_cv")
def test_process_cv_task_success(mock_process_cv, mock_redis):
    """Test successful CV processing task execution."""
    # Setup mocks
    mock_redis.llen.return_value = 5
    mock_redis.incr.return_value = 1
    
    # Execute task
    # Note: We call the function directly, bypassing Celery's apply_async for unit testing logic
    process_cv_task(cv_id=123)
    
    # Verify interactions
    mock_redis.llen.assert_called_with("celery")
    mock_redis.incr.assert_called_with("cv_processing_count")
    mock_process_cv.assert_called_once_with(123)
    mock_redis.decr.assert_called_with("cv_processing_count")

@patch("app.tasks.cv_tasks.r")
@patch("app.tasks.cv_tasks.process_cv")
@patch("app.tasks.cv_tasks.process_cv_task.retry")
def test_process_cv_task_failure(mock_retry, mock_process_cv, mock_redis):
    """Test CV processing task failure and retry."""
    # Setup mocks
    mock_redis.llen.return_value = 5
    mock_redis.incr.return_value = 1
    mock_process_cv.side_effect = Exception("Processing failed")
    mock_retry.side_effect = Exception("Retry raised") # Simulate retry raising exception
    
    # Execute task
    with pytest.raises(Exception, match="Retry raised"):
        process_cv_task(cv_id=123)
    
    # Verify interactions
    mock_process_cv.assert_called_once_with(123)
    mock_retry.assert_called()
    mock_redis.decr.assert_called_with("cv_processing_count")
