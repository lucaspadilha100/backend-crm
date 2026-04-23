from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.interaction import Interaction
from app.schemas.interaction import InteractionCreate

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/interactions")
def create(data: InteractionCreate, db: Session = Depends(get_db)):
    interaction = Interaction(
        opportunity_id=data.opportunity_id,
        type=data.type.value,
        notes=data.notes
    )

    db.add(interaction)
    db.commit()
    db.refresh(interaction)

    return {"interaction": interaction}


@router.get("/opportunities/{opportunity_id}/interactions")
def list_interactions(opportunity_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Interaction)
        .filter(Interaction.opportunity_id == opportunity_id)
        .order_by(Interaction.created_at.desc())
        .all()
    )