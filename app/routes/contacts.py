from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.contact import Contact
from app.models.opportunity import Opportunity

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/contacts")
def list_contacts(db: Session = Depends(get_db)):
    return db.query(Contact).all()


@router.get("/contacts/{contact_id}")
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()

    if not contact:
        return {"error": "Contact não encontrado"}

    return contact


@router.get("/contacts/{contact_id}/opportunities")
def get_contact_opportunities(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()

    if not contact:
        return {"error": "Contact não encontrado"}

    opportunities = (
        db.query(Opportunity)
        .filter(Opportunity.contact_id == contact_id)
        .order_by(Opportunity.created_at.desc())
        .all()
    )

    return {
        "contact": contact,
        "opportunities": opportunities
    }