from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityStatusUpdate,
    OpportunityNotesUpdate,
    OpportunityAssignUpdate,
)
from app.services.intake_service import intake_lead
from app.models.opportunity import Opportunity

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/opportunities/intake")
def intake(data: OpportunityCreate, db: Session = Depends(get_db)):
    opportunity = intake_lead(db, data)
    return {"opportunity": opportunity}


@router.get("/opportunities")
def list_opportunities(db: Session = Depends(get_db)):
    return db.query(Opportunity).order_by(Opportunity.created_at.desc()).all()


@router.get("/opportunities/pipeline")
def pipeline(db: Session = Depends(get_db)):
    opportunities = db.query(Opportunity).all()

    result = {
        "novo": [],
        "contato": [],
        "proposta": [],
        "visita_agendada": [],
        "negociacao": [],
        "fechado": [],
        "perdido": []
    }

    for op in opportunities:
        result[op.status].append(op)

    return result


@router.get("/opportunities/{opportunity_id}")
def get_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    opportunity = (
        db.query(Opportunity)
        .filter(Opportunity.id == opportunity_id)
        .first()
    )

    if not opportunity:
        return {"error": "Opportunity não encontrada"}

    return opportunity


@router.put("/opportunities/{opportunity_id}/status")
def update_opportunity_status(opportunity_id: int, data: OpportunityStatusUpdate, db: Session = Depends(get_db)):
    opportunity = (
        db.query(Opportunity)
        .filter(Opportunity.id == opportunity_id)
        .first()
    )

    if not opportunity:
        return {"error": "Opportunity não encontrada"}

    opportunity.status = data.status.value
    db.commit()
    db.refresh(opportunity)

    return {"message": "Status atualizado", "opportunity": opportunity}


@router.put("/opportunities/{opportunity_id}/notes")
def update_opportunity_notes(opportunity_id: int, data: OpportunityNotesUpdate, db: Session = Depends(get_db)):
    opportunity = (
        db.query(Opportunity)
        .filter(Opportunity.id == opportunity_id)
        .first()
    )

    if not opportunity:
        return {"error": "Opportunity não encontrada"}

    opportunity.notes = data.notes
    db.commit()
    db.refresh(opportunity)

    return {"message": "Notes atualizadas", "opportunity": opportunity}


@router.put("/opportunities/{opportunity_id}/assign")
def assign_opportunity(opportunity_id: int, data: OpportunityAssignUpdate, db: Session = Depends(get_db)):
    opportunity = (
        db.query(Opportunity)
        .filter(Opportunity.id == opportunity_id)
        .first()
    )

    if not opportunity:
        return {"error": "Opportunity não encontrada"}

    opportunity.assigned_to = data.assigned_to
    db.commit()
    db.refresh(opportunity)

    return {"message": "Responsável atualizado", "opportunity": opportunity}