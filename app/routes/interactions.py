from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.interaction import Interaction
from app.models.opportunity import Opportunity
from app.schemas.interaction import InteractionCreate, InteractionResponse

router = APIRouter()


@router.post("/interactions", response_model=InteractionResponse, tags=["Interactions"])
def create_interaction(data: InteractionCreate, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == data.opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    interaction = Interaction(
        opportunity_id=data.opportunity_id,
        type=data.type.value,
        notes=data.notes,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


@router.get("/opportunities/{opportunity_id}/interactions", response_model=list[InteractionResponse], tags=["Interactions"])
def list_interactions(opportunity_id: int, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    return (
        db.query(Interaction)
        .filter(Interaction.opportunity_id == opportunity_id)
        .order_by(Interaction.created_at.desc())
        .all()
    )