from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from datetime import datetime

from app.database import Base


class Pipeline(Base):
    """Funil configurável (ex.: Vendas, Produção, Logística)."""
    __tablename__ = "pipelines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    position = Column(Integer, default=0)
    color = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)


class Stage(Base):
    """Etapa de um funil. category controla a semântica: open/won/lost."""
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    position = Column(Integer, default=0)
    color = Column(String, nullable=True)
    category = Column(String, default="open")  # open | won | lost
    # Mapeia etapas do funil padrão para o enum de status legado (compat).
    status_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
