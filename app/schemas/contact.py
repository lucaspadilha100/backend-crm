from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True