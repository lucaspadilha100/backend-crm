from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float
from datetime import datetime

from app.database import Base


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)

    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    previous_opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)

    status = Column(String, default="novo", nullable=False)
    source = Column(String, nullable=True)

    lead_type = Column(String, default="contato")
    item_name = Column(String, nullable=True)
    item_code = Column(String, nullable=True)
    page_url = Column(String, nullable=True)

    message = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    assigned_to = Column(String, nullable=True)

    is_repurchase = Column(Boolean, default=False)
    had_previous_purchase = Column(Boolean, default=False)

    reentry_count = Column(Integer, default=0)

    # ── Valor do negócio ──────────────────────────────────────────────────────
    value = Column(Float, nullable=True)

    # ── Fluxo de perda / cadência ─────────────────────────────────────────────
    lost_reason = Column(String, nullable=True)
    lost_observation = Column(String, nullable=True)
    is_recoverable = Column(Boolean, nullable=True)
    lost_at = Column(DateTime, nullable=True)
    follow_up_at = Column(DateTime, nullable=True)
    archived = Column(Boolean, default=False)

    # ── SLA / score (base para cálculo na leitura) ────────────────────────────
    last_interaction_at = Column(DateTime, default=datetime.now)
    stage_changed_at = Column(DateTime, default=datetime.now)

    # ── Pipeline de pós-venda ─────────────────────────────────────────────────
    post_sale_stage = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.now)