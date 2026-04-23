from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.contact import Contact
from app.models.opportunity import Opportunity
from app.models.interaction import Interaction
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityResponse,
    OpportunityStatusUpdate,
    OpportunityNotesUpdate,
    OpportunityAssignUpdate,
    OpportunityDetailResponse,
)
from app.schemas.contact import ContactResponse
from app.schemas.interaction import InteractionResponse
from app.services.intake_service import intake_lead

router = APIRouter()


@router.post("/intake", response_model=OpportunityResponse)
def intake(data: OpportunityCreate, db: Session = Depends(get_db)):
    opportunity = intake_lead(db, data)
    return opportunity


@router.get("", response_model=list[OpportunityResponse])
def list_opportunities(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    lead_type: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Opportunity)

    if status:
        query = query.filter(Opportunity.status == status)
    if source:
        query = query.filter(Opportunity.source == source)
    if lead_type:
        query = query.filter(Opportunity.lead_type == lead_type)
    if assigned_to:
        query = query.filter(Opportunity.assigned_to == assigned_to)

    return query.order_by(Opportunity.created_at.desc()).all()


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")
    return opportunity


@router.get("/{opportunity_id}/details", response_model=OpportunityDetailResponse)
def get_opportunity_details(opportunity_id: int, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    contact = db.query(Contact).filter(Contact.id == opportunity.contact_id).first()

    previous_opportunity = None
    if opportunity.previous_opportunity_id:
        previous_opportunity = (
            db.query(Opportunity)
            .filter(Opportunity.id == opportunity.previous_opportunity_id)
            .first()
        )

    interactions = (
        db.query(Interaction)
        .filter(Interaction.opportunity_id == opportunity_id)
        .order_by(Interaction.created_at.desc())
        .all()
    )

    return OpportunityDetailResponse(
        opportunity=OpportunityResponse.model_validate(opportunity),
        contact=ContactResponse.model_validate(contact),
        previous_opportunity=OpportunityResponse.model_validate(previous_opportunity) if previous_opportunity else None,
        interactions=[InteractionResponse.model_validate(i) for i in interactions],
    )


@router.put("/{opportunity_id}/status", response_model=OpportunityResponse)
def update_status(opportunity_id: int, data: OpportunityStatusUpdate, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    opportunity.status = data.status.value
    db.commit()
    db.refresh(opportunity)
    return opportunity


@router.put("/{opportunity_id}/notes", response_model=OpportunityResponse)
def update_notes(opportunity_id: int, data: OpportunityNotesUpdate, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    opportunity.notes = data.notes
    db.commit()
    db.refresh(opportunity)
    return opportunity


@router.put("/{opportunity_id}/assign", response_model=OpportunityResponse)
def assign_opportunity(opportunity_id: int, data: OpportunityAssignUpdate, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    opportunity.assigned_to = data.assigned_to
    db.commit()
    db.refresh(opportunity)
    return opportunity