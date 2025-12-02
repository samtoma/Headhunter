from unittest.mock import patch, MagicMock, AsyncMock
from app.models.models import CV

def test_cv_upload_and_process(authenticated_client, db):
    client = authenticated_client
    
    # Mock aiofiles and celery task
    with patch("aiofiles.open") as mock_open, \
         patch("app.tasks.cv_tasks.process_cv_task.delay") as mock_task:
        
        # Mock file write (Async Context Manager + Async Write)
        mock_f = AsyncMock()
        mock_open.return_value.__aenter__.return_value = mock_f
        
        # 1. Upload Bulk
        files = [
            ('files', ('resume1.pdf', b'content', 'application/pdf')),
            ('files', ('resume2.docx', b'content', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
        ]
        res = client.post("/cv/upload_bulk", files=files)
        assert res.status_code == 200
        data = res.json()
        assert len(data["ids"]) == 2
        assert mock_task.call_count == 2
        
        cv_id = data["ids"][0]
        
        # 2. Get Processing Status
        # Manually set is_parsed=False for test
        cv = db.query(CV).filter(CV.id == cv_id).first()
        cv.is_parsed = False
        db.commit()
        
        res = client.get("/cv/status")
        assert res.status_code == 200
        assert cv_id in res.json()["processing_ids"]
        
        # 3. Reprocess
        res = client.post(f"/cv/{cv_id}/reprocess")
        assert res.status_code == 200
        
        # 4. Reprocess Bulk
        res = client.post("/cv/reprocess_bulk", json=[cv_id])
        assert res.status_code == 200

def test_cv_download_and_delete(authenticated_client, db):
    client = authenticated_client
    
    # Create a dummy CV in DB
    cv = CV(filename="download_test.pdf", filepath="/tmp/download_test.pdf", company_id=1)
    db.add(cv)
    db.commit()
    db.refresh(cv)
    
    # 1. Download (Mock file existence)
    with patch("pathlib.Path.exists", return_value=True), \
         patch("builtins.open", new_callable=MagicMock):
        
        res = client.get(f"/cv/{cv.id}/download")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        
    # 2. Delete
    with patch("os.remove") as mock_remove, \
         patch("os.path.exists", return_value=True):
        
        res = client.delete(f"/cv/{cv.id}")
        assert res.status_code == 200
        mock_remove.assert_called_once()
        
    # Verify DB deletion
    cv_check = db.query(CV).filter(CV.id == cv.id).first()
    assert cv_check is None

def test_cv_edge_cases(authenticated_client):
    client = authenticated_client
    
    # Upload unsupported file
    files = [('files', ('test.txt', b'content', 'text/plain'))]
    res = client.post("/cv/upload_bulk", files=files)
    assert res.status_code == 400
    
    # Delete non-existent
    res = client.delete("/cv/9999")
    assert res.status_code == 404
    
    # Download non-existent
    res = client.get("/cv/9999/download")
    assert res.status_code == 404
