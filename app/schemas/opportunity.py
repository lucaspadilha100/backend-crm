from pydantic import BaseModel, EmailStr, model_validator, computed_field
from datetime import datetime
from enum import Enum
from typing import Optional

from app.schemas.contact import ContactResponse, ContactBrief
from app.schemas.interaction import InteractionResponse
from app.services import scoring


class OpportunityStatus(str, Enum):
    novo = "novo"
    contato = "contato"
    proposta = "proposta"
    visita_agendada = "visita_agendada"
    negociacao = "negociacao"
    fechado = "fechado"
    perdido = "perdido"


class OpportunitySource(str, Enum):
    manual = "manual"
    site = "site"
    instagram = "instagram"
    facebook = "facebook"
    whatsapp = "whatsapp"
    indicacao = "indicacao"


class OpportunityLeadType(str, Enum):
    contato = "contato"
    produto = "produto"
    imovel = "imovel"
    servico = "servico"
    orcamento = "orcamento"


class LostReason(str, Enum):
    preco = "preco"
    concorrente = "concorrente"
    sem_resposta = "sem_resposta"
    timing = "timing"
    sem_orcamento = "sem_orcamento"
    sem_interesse = "sem_interesse"
    curioso = "curioso"
    outro = "outro"


class PostSaleStage(str, Enum):
    producao = "producao"
    separacao = "separacao"
    envio = "envio"
    entregue = "entregue"
    pos_venda = "pos_venda"
    concluido = "concluido"


class LeadScore(str, Enum):
    quente = "quente"
    morno = "morno"
    frio = "frio"


class StallLevel(str, Enum):
    ok = "ok"
    warning = "warning"
    danger = "danger"


# ── Requests ──────────────────────────────────────────────────────────────────

class OpportunityCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None

    source: Optional[OpportunitySource] = OpportunitySource.manual
    lead_type: Optional[OpportunityLeadType] = OpportunityLeadType.contato
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    page_url: Optional[str] = None
    message: Optional[str] = None

    @model_validator(mode="after")
    def validate_contact_fields(self):
        if not self.email and not self.phone:
            raise ValueError("Informe pelo menos email ou telefone.")
        return self


class OpportunityStatusUpdate(BaseModel):
    status: OpportunityStatus


class OpportunityNotesUpdate(BaseModel):
    notes: Optional[str] = None


class OpportunityAssignUpdate(BaseModel):
    assigned_to: Optional[str] = None


class OpportunityValueUpdate(BaseModel):
    value: Optional[float] = None


class OpportunityLoseRequest(BaseModel):
    reason: LostReason
    observation: Optional[str] = None
    is_recoverable: bool = True
    follow_up_at: Optional[datetime] = None


class OpportunityReactivateRequest(BaseModel):
    status: OpportunityStatus = OpportunityStatus.novo
    notes: Optional[str] = None


class PostSaleStageUpdate(BaseModel):
    post_sale_stage: PostSaleStage


# ── Responses ─────────────────────────────────────────────────────────────────

class OpportunityResponse(BaseModel):
    id: int
    contact_id: int
    previous_opportunity_id: Optional[int] = None

    status: OpportunityStatus
    source: Optional[OpportunitySource] = None
    lead_type: Optional[OpportunityLeadType] = None

    item_name: Optional[str] = None
    item_code: Optional[str] = None
    page_url: Optional[str] = None

    message: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

    is_repurchase: bool
    had_previous_purchase: bool
    reentry_count: int

    value: Optional[float] = None

    lost_reason: Optional[LostReason] = None
    lost_observation: Optional[str] = None
    is_recoverable: Optional[bool] = None
    lost_at: Optional[datetime] = None
    follow_up_at: Optional[datetime] = None
    archived: Optional[bool] = False

    post_sale_stage: Optional[PostSaleStage] = None

    last_interaction_at: Optional[datetime] = None
    stage_changed_at: Optional[datetime] = None

    created_at: datetime

    # ── Campos calculados (não persistidos) ──────────────────────────────────
    @computed_field
    @property
    def score(self) -> LeadScore:
        return LeadScore(scoring.lead_score(self.status, self.last_interaction_at))

    @computed_field
    @property
    def stall_level(self) -> StallLevel:
        return StallLevel(scoring.stall_level(self.status, self.last_interaction_at))

    @computed_field
    @property
    def days_since_interaction(self) -> Optional[int]:
        return scoring.days_since(self.last_interaction_at)

    @computed_field
    @property
    def days_in_stage(self) -> Optional[int]:
        return scoring.days_since(self.stage_changed_at)

    class Config:
        from_attributes = True


class OpportunityDetailResponse(BaseModel):
    opportunity: OpportunityResponse
    contact: ContactResponse
    previous_opportunity: Optional[OpportunityResponse] = None
    interactions: list[InteractionResponse] = []


class BoardCard(BaseModel):
    """Card enriquecido para o kanban: oportunidade + contato em uma só chamada."""
    opportunity: OpportunityResponse
    contact: ContactBrief
