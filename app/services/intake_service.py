from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.opportunity import Opportunity
from app.models.interaction import Interaction


ACTIVE_STATUSES = ["novo", "contato", "proposta", "visita_agendada", "negociacao"]


def find_contact(db: Session, email: str, phone: str):
    if email:
        contact = db.query(Contact).filter(Contact.email == email).first()
        if contact:
            return contact

    if phone:
        contact = db.query(Contact).filter(Contact.phone == phone).first()
        if contact:
            return contact

    return None


def get_active_opportunity(db: Session, contact_id: int):
    return (
        db.query(Opportunity)
        .filter(Opportunity.contact_id == contact_id)
        .filter(Opportunity.status.in_(ACTIVE_STATUSES))
        .order_by(Opportunity.created_at.desc())
        .first()
    )


def get_last_opportunity(db: Session, contact_id: int):
    return (
        db.query(Opportunity)
        .filter(Opportunity.contact_id == contact_id)
        .order_by(Opportunity.created_at.desc())
        .first()
    )


def had_previous_purchase(db: Session, contact_id: int):
    purchase = (
        db.query(Opportunity)
        .filter(Opportunity.contact_id == contact_id)
        .filter(Opportunity.status == "fechado")
        .first()
    )
    return purchase is not None


def create_system_interaction(db: Session, opportunity_id: int, interaction_type: str, notes: str):
    interaction = Interaction(
        opportunity_id=opportunity_id,
        type=interaction_type,
        notes=notes
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def intake_lead(db: Session, data):
    contact = find_contact(db, data.email, data.phone)

    # NOVO CONTATO
    if not contact:
        contact = Contact(
            name=data.name,
            email=data.email,
            phone=data.phone,
            company=data.company
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)

        opportunity = Opportunity(
            contact_id=contact.id,
            source=data.source.value if data.source else "manual",
            lead_type=data.lead_type.value if data.lead_type else "contato",
            item_name=data.item_name,
            item_code=data.item_code,
            page_url=data.page_url,
            message=data.message,
            status="novo",
            is_repurchase=False,
            had_previous_purchase=False,
            reentry_count=0
        )
        db.add(opportunity)
        db.commit()
        db.refresh(opportunity)

        create_system_interaction(
            db,
            opportunity.id,
            "sistema",
            "Opportunity criada a partir de novo contato."
        )

        return opportunity

    # Atualiza dados básicos do contato se vierem preenchidos
    if data.name:
        contact.name = data.name
    if data.email:
        contact.email = data.email
    if data.phone:
        contact.phone = data.phone
    if data.company:
        contact.company = data.company

    db.commit()
    db.refresh(contact)

    active_opportunity = get_active_opportunity(db, contact.id)

    # CASO 1 — REAPROVEITA CARD ATIVO
    if active_opportunity:
        active_opportunity.reentry_count += 1

        if data.source:
            active_opportunity.source = data.source.value
        if data.lead_type:
            active_opportunity.lead_type = data.lead_type.value
        if data.item_name:
            active_opportunity.item_name = data.item_name
        if data.item_code:
            active_opportunity.item_code = data.item_code
        if data.page_url:
            active_opportunity.page_url = data.page_url
        if data.message:
            active_opportunity.message = data.message

        db.commit()
        db.refresh(active_opportunity)

        create_system_interaction(
            db,
            active_opportunity.id,
            "reentrada",
            f"Reentrada detectada via {active_opportunity.source or 'manual'}."
        )

        return active_opportunity

    # CASO 2 — CRIA NOVO CARD
    last_opportunity = get_last_opportunity(db, contact.id)
    previous_purchase = had_previous_purchase(db, contact.id)

    opportunity = Opportunity(
        contact_id=contact.id,
        previous_opportunity_id=last_opportunity.id if last_opportunity else None,
        source=data.source.value if data.source else "manual",
        lead_type=data.lead_type.value if data.lead_type else "contato",
        item_name=data.item_name,
        item_code=data.item_code,
        page_url=data.page_url,
        message=data.message,
        status="novo",
        is_repurchase=previous_purchase,
        had_previous_purchase=previous_purchase,
        reentry_count=0
    )

    db.add(opportunity)
    db.commit()
    db.refresh(opportunity)

    previous_status = last_opportunity.status if last_opportunity else "nenhum"

    create_system_interaction(
        db,
        opportunity.id,
        "sistema",
        f"Nova opportunity criada para contato existente. Último status conhecido: {previous_status}."
    )

    return opportunity