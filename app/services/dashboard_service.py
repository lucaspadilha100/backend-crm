"""Agregações operacionais do dashboard e visão 360 do cliente.

Tudo calculado a partir dos dados reais (sem mock)."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.opportunity import Opportunity
from app.schemas.dashboard import (
    DashboardMetrics,
    LostReasonCount,
    StageCount,
    ContactSummary,
)
from app.schemas.contact import ContactResponse
from app.schemas.opportunity import OpportunityResponse


ACTIVE_STATUSES = ["novo", "contato", "proposta", "visita_agendada", "negociacao"]
ALL_STATUSES = ACTIVE_STATUSES + ["fechado", "perdido"]
STALE_DAYS = 2


def build_metrics(db: Session) -> DashboardMetrics:
    leads_received = db.query(func.count(Opportunity.id)).scalar() or 0

    active = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.status.in_(ACTIVE_STATUSES))
        .filter(Opportunity.won_at.is_(None))
        .filter((Opportunity.archived == False) | (Opportunity.archived.is_(None)))  # noqa: E712
        .scalar()
        or 0
    )

    won = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.won_at.isnot(None))
        .scalar()
        or 0
    )

    lost = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.status == "perdido")
        .scalar()
        or 0
    )

    decided = won + lost
    conversion_rate = round((won / decided) * 100, 1) if decided else 0.0

    reason_rows = (
        db.query(Opportunity.lost_reason, func.count(Opportunity.id))
        .filter(Opportunity.status == "perdido")
        .filter(Opportunity.lost_reason.isnot(None))
        .group_by(Opportunity.lost_reason)
        .all()
    )
    lost_reasons = [
        LostReasonCount(reason=reason, count=count) for reason, count in reason_rows
    ]

    in_cadence = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.status == "perdido")
        .filter(Opportunity.is_recoverable == True)  # noqa: E712
        .filter(Opportunity.follow_up_at.isnot(None))
        .scalar()
        or 0
    )

    without_responsible = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.status.in_(ACTIVE_STATUSES))
        .filter(Opportunity.won_at.is_(None))
        .filter((Opportunity.assigned_to.is_(None)) | (Opportunity.assigned_to == ""))
        .scalar()
        or 0
    )

    stale_threshold = datetime.now() - timedelta(days=STALE_DAYS)
    without_recent_interaction = (
        db.query(func.count(Opportunity.id))
        .filter(Opportunity.status.in_(ACTIVE_STATUSES))
        .filter(Opportunity.won_at.is_(None))
        .filter(
            (Opportunity.last_interaction_at < stale_threshold)
            | (Opportunity.last_interaction_at.is_(None))
        )
        .scalar()
        or 0
    )

    pipeline_value = (
        db.query(func.coalesce(func.sum(Opportunity.value), 0.0))
        .filter(Opportunity.status.in_(ACTIVE_STATUSES))
        .filter(Opportunity.won_at.is_(None))
        .scalar()
        or 0.0
    )

    won_value = (
        db.query(func.coalesce(func.sum(Opportunity.value), 0.0))
        .filter(Opportunity.won_at.isnot(None))
        .scalar()
        or 0.0
    )

    count_rows = dict(
        db.query(Opportunity.status, func.count(Opportunity.id))
        .group_by(Opportunity.status)
        .all()
    )
    stage_counts = [
        StageCount(status=status, count=int(count_rows.get(status, 0)))
        for status in ALL_STATUSES
    ]

    return DashboardMetrics(
        leads_received=leads_received,
        active_opportunities=active,
        won_opportunities=won,
        lost_opportunities=lost,
        conversion_rate=conversion_rate,
        lost_reasons=lost_reasons,
        in_cadence=in_cadence,
        without_responsible=without_responsible,
        without_recent_interaction=without_recent_interaction,
        pipeline_value=float(pipeline_value),
        won_value=float(won_value),
        stage_counts=stage_counts,
    )


def build_contact_summary(db: Session, contact: Contact) -> ContactSummary:
    opportunities = (
        db.query(Opportunity)
        .filter(Opportunity.contact_id == contact.id)
        .order_by(Opportunity.created_at.desc())
        .all()
    )

    purchases = [o for o in opportunities if o.status == "fechado"]
    total_value = sum((o.value or 0) for o in purchases)
    reentries = sum((o.reentry_count or 0) for o in opportunities)

    active = next((o for o in opportunities if o.status in ACTIVE_STATUSES), None)

    now = datetime.now()
    upcoming = [
        o
        for o in opportunities
        if o.follow_up_at is not None and o.follow_up_at >= now
    ]

    return ContactSummary(
        contact=ContactResponse.model_validate(contact),
        total_opportunities=len(opportunities),
        purchases=len(purchases),
        total_value=float(total_value),
        reentries=reentries,
        is_returning=len(purchases) > 0,
        current_status=active.status if active else None,
        opportunities=[OpportunityResponse.model_validate(o) for o in opportunities],
        upcoming_cadences=[OpportunityResponse.model_validate(o) for o in upcoming],
    )
