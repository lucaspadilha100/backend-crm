from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base

from app.models import contact, opportunity, interaction  # noqa: F401 — garante criação das tabelas

from app.routes import opportunities, interactions, contacts

app = FastAPI(
    title="CRM API",
    description="Backend CRM com FastAPI + SQLite",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
app.include_router(opportunities.router, prefix="/opportunities", tags=["Opportunities"])
app.include_router(interactions.router, tags=["Interactions"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "CRM API funcionando."}