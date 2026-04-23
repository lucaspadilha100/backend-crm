from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    source = Column(String, nullable=True, default="manual")

    lead_type = Column(String, nullable=True, default="contato")
    item_name = Column(String, nullable=True)
    item_code = Column(String, nullable=True)
    page_url = Column(String, nullable=True)
    message = Column(String, nullable=True)

    status = Column(String, nullable=False, default="novo")
    created_at = Column(DateTime, default=datetime.now)