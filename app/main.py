import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.db_migrate import ensure_schema

from app.models import contact, opportunity, interaction  # noqa: F401 — garante criação das tabelas

from app.routes import opportunities, interactions, contacts, dashboard

app = FastAPI(
    title="CRM API",
    description="Backend CRM de recuperação de leads (FastAPI + Supabase)",
    version="1.1.0",
)

# Cria tabelas que não existem e adiciona colunas novas em tabelas existentes.
Base.metadata.create_all(bind=engine)
ensure_schema(engine)

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


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "CRM API funcionando."}
