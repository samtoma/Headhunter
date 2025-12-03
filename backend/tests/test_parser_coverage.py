import pytest
from unittest.mock import MagicMock, patch
from app.services.parser import (
    extract_text, 
    clean_contact_field, 
    normalize_job_history, 
    generate_job_metadata, 
    parse_cv_with_llm, 
    get_openai_client
)
import json

def test_get_openai_client_no_key():
    with patch("app.services.parser.OPENAI_API_KEY", None):
        with pytest.raises(ValueError):
            get_openai_client()

def test_extract_text_pdf_annotations():
    with patch("app.services.parser.PdfReader") as MockReader:
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Page Text"
        
        # Mock Annotation
        mock_annot = MagicMock()
        mock_obj = {"/A": {"/URI": "http://example.com"}}
        mock_annot.get_object.return_value = mock_obj
        
        mock_page.__getitem__.return_value = [mock_annot]
        mock_page.__contains__.return_value = True # Contains /Annots
        
        MockReader.return_value.pages = [mock_page]
        
        text = extract_text("test.pdf")
        assert "Page Text" in text
        assert "[LINK: http://example.com]" in text

def test_extract_text_docx():
    with patch("app.services.parser.docx.Document") as MockDoc:
        mock_p1 = MagicMock()
        mock_p1.text = "Para 1"
        mock_p2 = MagicMock()
        mock_p2.text = "" # Empty
        
        MockDoc.return_value.paragraphs = [mock_p1, mock_p2]
        
        text = extract_text("test.docx")
        assert "Para 1" in text
        assert len(text.split("\n")) == 1

def test_extract_text_error():
    with patch("app.services.parser.PdfReader", side_effect=Exception("Read Error")):
        text = extract_text("test.pdf")
        assert text == ""

def test_clean_contact_field():
    # List
    assert clean_contact_field(["a", "b"]) == '["a", "b"]'
    # String with brackets (valid json)
    assert clean_contact_field('["a"]') == '["a"]'
    # String with brackets (invalid json)
    assert clean_contact_field('[a]') == '["[a]"]'
    # Simple string
    assert clean_contact_field(" a ") == '["a"]'
    # None
    assert clean_contact_field(None) == '[]'

def test_normalize_job_history():
    jobs = [
        # Full
        {"title": "Dev", "company": "Co", "start": "2020", "end": "2021", "description": "Desc"},
        # Missing fields fallback
        {"role": "Manager", "organization": "Org", "start_date": "2022", "highlights": ["Did X", "Did Y"]}
    ]
    
    res = normalize_job_history(jobs)
    data = json.loads(res)
    
    assert data[0]["title"] == "Dev"
    assert data[0]["duration"] == "2020 - 2021"
    
    assert data[1]["title"] == "Manager"
    assert data[1]["company"] == "Org"
    assert data[1]["duration"] == "2022 - Present"
    assert data[1]["description"] == "Did X. Did Y"

@pytest.mark.asyncio
async def test_generate_job_metadata_no_key():
    with patch("app.services.parser.OPENAI_API_KEY", None):
        res = await generate_job_metadata("Title")
        assert res == {}

@pytest.mark.asyncio
async def test_generate_job_metadata_error():
    with patch("app.services.parser.get_openai_client", side_effect=Exception("API Error")):
        res = await generate_job_metadata("Title")
        assert res == {}

@pytest.mark.asyncio
async def test_parse_cv_with_llm_no_key():
    with patch("app.services.parser.OPENAI_API_KEY", None):
        res = await parse_cv_with_llm("text", "file.pdf")
        assert res == {}

@pytest.mark.asyncio
async def test_parse_cv_with_llm_error():
    with patch("app.services.parser.get_openai_client", side_effect=Exception("API Error")):
        res = await parse_cv_with_llm("text", "file.pdf")
        assert res == {}
