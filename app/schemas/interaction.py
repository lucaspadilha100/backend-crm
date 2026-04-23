from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional


class InteractionType(str, Enum):
    ligacao = "ligacao"
    whatsapp = "whatsapp"
    email = "email"
    reuniao = "reuniao"
    observacao = "observacao"
    reentrada = "reentrada"
    sistema = "sistema"


class InteractionCreate(BaseModel):
    opportunity_id: int
    type: InteractionType
    notes: Optional[str] = None


class InteractionResponse(BaseModel):
    id: int
    opportunity_id: int
    type: InteractionType
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True