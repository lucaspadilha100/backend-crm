from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional


class StageCategory(str, Enum):
    open = "open"
    won = "won"
    lost = "lost"


# ── Stage ─────────────────────────────────────────────────────────────────────
class StageResponse(BaseModel):
    id: int
    pipeline_id: int
    name: str
    position: int
    color: Optional[str] = None
    category: StageCategory
    created_at: datetime

    class Config:
        from_attributes = True


class StageCreate(BaseModel):
    name: str
    category: StageCategory = StageCategory.open
    color: Optional[str] = None
    position: Optional[int] = None


class StageUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[StageCategory] = None
    color: Optional[str] = None
    position: Optional[int] = None


# ── Pipeline ──────────────────────────────────────────────────────────────────
class PipelineResponse(BaseModel):
    id: int
    name: str
    position: int
    color: Optional[str] = None
    is_default: bool
    created_at: datetime
    stages: list[StageResponse] = []

    class Config:
        from_attributes = True


class PipelineCreate(BaseModel):
    name: str
    color: Optional[str] = None
    # Se omitido, cria um conjunto de etapas padrão (Novo / Em andamento / Ganho / Perdido).
    seed_default_stages: bool = True


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    position: Optional[int] = None


class ReorderRequest(BaseModel):
    # lista de ids na nova ordem
    ids: list[int]


class MoveOpportunityRequest(BaseModel):
    stage_id: int
