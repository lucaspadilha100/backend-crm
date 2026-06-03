from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class ContactCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ContactBrief(BaseModel):
    """Dados mínimos do contato exibidos no card do kanban."""
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None

    class Config:
        from_attributes = True