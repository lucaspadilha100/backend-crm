from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional


class LeadStatus(str, Enum):
    novo = "novo"
    contato = "contato"
    proposta = "proposta"
    fechado = "fechado"
    perdido = "perdido"


class LeadSource(str, Enum):
    manual = "manual"
    site = "site"
    instagram = "instagram"
    facebook = "facebook"
    whatsapp = "whatsapp"
    indicacao = "indicacao"


class LeadType(str, Enum):
    contato = "contato"
    produto = "produto"
    imovel = "imovel"
    servico = "servico"
    orcamento = "orcamento"


class LeadCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[LeadSource] = LeadSource.manual

    lead_type: Optional[LeadType] = LeadType.contato
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    page_url: Optional[str] = None
    message: Optional[str] = None


class LeadUpdate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[LeadSource] = None

    lead_type: Optional[LeadType] = None
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    page_url: Optional[str] = None
    message: Optional[str] = None


class LeadUpdateStatus(BaseModel):
    status: LeadStatus


class LeadResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[LeadSource] = None

    lead_type: Optional[LeadType] = None
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    page_url: Optional[str] = None
    message: Optional[str] = None

    status: LeadStatus
    created_at: datetime

    class Config:
        from_attributes = True