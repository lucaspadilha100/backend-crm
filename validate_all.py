"""Validação final — exercita TODOS os endpoints e confere contratos.
Roda contra SQLite efêmero. Sai com erro se algo divergir."""
import os
os.environ.pop("DATABASE_URL", None)
import datetime as dt
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
fails = []

def check(name, cond, extra=""):
    print(("✓" if cond else "✗"), name, extra if not cond else "")
    if not cond:
        fails.append(name)

def req(method, path, **kw):
    r = c.request(method, path, **kw)
    return r

# Health
check("GET /", c.get("/").json().get("status") == "ok")

# Intake novo + contrato OpportunityResponse
o = c.post("/opportunities/intake", json={"name":"Maria","phone":"11999990000","email":"m@e.com","source":"instagram","lead_type":"produto","item_name":"Sofá"}).json()
OPP_KEYS = {"id","contact_id","status","source","lead_type","item_name","is_repurchase","reentry_count",
            "value","lost_reason","is_recoverable","follow_up_at","archived","post_sale_stage",
            "last_interaction_at","stage_changed_at","created_at","score","stall_level",
            "days_since_interaction","days_in_stage"}
check("intake -> contrato OpportunityResponse", OPP_KEYS.issubset(o.keys()), str(OPP_KEYS - o.keys()))
oid = o["id"]; cid = o["contact_id"]

# Intake reentrada
o2 = c.post("/opportunities/intake", json={"name":"Maria","phone":"11999990000","source":"whatsapp"}).json()
check("intake reentrada -> mesmo card, reentry++", o2["id"]==oid and o2["reentry_count"]==1, str(o2.get("reentry_count")))

# Intake validação (sem email/phone -> 422)
check("intake sem contato -> 422", c.post("/opportunities/intake", json={"name":"X"}).status_code == 422)

# Listagens
check("GET /opportunities -> lista", isinstance(c.get("/opportunities").json(), list))
check("GET /opportunities?status=novo", all(x["status"]=="novo" for x in c.get("/opportunities?status=novo").json()))
board = c.get("/opportunities/board").json()
check("GET /opportunities/board -> {opportunity,contact}", board and {"opportunity","contact"} <= board[0].keys())
check("board contato preenchido", board[0]["contact"]["name"]=="Maria")
check("GET /opportunities/board?unassigned=true", isinstance(c.get("/opportunities/board?unassigned=true").json(), list))
check("GET /opportunities/board?score=morno", isinstance(c.get("/opportunities/board?score=morno").json(), list))
check("GET /opportunities/stalled -> lista", isinstance(c.get("/opportunities/stalled").json(), list))
check("GET /opportunities/reactivation -> lista", isinstance(c.get("/opportunities/reactivation").json(), list))

# Detalhe
det = c.get(f"/opportunities/{oid}/details").json()
check("GET /{id}/details -> contrato", {"opportunity","contact","previous_opportunity","interactions"} <= det.keys())
check("GET /{id} 404", c.get("/opportunities/999999").status_code == 404)

# Mutações
check("PUT /status", c.put(f"/opportunities/{oid}/status", json={"status":"proposta"}).json()["status"]=="proposta")
check("PUT /notes", c.put(f"/opportunities/{oid}/notes", json={"notes":"oi"}).json()["notes"]=="oi")
check("PUT /assign", c.put(f"/opportunities/{oid}/assign", json={"assigned_to":"vend1"}).json()["assigned_to"]=="vend1")
check("PUT /value", c.put(f"/opportunities/{oid}/value", json={"value":3500.0}).json()["value"]==3500.0)
fu = (dt.datetime.now()+dt.timedelta(days=10)).isoformat()+"Z"
check("PUT /follow-up", c.put(f"/opportunities/{oid}/follow-up", json={"follow_up_at":fu}).json()["follow_up_at"] is not None)

# Interação (user + tipo novo)
it = c.post("/interactions", json={"opportunity_id":oid,"type":"visita","notes":"loja","user":"ana"}).json()
check("POST /interactions (user+visita)", it["user"]=="ana" and it["type"]=="visita")
check("GET /{id}/interactions", isinstance(c.get(f"/opportunities/{oid}/interactions").json(), list))
check("POST /interactions 404", c.post("/interactions", json={"opportunity_id":999999,"type":"ligacao"}).status_code==404)

# Fluxo perdido recuperável + reativação
b = c.post("/opportunities/intake", json={"name":"Joao","phone":"11888880000"}).json()
past = (dt.datetime.now()-dt.timedelta(days=1)).isoformat()+"Z"
lost = c.put(f"/opportunities/{b['id']}/lose", json={"reason":"preco","observation":"caro","is_recoverable":True,"follow_up_at":past}).json()
check("PUT /lose recuperável", lost["status"]=="perdido" and lost["is_recoverable"] and lost["lost_reason"]=="preco")
react_q = c.get("/opportunities/reactivation").json()
check("reativação contém o lead", any(x["opportunity"]["id"]==b["id"] for x in react_q))
re = c.post(f"/opportunities/{b['id']}/reactivate", json={"status":"novo"}).json()
check("POST /reactivate", re["status"]=="novo" and re["lost_reason"] is None)
check("reactivate de não-perdido -> 400", c.post(f"/opportunities/{oid}/reactivate", json={"status":"novo"}).status_code==400)

# Perdido descartado -> arquivado
d = c.post("/opportunities/intake", json={"name":"Spam","phone":"11777770000"}).json()
disc = c.put(f"/opportunities/{d['id']}/lose", json={"reason":"curioso","is_recoverable":False}).json()
check("descartado -> archived", disc["archived"] is True)
check("board esconde descartado", all(x["opportunity"]["id"]!=d["id"] for x in c.get("/opportunities/board").json()))
check("board?archived=true mostra descartado", any(x["opportunity"]["id"]==d["id"] for x in c.get("/opportunities/board?archived=true").json()))

# Fechar -> pós-venda automático + mover etapa
c.put(f"/opportunities/{oid}/status", json={"status":"fechado"})
closed = c.get(f"/opportunities/{oid}").json()
check("fechado -> post_sale_stage=producao", closed["post_sale_stage"]=="producao")
check("PUT /post-sale-stage", c.put(f"/opportunities/{oid}/post-sale-stage", json={"post_sale_stage":"envio"}).json()["post_sale_stage"]=="envio")
check("post-sale em não-fechado -> 400", c.put(f"/opportunities/{b['id']}/post-sale-stage", json={"post_sale_stage":"envio"}).status_code==400)
check("board?pipeline=post_sale", all(x["opportunity"]["status"]=="fechado" for x in c.get("/opportunities/board?pipeline=post_sale").json()))

# Contatos
check("GET /contacts -> lista", isinstance(c.get("/contacts").json(), list))
check("GET /contacts/{id}", c.get(f"/contacts/{cid}").json()["id"]==cid)
check("GET /contacts/{id} 404", c.get("/contacts/999999").status_code==404)
check("GET /contacts/{id}/opportunities", "opportunities" in c.get(f"/contacts/{cid}/opportunities").json())
summ = c.get(f"/contacts/{cid}/summary").json()
SUMM_KEYS = {"contact","total_opportunities","purchases","total_value","reentries","is_returning",
             "current_status","opportunities","upcoming_cadences"}
check("GET /contacts/{id}/summary -> contrato", SUMM_KEYS <= summ.keys(), str(SUMM_KEYS - summ.keys()))
check("summary compras/valor", summ["purchases"]>=1 and summ["total_value"]==3500.0)

# Dashboard
dash = c.get("/dashboard/metrics").json()
DASH_KEYS = {"leads_received","active_opportunities","won_opportunities","lost_opportunities","conversion_rate",
             "lost_reasons","in_cadence","without_responsible","without_recent_interaction",
             "pipeline_value","won_value","stage_counts"}
check("GET /dashboard/metrics -> contrato", DASH_KEYS <= dash.keys(), str(DASH_KEYS - dash.keys()))
check("dashboard won_value", dash["won_value"]==3500.0)
check("dashboard stage_counts 7 etapas", len(dash["stage_counts"])==7)

print("\n" + ("="*50))
if fails:
    print(f"FALHAS ({len(fails)}):", fails)
    raise SystemExit(1)
print("TODOS OS ENDPOINTS E CONTRATOS VALIDADOS ✓")
