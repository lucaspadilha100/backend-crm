import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base, SessionLocal
from app.db_migrate import ensure_schema

from app.models import contact, opportunity, interaction, pipeline  # noqa: F401 — garante criação das tabelas

from app.routes import opportunities, interactions, contacts, dashboard, pipelines
from app.services.pipeline_service import seed_defaults

app = FastAPI(
    title="CRM API",
    description="Backend CRM de recuperação de leads (FastAPI + Supabase)",
    version="1.1.0",
)

# Inicialização do schema protegida: nunca derruba a aplicação no boot.
# Em serverless (Vercel), um erro de banco no import causaria FUNCTION_INVOCATION_FAILED;
# aqui capturamos o erro e o expomos em /db-check para diagnóstico.
DB_INIT_ERROR = None


def init_db():
    global DB_INIT_ERROR
    try:
        Base.metadata.create_all(bind=engine)
        ensure_schema(engine)
        # Cria os funis padrão (Vendas / Pós-venda) na primeira execução.
        db = SessionLocal()
        try:
            seed_defaults(db)
        finally:
            db.close()
        DB_INIT_ERROR = None
    except Exception as exc:  # noqa: BLE001
        DB_INIT_ERROR = f"{type(exc).__name__}: {exc}"
    return DB_INIT_ERROR


init_db()

# Origens liberadas no CORS. Defina CORS_ORIGINS (separado por vírgula) com a URL
# do frontend na Vercel em produção; "*" por padrão para desenvolvimento.
_origins_env = os.getenv("CORS_ORIGINS", "*")
allow_origins = [o.strip() for o in _origins_env.split(",")] if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    # credentials só pode ser True com origens explícitas (regra do CORS).
    allow_credentials=allow_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
app.include_router(opportunities.router, prefix="/opportunities", tags=["Opportunities"])
app.include_router(interactions.router, tags=["Interactions"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(pipelines.router, prefix="/pipelines", tags=["Pipelines"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "CRM API funcionando."}


@app.get("/db-check", tags=["Health"])
def db_check():
    """Diagnóstico de conexão com o banco. Mostra o erro real, se houver."""
    try:
        with engine.connect() as conn:
            conn.execute(text("select 1"))
        # Tenta (re)inicializar o schema caso tenha falhado antes.
        init_error = DB_INIT_ERROR if DB_INIT_ERROR is None else init_db()
        return {
            "db": "ok",
            "dialect": engine.dialect.name,
            "schema_init_error": init_error,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "db": "fail",
            "dialect": engine.dialect.name,
            "error": f"{type(exc).__name__}: {exc}",
            "schema_init_error": DB_INIT_ERROR,
        }
