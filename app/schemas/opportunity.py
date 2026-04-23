from pydantic import BaseModel, model_validator
from datetime import datetime
from enum import Enum
from typing import Optional


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


class OpportunityCreate(BaseModel):
    name: str
    email: Optional[str] = None
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

    created_at: datetime

    class Config:
        from_attributes = True