def on_lead_created(lead):
    print(f"[AUTOMACAO] Novo lead criado: {lead.name} - {lead.email}")

    # Aqui vai entrar:
    # envio de WhatsApp
    # integração com n8n
    # disparo de e-mail

    return True