from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base

from app.models.contact import Contact
from app.models.opportunity import Opportunity
from app.models.interaction import Interaction

from app.routes import opportunities, interactions, contacts

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(opportunities.router)
app.include_router(interactions.router)
app.include_router(contacts.router)


@app.get("/")
def root():
    return {"status": "ok"}