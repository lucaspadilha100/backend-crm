from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
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
    OpportunityValueUpdate,
    OpportunityLoseRequest,
    OpportunityReactivateRequest,
    PostSaleStageUpdate,
    OpportunityFollowUpUpdate,
    OpportunityDetailResponse,
    BoardCard,
)
from app.schemas.contact import ContactResponse
from app.schemas.interaction import InteractionResponse
from app.services.intake_service import intake_lead
from app.services import lost_service, scoring
from app.services.card_service import to_cards

router = APIRouter()

ACTIVE_STATUSES = ["novo", "contato", "proposta", "visita_agendada", "negociacao"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _apply_filters(
    query,
    status=None,
    source=None,
    lead_type=None,
    assigned_to=None,
    unassigned=False,
    recoverable=None,
    archived=None,
    follow_up_today=False,
    is_repurchase=None,
    pipeline=None,
):
    if status:
        query = query.filter(Opportunity.status == status)
    if source:
        query = query.filter(Opportunity.source == source)
    if lead_type:
        query = query.filter(Opportunity.lead_type == lead_type)
    if assigned_to:
        query = query.filter(Opportunity.assigned_to == assigned_to)
    if unassigned:
        query = query.filter(
            (Opportunity.assigned_to.is_(None)) | (Opportunity.assigned_to == "")
        )
    if recoverable is not None:
        query = query.filter(Opportunity.is_recoverable == recoverable)
    if archived is not None:
        if archived:
            query = query.filter(Opportunity.archived == True)  # noqa: E712
        else:
            query = query.filter(
                (Opportunity.archived == False) | (Opportunity.archived.is_(None))  # noqa: E712
            )
    if follow_up_today:
        end_of_today = datetime.now().replace(hour=23, minute=59, second=59)
        query = query.filter(Opportunity.follow_up_at.isnot(None)).filter(
            Opportunity.follow_up_at <= end_of_today
        )
    if is_repurchase is not None:
        query = query.filter(Opportunity.is_repurchase == is_repurchase)
    if pipeline == "post_sale":
        query = query.filter(Opportunity.status == "fechado")
    elif pipeline == "sales":
        query = query.filter(Opportunity.status.in_(ACTIVE_STATUSES + ["perdido", "fechado"]))
    return query


def _filter_by_score(opportunities, score):
    if not score:
        return opportunities
    return [
        o
        for o in opportunities
        if scoring.lead_score(o.status, o.last_interaction_at) == score
    ]


# ── Intake ────────────────────────────────────────────────────────────────────

@router.post("/intake", response_model=OpportunityResponse)
def intake(data: OpportunityCreate, db: Session = Depends(get_db)):
    opportunity = intake_lead(db, data)
    return opportunity


# ── Listagens (rotas literais ANTES de /{opportunity_id}) ─────────────────────

@router.get("", response_model=list[OpportunityResponse])
def list_opportunities(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    lead_type: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    unassigned: bool = Query(False),
    recoverable: Optional[bool] = Query(None),
    archived: Optional[bool] = Query(None),
    follow_up_today: bool = Query(False),
    is_repurchase: Optional[bool] = Query(None),
    pipeline: Optional[str] = Query(None),
    score: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = _apply_filters(
        db.query(Opportunity),
        status, source, lead_type, assigned_to, unassigned,
        recoverable, archived, follow_up_today, is_repurchase, pipeline,
    )
    results = query.order_by(Opportunity.created_at.desc()).all()
    return _filter_by_score(results, score)


@router.get("/board", response_model=list[BoardCard])
def board(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    lead_type: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    unassigned: bool = Query(False),
    recoverable: Optional[bool] = Query(None),
    archived: Optional[bool] = Query(False),  # board esconde arquivados por padrão
    follow_up_today: bool = Query(False),
    is_repurchase: Optional[bool] = Query(None),
    pipeline: Optional[str] = Query(None),
    score: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = _apply_filters(
        db.query(Opportunity),
        status, source, lead_type, assigned_to, unassigned,
        recoverable, archived, follow_up_today, is_repurchase, pipeline,
    )
    results = query.order_by(Opportunity.created_at.desc()).all()
    results = _filter_by_score(results, score)
    return to_cards(db, results)


@router.get("/reactivation", response_model=list[BoardCard])
def reactivation_queue(
    include_future: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Fila de cadência: leads perdidos recuperáveis prontos para reativar."""
    query = (
        db.query(Opportunity)
        .filter(Opportunity.status == "perdido")
        .filter(Opportunity.is_recoverable == True)  # noqa: E712
        .filter(Opportunity.follow_up_at.isnot(None))
    )
    if not include_future:
        end_of_today = datetime.now().replace(hour=23, minute=59, second=59)
        query = query.filter(Opportunity.follow_up_at <= end_of_today)

    results = query.order_by(Opportunity.follow_up_at.asc()).all()
    return to_cards(db, results)


@router.get("/stalled", response_model=list[BoardCard])
def stalled_leads(
    level: Optional[str] = Query(None, description="warning | danger"),
    db: Session = Depends(get_db),
):
    """Leads ativos parados (sem interação recente)."""
    warning_threshold = datetime.now() - timedelta(days=2)
    results = (
        db.query(Opportunity)
        .filter(Opportunity.status.in_(ACTIVE_STATUSES))
        .filter(
            (Opportunity.last_interaction_at < warning_threshold)
            | (Opportunity.last_interaction_at.is_(None))
        )
        .order_by(Opportunity.last_interaction_at.asc())
        .all()
    )
    if level:
        results = [
            o for o in results
            if scoring.stall_level(o.status, o.last_interaction_at) == level
        ]
    return to_cards(db, results)


# ── Detalhe ───────────────────────────────────────────────────────────────────

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


# ── Mutações ──────────────────────────────────────────────────────────────────

@router.put("/{opportunity_id}/status", response_model=OpportunityResponse)
def update_status(opportunity_id: int, data: OpportunityStatusUpdate, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    now = datetime.now()
    opportunity.status = data.status.value
    opportunity.stage_changed_at = now
    opportunity.last_interaction_at = now

    # Ao fechar, entra automaticamente no pipeline de pós-venda.
    if data.status.value == "fechado" and not opportunity.post_sale_stage:
        opportunity.post_sale_stage = "producao"

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


@router.put("/{opportunity_id}/value", response_model=OpportunityResponse)
def update_value(opportunity_id: int, data: OpportunityValueUpdate, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    opportunity.value = data.value
    db.commit()
    db.refresh(opportunity)
    return opportunity


@router.put("/{opportunity_id}/lose", response_model=OpportunityResponse)
def lose(opportunity_id: int, data: OpportunityLoseRequest, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")
    return lost_service.lose_opportunity(db, opportunity, data)


@router.post("/{opportunity_id}/reactivate", response_model=OpportunityResponse)
def reactivate(opportunity_id: int, data: OpportunityReactivateRequest, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")
    if opportunity.status != "perdido":
        raise HTTPException(status_code=400, detail="Apenas oportunidades perdidas podem ser reativadas.")
    return lost_service.reactivate_opportunity(db, opportunity, data)


@router.put("/{opportunity_id}/follow-up", response_model=OpportunityResponse)
def update_follow_up(opportunity_id: int, data: OpportunityFollowUpUpdate, db: Session = Depends(get_db)):
    """Agenda (ou limpa) um follow-up para a oportunidade — inclusive ativas."""
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")

    opportunity.follow_up_at = data.follow_up_at

    if data.follow_up_at:
        note = f"Follow-up agendado para {data.follow_up_at:%d/%m/%Y}."
    else:
        note = "Follow-up removido."
    db.add(Interaction(opportunity_id=opportunity_id, type="sistema", notes=note))

    db.commit()
    db.refresh(opportunity)
    return opportunity


@router.put("/{opportunity_id}/post-sale-stage", response_model=OpportunityResponse)
def update_post_sale_stage(opportunity_id: int, data: PostSaleStageUpdate, db: Session = Depends(get_db)):
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity não encontrada.")
    if opportunity.status != "fechado":
        raise HTTPException(status_code=400, detail="Pós-venda disponível apenas para oportunidades fechadas.")

    opportunity.post_sale_stage = data.post_sale_stage.value
    opportunity.stage_changed_at = datetime.now()
    db.commit()
    db.refresh(opportunity)
    return opportunity
