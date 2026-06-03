"""Fluxo profissional de perda e reativação de oportunidades.

Princípio do produto: todo lead tem um destino. Ao perder, registramos o porquê
e decidimos se é descartado (arquivável) ou recuperável (entra em cadência).
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.opportunity import Opportunity
from app.models.interaction import Interaction
from app.models.pipeline import Stage


def _stage_of_category(db: Session, pipeline_id, category: str):
    if not pipeline_id:
        return None
    return (
        db.query(Stage)
        .filter(Stage.pipeline_id == pipeline_id, Stage.category == category)
        .order_by(Stage.position.asc())
        .first()
    )


def _register(db: Session, opportunity_id: int, type_: str, notes: str, user: str = None):
    interaction = Interaction(
        opportunity_id=opportunity_id,
        type=type_,
        notes=notes,
        user=user,
    )
    db.add(interaction)


def lose_opportunity(db: Session, opportunity: Opportunity, data) -> Opportunity:
    now = datetime.now()

    opportunity.status = "perdido"
    opportunity.lost_reason = data.reason.value
    opportunity.lost_observation = data.observation
    opportunity.is_recoverable = data.is_recoverable
    opportunity.lost_at = now
    opportunity.stage_changed_at = now
    opportunity.last_interaction_at = now

    # Move o card para a etapa "perdido" do funil atual, se existir.
    lost_stage = _stage_of_category(db, opportunity.pipeline_id, "lost")
    if lost_stage:
        opportunity.stage_id = lost_stage.id

    if data.is_recoverable:
        opportunity.follow_up_at = data.follow_up_at
        # Descartado fica fora do board; recuperável permanece visível p/ cadência.
        opportunity.archived = False
    else:
        opportunity.follow_up_at = None
        opportunity.archived = True

    classificacao = "recuperável" if data.is_recoverable else "descartado"
    follow = (
        f" Follow-up agendado para {data.follow_up_at:%d/%m/%Y}."
        if data.is_recoverable and data.follow_up_at
        else ""
    )
    _register(
        db,
        opportunity.id,
        "sistema",
        f"Oportunidade marcada como PERDIDA ({classificacao}). "
        f"Motivo: {data.reason.value}."
        + (f" Observação: {data.observation}." if data.observation else "")
        + follow,
    )

    db.commit()
    db.refresh(opportunity)
    return opportunity


def reactivate_opportunity(db: Session, opportunity: Opportunity, data) -> Opportunity:
    now = datetime.now()
    previous_reason = opportunity.lost_reason

    opportunity.status = data.status.value
    opportunity.archived = False
    opportunity.lost_at = None
    opportunity.follow_up_at = None
    opportunity.is_recoverable = None
    opportunity.lost_reason = None
    opportunity.lost_observation = None
    opportunity.stage_changed_at = now
    opportunity.last_interaction_at = now

    # Devolve para a primeira etapa aberta do funil.
    open_stage = _stage_of_category(db, opportunity.pipeline_id, "open")
    if open_stage:
        opportunity.stage_id = open_stage.id

    note = "Oportunidade reativada e devolvida ao funil."
    if previous_reason:
        note += f" Perda anterior: {previous_reason}."
    if data.notes:
        note += f" {data.notes}"
    _register(db, opportunity.id, "reentrada", note)

    db.commit()
    db.refresh(opportunity)
    return opportunity
