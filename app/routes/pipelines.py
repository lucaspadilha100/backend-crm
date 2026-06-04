from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.pipeline import Pipeline, Stage
from app.models.opportunity import Opportunity
from app.schemas.pipeline import (
    PipelineResponse,
    PipelineCreate,
    PipelineUpdate,
    StageResponse,
    StageCreate,
    StageUpdate,
    ReorderRequest,
)
from app.services.pipeline_service import GENERIC_STAGES

router = APIRouter()


def _pipeline_with_stages(db: Session, pipeline: Pipeline) -> PipelineResponse:
    stages = (
        db.query(Stage)
        .filter(Stage.pipeline_id == pipeline.id)
        .order_by(Stage.position.asc())
        .all()
    )
    resp = PipelineResponse.model_validate(pipeline)
    resp.stages = [StageResponse.model_validate(s) for s in stages]
    return resp


@router.get("", response_model=list[PipelineResponse])
def list_pipelines(db: Session = Depends(get_db)):
    pipelines = db.query(Pipeline).order_by(Pipeline.position.asc()).all()
    return [_pipeline_with_stages(db, p) for p in pipelines]


@router.post("", response_model=PipelineResponse)
def create_pipeline(data: PipelineCreate, db: Session = Depends(get_db)):
    max_pos = db.query(Pipeline).count()
    pipeline = Pipeline(name=data.name, color=data.color, position=max_pos, is_default=False)
    db.add(pipeline)
    db.flush()
    if data.seed_default_stages:
        for i, (name, category, color, status_key) in enumerate(GENERIC_STAGES):
            db.add(Stage(pipeline_id=pipeline.id, name=name, category=category, color=color, status_key=status_key, position=i))
    db.commit()
    db.refresh(pipeline)
    return _pipeline_with_stages(db, pipeline)


@router.put("/reorder", response_model=list[PipelineResponse])
def reorder_pipelines(data: ReorderRequest, db: Session = Depends(get_db)):
    for pos, pid in enumerate(data.ids):
        p = db.query(Pipeline).filter(Pipeline.id == pid).first()
        if p:
            p.position = pos
    db.commit()
    return list_pipelines(db)


@router.put("/{pipeline_id}", response_model=PipelineResponse)
def update_pipeline(pipeline_id: int, data: PipelineUpdate, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")
    if data.name is not None:
        pipeline.name = data.name
    if data.color is not None:
        pipeline.color = data.color
    if data.position is not None:
        pipeline.position = data.position
    db.commit()
    db.refresh(pipeline)
    return _pipeline_with_stages(db, pipeline)


@router.delete("/{pipeline_id}")
def delete_pipeline(pipeline_id: int, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")
    if db.query(Pipeline).count() <= 1:
        raise HTTPException(status_code=400, detail="Não é possível excluir o único funil.")
    in_use = db.query(Opportunity).filter(Opportunity.pipeline_id == pipeline_id).count()
    if in_use:
        raise HTTPException(status_code=400, detail=f"O funil tem {in_use} negócio(s). Mova-os antes de excluir.")
    db.query(Stage).filter(Stage.pipeline_id == pipeline_id).delete()
    db.delete(pipeline)
    db.commit()
    return {"deleted": True}


# ── Stages ────────────────────────────────────────────────────────────────────
@router.post("/{pipeline_id}/stages", response_model=StageResponse)
def create_stage(pipeline_id: int, data: StageCreate, db: Session = Depends(get_db)):
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")
    position = data.position if data.position is not None else db.query(Stage).filter(Stage.pipeline_id == pipeline_id).count()
    stage = Stage(
        pipeline_id=pipeline_id,
        name=data.name,
        category=data.category.value,
        color=data.color,
        position=position,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.put("/stages/{stage_id}", response_model=StageResponse)
def update_stage(stage_id: int, data: StageUpdate, db: Session = Depends(get_db)):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Etapa não encontrada.")
    if data.name is not None:
        stage.name = data.name
    if data.category is not None:
        stage.category = data.category.value
    if data.color is not None:
        stage.color = data.color
    if data.position is not None:
        stage.position = data.position
    db.commit()
    db.refresh(stage)
    return stage


@router.put("/{pipeline_id}/stages/reorder", response_model=list[StageResponse])
def reorder_stages(pipeline_id: int, data: ReorderRequest, db: Session = Depends(get_db)):
    for pos, sid in enumerate(data.ids):
        s = db.query(Stage).filter(Stage.id == sid, Stage.pipeline_id == pipeline_id).first()
        if s:
            s.position = pos
    db.commit()
    return (
        db.query(Stage)
        .filter(Stage.pipeline_id == pipeline_id)
        .order_by(Stage.position.asc())
        .all()
    )


@router.delete("/stages/{stage_id}")
def delete_stage(stage_id: int, db: Session = Depends(get_db)):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Etapa não encontrada.")
    in_use = db.query(Opportunity).filter(Opportunity.stage_id == stage_id).count()
    if in_use:
        raise HTTPException(status_code=400, detail=f"A etapa tem {in_use} negócio(s). Mova-os antes de excluir.")
    remaining = db.query(Stage).filter(Stage.pipeline_id == stage.pipeline_id).count()
    if remaining <= 1:
        raise HTTPException(status_code=400, detail="O funil precisa ter ao menos uma etapa.")
    db.delete(stage)
    db.commit()
    return {"deleted": True}
