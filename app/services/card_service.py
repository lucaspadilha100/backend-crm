"""Monta cards enriquecidos (oportunidade + contato) com uma única consulta
extra de contatos, evitando N+1 no kanban."""

from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.schemas.opportunity import OpportunityResponse, BoardCard
from app.schemas.contact import ContactBrief


def to_cards(db: Session, opportunities: list) -> list[BoardCard]:
    contact_ids = {o.contact_id for o in opportunities}
    contacts = {}
    if contact_ids:
        contacts = {
            c.id: c
            for c in db.query(Contact).filter(Contact.id.in_(contact_ids)).all()
        }

    cards: list[BoardCard] = []
    for opp in opportunities:
        contact = contacts.get(opp.contact_id)
        if contact is None:
            continue
        cards.append(
            BoardCard(
                opportunity=OpportunityResponse.model_validate(opp),
                contact=ContactBrief.model_validate(contact),
            )
        )
    return cards
