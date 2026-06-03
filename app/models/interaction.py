from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from app.database import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)

    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=False)

    type = Column(String, nullable=False)
    notes = Column(String, nullable=True)

    user = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.now)