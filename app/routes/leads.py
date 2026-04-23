from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadUpdate, LeadUpdateStatus
from app.services.automation import on_lead_created

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/leads")
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = Lead(
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        notes=lead.notes,
        source=lead.source.value if lead.source else "manual",
        lead_type=lead.lead_type.value if lead.lead_type else "contato",
        item_name=lead.item_name,
        item_code=lead.item_code,
        page_url=lead.page_url,
        message=lead.message,
        status="novo"
    )
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)

    on_lead_created(db_lead)

    return {"message": "Lead criado", "lead": db_lead}


@router.get("/leads")
def list_leads(status: str = Query(None), db: Session = Depends(get_db)):
    query = db.query(Lead)

    if status:
        query = query.filter(Lead.status == status)

    leads = query.all()
    return {"leads": leads}


@router.get("/leads/pipeline")
def get_pipeline(db: Session = Depends(get_db)):
    leads = db.query(Lead).all()

    pipeline = {
        "novo": [],
        "contato": [],
        "proposta": [],
        "fechado": [],
        "perdido": []
    }

    for lead in leads:
        pipeline[lead.status].append(lead)

    return pipeline


@router.get("/leads/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": "Lead não encontrado"}
    return lead


@router.put("/leads/{lead_id}")
def update_lead(lead_id: int, data: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": "Lead não encontrado"}

    lead.name = data.name
    lead.email = data.email
    lead.phone = data.phone
    lead.company = data.company
    lead.notes = data.notes

    if data.source:
        lead.source = data.source.value

    if data.lead_type:
        lead.lead_type = data.lead_type.value

    lead.item_name = data.item_name
    lead.item_code = data.item_code
    lead.page_url = data.page_url
    lead.message = data.message

    db.commit()
    db.refresh(lead)

    return {"message": "Lead atualizado", "lead": lead}


@router.put("/leads/{lead_id}/status")
def update_status(lead_id: int, data: LeadUpdateStatus, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return {"error": "Lead não encontrado"}

    lead.status = data.status.value
    db.commit()
    db.refresh(lead)

    return {"message": "Status atualizado", "lead": lead}