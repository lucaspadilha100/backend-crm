"""Smoke test de integração da Fase 1 — exercita os fluxos reais via TestClient.
Não faz parte do app; roda só para validação manual."""
import os
os.environ.pop("DATABASE_URL", None)  # força SQLite local de teste
import datetime as dt
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
ok = lambda r: (_ for _ in ()).throw(AssertionError(f"{r.status_code} {r.text}")) if r.status_code >= 400 else r.json()

print("health:", c.get("/").json())

# 1. Intake de lead novo
o1 = ok(c.post("/opportunities/intake", json={
    "name": "Maria Silva", "phone": "11999990000", "email": "maria@ex.com",
    "source": "instagram", "lead_type": "produto", "item_name": "Sofá 3 lugares",
    "message": "Tenho interesse"}))
print("intake novo -> id", o1["id"], "| status", o1["status"], "| score", o1["score"], "| stall", o1["stall_level"])
assert o1["status"] == "novo" and o1["score"] in ("quente","morno","frio")

# 2. Reentrada (mesmo contato, card ativo)
o2 = ok(c.post("/opportunities/intake", json={"name":"Maria Silva","phone":"11999990000","source":"whatsapp"}))
assert o2["id"] == o1["id"] and o2["reentry_count"] == 1, o2
print("reentrada -> reentry_count", o2["reentry_count"])

# 3. Board enriquecido (card com contato)
board = ok(c.get("/opportunities/board"))
assert len(board) >= 1 and board[0]["contact"]["name"] == "Maria Silva", board
print("board -> card contato:", board[0]["contact"]["name"], "| tel:", board[0]["contact"]["phone"])

# 4. Avançar etapa
ok(c.put(f"/opportunities/{o1['id']}/status", json={"status":"proposta"}))
# 5. Valor
ok(c.put(f"/opportunities/{o1['id']}/value", json={"value": 3500.0}))

# 6. Interação com usuário e tipo novo (visita)
inter = ok(c.post("/interactions", json={"opportunity_id":o1["id"],"type":"visita","notes":"Foi na loja","user":"vendedor1"}))
assert inter["user"] == "vendedor1" and inter["type"] == "visita"
print("interacao visita por", inter["user"])

# 7. Fluxo de perda RECUPERÁVEL com follow-up
lead_b = ok(c.post("/opportunities/intake", json={"name":"João","phone":"11888880000","source":"site"}))
future = (dt.datetime.now() - dt.timedelta(days=1)).isoformat()  # ontem -> aparece em reativar hoje
lost = ok(c.put(f"/opportunities/{lead_b['id']}/lose", json={
    "reason":"preco","observation":"achou caro","is_recoverable":True,"follow_up_at":future}))
assert lost["status"]=="perdido" and lost["is_recoverable"] and lost["lost_reason"]=="preco", lost
print("perda recuperavel -> reason", lost["lost_reason"], "| recoverable", lost["is_recoverable"])

# 8. Fila de reativação (deve conter o lead B)
react = ok(c.get("/opportunities/reactivation"))
assert any(card["opportunity"]["id"]==lead_b["id"] for card in react), react
print("reativacao hoje ->", len(react), "lead(s)")

# 9. Reativar
re = ok(c.post(f"/opportunities/{lead_b['id']}/reactivate", json={"status":"novo"}))
assert re["status"]=="novo" and re["lost_reason"] is None, re
print("reativado -> status", re["status"])

# 10. Perda DESCARTADA (arquiva)
lead_c = ok(c.post("/opportunities/intake", json={"name":"Spam","phone":"11777770000"}))
disc = ok(c.put(f"/opportunities/{lead_c['id']}/lose", json={"reason":"curioso","is_recoverable":False}))
assert disc["archived"] is True, disc
print("descartado -> archived", disc["archived"])
# board não deve mostrar arquivado
board2 = ok(c.get("/opportunities/board"))
assert all(card["opportunity"]["id"]!=lead_c["id"] for card in board2)
print("board esconde descartado: OK")

# 11. Fechar -> pos-venda automatico
ok(c.put(f"/opportunities/{o1['id']}/status", json={"status":"fechado"}))
closed = ok(c.get(f"/opportunities/{o1['id']}"))
assert closed["post_sale_stage"]=="producao", closed
print("fechado -> post_sale_stage", closed["post_sale_stage"])
# mover pos-venda
ok(c.put(f"/opportunities/{o1['id']}/post-sale-stage", json={"post_sale_stage":"envio"}))
print("pos-venda movido para envio: OK")

# 12. Dashboard
dash = ok(c.get("/dashboard/metrics"))
print("dashboard ->", {k:dash[k] for k in ("leads_received","active_opportunities","won_opportunities","lost_opportunities","conversion_rate","in_cadence")})
assert dash["won_opportunities"]>=1

# 13. Resumo do cliente (visao 360)
summ = ok(c.get(f"/contacts/{o1['contact_id']}/summary"))
print("summary -> purchases", summ["purchases"], "| total_value", summ["total_value"], "| is_returning", summ["is_returning"])
assert summ["purchases"]>=1 and summ["total_value"]==3500.0

# 14. Filtros novos
f1 = ok(c.get("/opportunities?unassigned=true"))
f2 = ok(c.get("/opportunities/board?score=frio"))
print("filtros -> unassigned:", len(f1), "| board score=frio:", len(f2))

# 15. Contratos antigos preservados
old_list = ok(c.get("/opportunities?status=fechado"))
assert isinstance(old_list, list)
old_det = ok(c.get(f"/opportunities/{o1['id']}/details"))
assert "opportunity" in old_det and "interactions" in old_det
print("contratos antigos OK ->", len(old_det["interactions"]), "interacoes no detalhe")

print("\n==== TODOS OS FLUXOS DA FASE 1 VALIDADOS ====")
