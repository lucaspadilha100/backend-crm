"""Motor de funis configuráveis (v2).

- Faz o seed dos funis padrão (Vendas e Pós-venda) na primeira execução.
- Mantém o campo legado ``status`` sincronizado a partir da etapa, para que toda
  a lógica existente (scoring, dashboard, cadência) continue funcionando.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.pipeline import Pipeline, Stage
from app.models.opportunity import Opportunity


# Funis padrão (criados uma única vez)
DEFAULT_PIPELINES = [
    {
        "name": "Vendas",
        "color": "#4f46e5",
        "is_default": True,
        "stages": [
            ("Novo", "open", "#6366f1", "novo"),
            ("Em contato", "open", "#0ea5e9", "contato"),
            ("Proposta", "open", "#8b5cf6", "proposta"),
            ("Visita agendada", "open", "#f59e0b", "visita_agendada"),
            ("Negociação", "open", "#ec4899", "negociacao"),
            ("Fechado", "won", "#16a34a", "fechado"),
            ("Perdido", "lost", "#dc2626", "perdido"),
        ],
    },
    {
        "name": "Pós-venda",
        "color": "#0ea5e9",
        "is_default": False,
        "stages": [
            ("Produção", "open", "#6366f1", None),
            ("Separação", "open", "#0ea5e9", None),
            ("Envio", "open", "#f59e0b", None),
            ("Entregue", "open", "#14b8a6", None),
            ("Pós-venda", "open", "#8b5cf6", None),
            ("Concluído", "won", "#16a34a", None),
        ],
    },
]

# Etapas criadas ao adicionar um funil custom novo
GENERIC_STAGES = [
    ("Novo", "open", "#6366f1", None),
    ("Em andamento", "open", "#f59e0b", None),
    ("Ganho", "won", "#16a34a", None),
    ("Perdido", "lost", "#dc2626", None),
]


def status_for_stage(stage: Stage) -> str:
    """Deriva o status legado a partir da etapa."""
    if stage.category == "won":
        return "fechado"
    if stage.category == "lost":
        return "perdido"
    return stage.status_key or "novo"


def seed_defaults(db: Session) -> None:
    if db.query(Pipeline).count() > 0:
        return
    for p_index, p in enumerate(DEFAULT_PIPELINES):
        pipeline = Pipeline(
            name=p["name"], color=p["color"], is_default=p["is_default"], position=p_index
        )
        db.add(pipeline)
        db.flush()  # garante pipeline.id
        for s_index, (name, category, color, status_key) in enumerate(p["stages"]):
            db.add(
                Stage(
                    pipeline_id=pipeline.id,
                    name=name,
                    category=category,
                    color=color,
                    status_key=status_key,
                    position=s_index,
                )
            )
    db.commit()

    # Migra oportunidades pré-existentes (sem funil) para o funil Vendas.
    backfill_opportunities(db)


def backfill_opportunities(db: Session) -> None:
    default = get_default_pipeline(db)
    if not default:
        return
    stages = db.query(Stage).filter(Stage.pipeline_id == default.id).all()
    by_status = {s.status_key: s for s in stages if s.status_key}
    first_open = next((s for s in sorted(stages, key=lambda x: x.position) if s.category == "open"), None)

    orphans = db.query(Opportunity).filter(Opportunity.stage_id.is_(None)).all()
    for opp in orphans:
        stage = by_status.get(opp.status) or first_open
        if stage:
            opp.pipeline_id = default.id
            opp.stage_id = stage.id
    if orphans:
        db.commit()


def get_default_pipeline(db: Session) -> Pipeline:
    return (
        db.query(Pipeline)
        .order_by(Pipeline.is_default.desc(), Pipeline.position.asc())
        .first()
    )


def first_stage(db: Session, pipeline_id: int, category: str = "open") -> Stage:
    return (
        db.query(Stage)
        .filter(Stage.pipeline_id == pipeline_id, Stage.category == category)
        .order_by(Stage.position.asc())
        .first()
    )


def apply_stage(db: Session, opp: Opportunity, stage: Stage) -> None:
    """Move a oportunidade para uma etapa e sincroniza os campos derivados."""
    now = datetime.now()
    opp.pipeline_id = stage.pipeline_id
    opp.stage_id = stage.id
    opp.status = status_for_stage(stage)
    opp.stage_changed_at = now
    opp.last_interaction_at = now
    if stage.category == "won" and opp.won_at is None:
        opp.won_at = now
