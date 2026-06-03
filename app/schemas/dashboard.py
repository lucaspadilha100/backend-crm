from pydantic import BaseModel
from typing import Optional

from app.schemas.opportunity import OpportunityResponse
from app.schemas.contact import ContactResponse


class LostReasonCount(BaseModel):
    reason: str
    count: int


class StageCount(BaseModel):
    status: str
    count: int


class DashboardMetrics(BaseModel):
    leads_received: int
    active_opportunities: int
    won_opportunities: int
    lost_opportunities: int
    conversion_rate: float          # ganhas / (ganhas + perdidas)
    lost_reasons: list[LostReasonCount]
    in_cadence: int                 # perdidos recuperáveis com follow-up agendado
    without_responsible: int        # ativas sem responsável
    without_recent_interaction: int # ativas paradas (>2 dias sem interação)
    pipeline_value: float           # soma de valor das oportunidades ativas
    won_value: float                # soma de valor das oportunidades fechadas
    stage_counts: list[StageCount]  # contagem por etapa (funil)


class ContactSummary(BaseModel):
    contact: ContactResponse
    total_opportunities: int
    purchases: int                  # oportunidades fechadas
    total_value: float              # soma do valor das fechadas
    reentries: int                  # soma de reentry_count
    is_returning: bool              # já comprou alguma vez
    current_status: Optional[str] = None  # status da oportunidade ativa, se houver
    opportunities: list[OpportunityResponse] = []
    upcoming_cadences: list[OpportunityResponse] = []  # follow-ups futuros
