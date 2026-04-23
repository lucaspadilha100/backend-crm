from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact import Contact
from app.models.opportunity import Opportunity
from app.schemas.contact import ContactResponse
from app.schemas.opportunity import OpportunityResponse

router = APIRouter()


@router.get("", response_model=list[ContactResponse])
def list_contacts(db: Session = Depends(get_db)):
    return db.query(Contact).order_by(Contact.created_at.desc()).all()


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact não encontrado.")
    return contact


@router.get("/{contact_id}/opportunities", response_model=dict)
def get_contact_opportunities(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact não encontrado.")

    opportunities = (
        db.query(Opportunity)
        .filter(Opportunity.contact_id == contact_id)
        .order_by(Opportunity.created_at.desc())
        .all()
    )

    return {
        "contact": ContactResponse.model_validate(contact),
        "opportunities": [OpportunityResponse.model_validate(o) for o in opportunities],
    }