"""Cálculo de score de lead e SLA de "lead parado".

Funções puras que recebem valores simples — assim podem ser chamadas tanto a
partir de objetos ORM quanto a partir dos schemas de resposta (computed fields),
sem criar dependência circular com a camada de schemas.
"""

from datetime import datetime
from typing import Optional


ACTIVE_STATUSES = {"novo", "contato", "proposta", "visita_agendada", "negociacao"}
ADVANCED_STATUSES = {"proposta", "visita_agendada", "negociacao"}


def _as_str(status) -> str:
    """Aceita enum (str) ou string crua."""
    return getattr(status, "value", status)


def days_since(dt: Optional[datetime]) -> Optional[int]:
    if not dt:
        return None
    delta = datetime.now() - dt
    return max(delta.days, 0)


def stall_level(status, last_interaction_at: Optional[datetime]) -> str:
    """ok / warning (>2d) / danger (>5d). Só vale para oportunidades ativas."""
    if _as_str(status) not in ACTIVE_STATUSES:
        return "ok"
    days = days_since(last_interaction_at)
    if days is None:
        return "ok"
    if days > 5:
        return "danger"
    if days >= 2:
        return "warning"
    return "ok"


def lead_score(status, last_interaction_at: Optional[datetime]) -> str:
    """quente / morno / frio com base em atividade recente e estágio."""
    status_str = _as_str(status)
    if status_str not in ACTIVE_STATUSES:
        return "frio"

    days = days_since(last_interaction_at)
    advanced = status_str in ADVANCED_STATUSES

    if days is None:
        return "morno"
    if days <= 1:
        return "quente" if advanced else "morno"
    if days <= 2:
        return "morno"
    if days <= 5:
        return "morno" if advanced else "frio"
    return "frio"
