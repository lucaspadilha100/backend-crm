"""Migração leve e idempotente.

O schema nasce via ``Base.metadata.create_all`` (cria tabelas novas com todas as
colunas). Para bancos já existentes, este módulo adiciona as colunas que faltam
via ``ALTER TABLE ADD COLUMN`` — sem remover nada e sem tocar em dados.

Funciona tanto em Postgres (Supabase) quanto em SQLite, escolhendo os tipos
corretos por dialeto. Em produção, pode ser substituído por Alembic.
"""

from sqlalchemy import inspect, text


# tabela -> { coluna: tipo lógico }
ADDITIONS = {
    "opportunities": {
        "value": "float",
        "lost_reason": "string",
        "lost_observation": "string",
        "is_recoverable": "bool",
        "lost_at": "datetime",
        "follow_up_at": "datetime",
        "archived": "bool_default_false",
        "last_interaction_at": "datetime",
        "stage_changed_at": "datetime",
        "post_sale_stage": "string",
    },
    "interactions": {
        "user": "string",
    },
}

# tipo lógico -> DDL por dialeto
TYPE_MAP = {
    "postgresql": {
        "float": "DOUBLE PRECISION",
        "string": "VARCHAR",
        "bool": "BOOLEAN",
        "bool_default_false": "BOOLEAN DEFAULT FALSE",
        "datetime": "TIMESTAMP",
    },
    "sqlite": {
        "float": "FLOAT",
        "string": "VARCHAR",
        "bool": "BOOLEAN",
        "bool_default_false": "BOOLEAN DEFAULT 0",
        "datetime": "DATETIME",
    },
}


def _ddl_for(dialect: str, logical_type: str) -> str:
    mapping = TYPE_MAP.get(dialect, TYPE_MAP["sqlite"])
    return mapping.get(logical_type, "VARCHAR")


def ensure_schema(engine) -> None:
    dialect = engine.dialect.name
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table, columns in ADDITIONS.items():
            if table not in existing_tables:
                continue  # create_all já criou a tabela completa
            existing_columns = {col["name"] for col in inspector.get_columns(table)}
            for column, logical_type in columns.items():
                if column not in existing_columns:
                    ddl = _ddl_for(dialect, logical_type)
                    conn.execute(
                        text(f'ALTER TABLE {table} ADD COLUMN "{column}" {ddl}')
                    )
