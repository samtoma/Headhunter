from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Company

def touch_company_state(db: Session, company_id: int):
    """
    Updates the last_data_update timestamp for a company.
    This should be called whenever data relevant to the frontend cache is modified.
    """
    if not company_id:
        return
        
    company = db.query(Company).filter(Company.id == company_id).first()
    if company:
        company.last_data_update = func.now()
        db.commit()
