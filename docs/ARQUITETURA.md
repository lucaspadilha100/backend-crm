# CRM de Recuperação de Leads — Arquitetura & Roadmap

> Documento vivo. Princípio central do produto:
> **"Quando um lead entra no funil, ele precisa ter um destino."**
> Nenhum lead some: ele vira cliente, é descartado com justificativa, entra em
> cadência futura ou volta ao funil.

Stack alvo:
- **Backend:** FastAPI + SQLAlchemy + **Supabase (Postgres)**. SQLite só como fallback de dev local.
- **Frontend:** React + Vite + TypeScript + TailwindCSS + React Query + dnd-kit (a construir do zero)
- **Deploy:** frontend na **Vercel**; backend em **Render/Railway** (FastAPI + Supabase). Banco = Supabase.

Regra de ouro deste projeto: **tudo aditivo.** Não alteramos contratos de
endpoints existentes, não removemos funcionalidades, não criamos mocks nem
dados fictícios. Campos novos entram como opcionais; endpoints novos convivem
com os antigos.

---

## 1. Inventário do que JÁ existe hoje (backend)

### Modelos (tabelas)

**`contacts`** — pessoa/empresa
| coluna | tipo | obs |
|---|---|---|
| id | int PK | |
| name | str | obrigatório |
| email | str | indexado, usado p/ dedupe |
| phone | str | indexado, usado p/ dedupe |
| company | str | |
| created_at | datetime | |

**`opportunities`** — o "card" do funil
| coluna | tipo | obs |
|---|---|---|
| id | int PK | |
| contact_id | FK contacts | |
| previous_opportunity_id | FK opportunities | liga ao card anterior |
| status | str | novo/contato/proposta/visita_agendada/negociacao/fechado/perdido |
| source | str | manual/site/instagram/facebook/whatsapp/indicacao |
| lead_type | str | contato/produto/imovel/servico/orcamento |
| item_name, item_code, page_url | str | produto/serviço desejado |
| message | str | mensagem do lead |
| notes | str | notas internas |
| assigned_to | str | responsável (texto livre) |
| is_repurchase | bool | recompra |
| had_previous_purchase | bool | já comprou antes |
| reentry_count | int | nº de reentradas |
| created_at | datetime | |

**`interactions`** — histórico de toques
| coluna | tipo | obs |
|---|---|---|
| id | int PK | |
| opportunity_id | FK opportunities | |
| type | str | ligacao/whatsapp/email/reuniao/observacao/reentrada/sistema |
| notes | str | |
| created_at | datetime | |

### Endpoints existentes (NÃO MEXER — preservar contrato)
- `GET /` — health
- `GET /contacts` — lista contatos
- `GET /contacts/{id}` — detalhe
- `GET /contacts/{id}/opportunities` — oportunidades do contato
- `POST /opportunities/intake` — **motor de entrada de leads** (dedupe, reentrada, recompra)
- `GET /opportunities` — lista com filtros: `status`, `source`, `lead_type`, `assigned_to`
- `GET /opportunities/{id}` — detalhe
- `GET /opportunities/{id}/details` — detalhe + contato + anterior + interações
- `PUT /opportunities/{id}/status` — muda etapa
- `PUT /opportunities/{id}/notes` — atualiza notas
- `PUT /opportunities/{id}/assign` — atribui responsável
- `POST /interactions` — cria interação
- `GET /opportunities/{id}/interactions` — lista interações

### Regras de negócio já implementadas (`intake_service.py`) — preservar
1. **Dedupe** de contato por email → telefone.
2. Contato novo → cria contato + oportunidade `novo` + interação de sistema.
3. Contato existente com **card ativo** → reaproveita o card, `reentry_count++`,
   registra interação `reentrada`.
4. Contato existente **sem card ativo** → cria novo card ligado ao anterior
   (`previous_opportunity_id`), detecta recompra (`is_repurchase`).
   Status ativos = novo, contato, proposta, visita_agendada, negociacao.

### O que está faltando vs. visão (gap)
Perda estruturada (motivo/recuperável/follow-up) · cadência/reativação ·
score de lead · monitoramento de leads parados · valor do negócio · usuário nas
interações · tipos meet/visita · pipeline de pós-venda · dashboard ·
filtros avançados · visão 360 do cliente · ações rápidas (tudo frontend).

---

## 2. Modelo de dados alvo (mudanças ADITIVAS)

### `opportunities` — colunas novas (todas opcionais/com default)
| coluna | tipo | default | para quê |
|---|---|---|---|
| value | Numeric | null | valor do negócio / valor gerado |
| lost_reason | str | null | preco/concorrente/sem_resposta/timing/sem_orcamento/sem_interesse/curioso/outro |
| lost_observation | str | null | observação da perda |
| is_recoverable | bool | null | perdido recuperável (true) vs descartado (false) |
| lost_at | datetime | null | quando foi perdido |
| follow_up_at | datetime | null | data programada de reativação (cadência) |
| archived | bool | false | descartados arquivados saem do board |
| last_interaction_at | datetime | =created_at | base p/ "leads parados" e score |
| stage_changed_at | datetime | =created_at | tempo na etapa atual |

> `score` (🔥/🟡/❄) é **calculado em tempo de leitura** a partir de
> `last_interaction_at`, `status` e `stage_changed_at` — exposto como campo
> opcional na resposta, sem coluna nova. Idem indicadores de "leads parados".

### `interactions` — colunas novas
| coluna | tipo | default | para quê |
|---|---|---|---|
| user | str | null | quem registrou a interação |

E extensão do enum de `type`: + `meet`, `visita`. (Aditivo: valores antigos seguem válidos.)

### Pós-venda — coluna nova em `opportunities`
| coluna | tipo | default | para quê |
|---|---|---|---|
| post_sale_stage | str | null | producao/separacao/envio/entregue/pos_venda/concluido |

Quando uma oportunidade vira `fechado`, ela entra no **segundo pipeline**
(pós-venda) via `post_sale_stage`. O funil de vendas e o board de pós-venda são
duas visões da mesma tabela, separadas por `status=fechado` + `post_sale_stage`.

### Nova tabela `cadences` (fila de reativação) — opcional, fase 3
| coluna | tipo | obs |
|---|---|---|
| id | int PK | |
| opportunity_id | FK | |
| scheduled_for | datetime | quando reativar |
| reason | str | motivo da perda que originou |
| status | str | pendente/concluida/cancelada |
| responsible | str | |
| created_at | datetime | |

> Alternativa mais simples: usar só `opportunity.follow_up_at` + `is_recoverable`
> e derivar a fila. Decisão final na Fase 3 (começamos pelo simples).

### Migrações
O schema nasce via `Base.metadata.create_all` (cria tabelas novas completas).
Para bancos já existentes, `app/db_migrate.py` adiciona colunas faltantes via
`ALTER TABLE ADD COLUMN`, **dialect-aware** (Postgres/Supabase e SQLite). Roda
automaticamente no startup. Alembic pode substituí-lo em produção mais tarde.

---

## 3. Endpoints novos (todos aditivos)

| método | rota | função |
|---|---|---|
| PUT | `/opportunities/{id}/lose` | fluxo de perda: motivo, observação, recuperável, follow_up_at → status=perdido, grava campos, cria interação, agenda cadência se recuperável |
| POST | `/opportunities/{id}/reactivate` | volta um perdido recuperável ao funil (status=novo/contato), limpa lost_*, registra interação |
| GET | `/opportunities/reactivation` | leads para reativar (follow_up_at <= hoje, recuperável, não arquivado) |
| GET | `/opportunities/stalled` | leads parados (last_interaction_at além do limite) com nível amarelo/vermelho |
| PUT | `/opportunities/{id}/value` | define valor do negócio |
| PUT | `/opportunities/{id}/post-sale-stage` | move no pipeline de pós-venda |
| GET | `/opportunities` (estender) | novos query params: `assigned`(null/uany), `recoverable`, `archived`, `follow_up_today`, `is_repurchase`, `pipeline`, `score` — **mantém os antigos** |
| GET | `/dashboard/metrics` | indicadores operacionais |
| GET | `/contacts/{id}/summary` | visão 360: oportunidades, compras, reentradas, valor gerado, cadências, status |
| POST | `/interactions` (estender) | aceitar `user` e tipos `meet`/`visita` — campos opcionais, retrocompatível |

`PUT /status` ganha efeito colateral aditivo: ao mudar etapa, atualiza
`stage_changed_at` e `last_interaction_at` (não muda o contrato de I/O).
Mover para `perdido` por essa rota continua válido, mas o frontend usará
`/lose` para abrir o modal obrigatório.

---

## 4. Arquitetura do frontend (novo)

```
frontend/
├── src/
│   ├── api/            # cliente HTTP + tipos gerados dos schemas
│   ├── components/
│   │   ├── kanban/     # Board, Column, Card, QuickActions
│   │   ├── drawer/     # OpportunityDrawer, Timeline, ClientPanel
│   │   ├── modals/     # LostModal, FollowUpModal
│   │   └── ui/         # primitivos (badge, button, etc. via Tailwind)
│   ├── features/
│   │   ├── pipeline/   # funil de vendas
│   │   ├── postsale/   # pipeline de pós-venda
│   │   ├── reactivation/ # leads para reativar
│   │   ├── dashboard/
│   │   └── client/     # visão 360
│   ├── hooks/          # React Query hooks por recurso
│   ├── lib/            # score, formatação, datas, cores de SLA
│   └── routes/
```
Libs: **React Query** (estado servidor), **dnd-kit** (drag-and-drop do kanban),
**react-router**, **Tailwind**. Sem mocks: cliente aponta para o FastAPI real.

### Telas
1. **Kanban (vendas)** — colunas por status, cards ricos, drag-and-drop, ações rápidas, filtros.
2. **Drawer da oportunidade** — resumo + timeline + cliente + edição, área ampla.
3. **Reativação** — fila de cadência ("reativar hoje"), motivo, último contato, data programada, responsável.
4. **Pós-venda** — segundo kanban (produção→...→concluído).
5. **Dashboard** — indicadores e motivos de perda.
6. **Cliente 360** — histórico completo do relacionamento.

### Card do kanban (campos visíveis sem abrir drawer)
nome · telefone (clique → WhatsApp) · produto/serviço · origem · responsável ·
badge recompra · contador de reentradas · selo "cliente antigo" ·
score (🔥/🟡/❄) · alerta de parado (amarelo >2d, vermelho >5d).

---

## 5. Roadmap em fases (cada fase é validável e commitável)

| Fase | Entrega | Backend | Frontend |
|---|---|---|---|
| **0** | Este documento de arquitetura | — | — |
| **1** | Fundação de dados | Alembic + colunas novas + endpoints lose/reactivate/stalled/value/dashboard/summary + estender filtros e interactions | — |
| **2** | Esqueleto do front | — | setup Vite+TS+Tailwind+RQ, cliente API tipado, kanban read-only |
| **3** | Fluxo de perda + cadência | cadência | LostModal obrigatório, tela Reativação |
| **4** | Leads parados + score + ações rápidas | (cálculos) | badges/SLA, QuickActions no card, WhatsApp |
| **5** | Dashboard | (metrics) | tela de indicadores |
| **6** | Pós-venda | post_sale_stage | segundo kanban |
| **7** | Cliente 360 + filtros + recompra | (summary) | visão do cliente, filtros avançados |
| **8** | Validação integrada | testes de contrato | E2E manual: drag-drop, perda, cadência, pós-venda, filtros, dashboard |

---

## 6. Arquivos de backend a criar/alterar (conforme exigência do prompt)

**Criar:**
- `alembic.ini`, `migrations/` (Alembic)
- `app/services/lost_service.py` — fluxo de perda/reativação/cadência
- `app/services/scoring.py` — cálculo de score e SLA de parado
- `app/services/dashboard_service.py` — agregações
- `app/routes/dashboard.py`
- `app/schemas/dashboard.py`
- `app/models/cadence.py` (se adotarmos tabela dedicada na Fase 3)

**Alterar (somente aditivo):**
- `app/models/opportunity.py` — colunas novas
- `app/models/interaction.py` — coluna `user`
- `app/schemas/opportunity.py` — campos novos + enums lost_reason/post_sale_stage + campo `score` calculado
- `app/schemas/interaction.py` — `user` + tipos meet/visita
- `app/routes/opportunities.py` — endpoints lose/reactivate/stalled/value/post-sale + novos filtros
- `app/routes/interactions.py` — aceitar `user`/tipos novos
- `app/routes/contacts.py` — `/summary`
- `app/services/intake_service.py` — setar `last_interaction_at`/`stage_changed_at` nos pontos certos
- `app/main.py` — registrar router de dashboard

**Não alterar:** assinaturas/contratos dos endpoints já existentes.

---

## 7. Critérios de validação final
- [ ] Todos os endpoints antigos respondem igual (contrato intacto)
- [ ] Novos endpoints validados (request/response + tipos)
- [ ] Drag-and-drop persiste status via `PUT /status`
- [ ] Fluxo de perdido exige modal e grava motivo/recuperável/follow-up
- [ ] Fila de cadência mostra "reativar hoje" corretamente
- [ ] Pós-venda move entre etapas
- [ ] Filtros avançados batem com os dados
- [ ] Dashboard com números reais (sem mock)
- [ ] Lista de arquivos criados/alterados/removidos ao fim de cada fase

---

## 8. Status das fases

| Fase | Status |
|---|---|
| 0 — Arquitetura | ✅ concluída |
| 1 — Fundação do backend | ✅ concluída e validada (smoke test 15/15) |
| 2 — Esqueleto do front | ✅ concluída (build OK, integração validada contra a API real) |
| 3 — Perda + cadência (write) | ⬜ próxima |
| 4–8 | ⬜ |

### Changelog — Fase 2 (frontend novo, em `frontend/`)

Stack: React 18 + Vite 5 + TypeScript + Tailwind 3 (tema claro/escuro via classe) +
React Query 5 + React Router 6 + dnd-kit (instalado p/ Fase 3) + lucide-react.

**Estrutura criada:**
- Configuração: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `vercel.json`, `.env.example`, `.gitignore`
- `src/index.css` — **paleta centralizada em variáveis CSS** (claro/escuro); trocar marca = editar só aqui
- `src/api/` — `types.ts` (espelha os schemas), `client.ts` (fetch tipado, `VITE_API_URL`), `hooks.ts` (React Query)
- `src/lib/` — `theme.tsx` (tema persistido + toggle), `format.ts` (rótulos, WhatsApp, datas, dinheiro)
- `src/components/` — `Layout` (sidebar + header), `ThemeToggle`, `ui/Badge`, `ui/States`, `kanban/{Board,Column,Card}`, `drawer/OpportunityDrawer`
- `src/pages/` — `KanbanPage`, `ReactivationPage`, `PostSalePage`, `DashboardPage`, `ClientsPage`
- `src/App.tsx` (rotas), `src/main.tsx` (providers)

**Funcional nesta fase (somente leitura):**
- Funil kanban (`/opportunities/board`) com cards ricos: nome, telefone clicável → WhatsApp, produto, origem, responsável, recompra, reentradas, cliente antigo (👑), score 🔥🟡❄ e alerta de parado (amarelo/vermelho)
- Drawer de detalhe (`/opportunities/{id}/details`): resumo, contato, negócio, perda, timeline de interações
- Reativação (`/opportunities/reactivation`), Pós-venda (`/opportunities/board?pipeline=post_sale`), Dashboard (`/dashboard/metrics`) — todos com dados reais
- Tema claro/escuro com toggle e persistência; navegação entre todas as telas

**Ainda NÃO nesta fase (vêm depois):** drag-and-drop (3), modal obrigatório de perda (3),
ações rápidas no card (4), edição no drawer (3), Cliente 360 (7), filtros na UI (7).

**Deploy Vercel:** Root Directory = `frontend`, framework Vite, env `VITE_API_URL` = URL do backend.

### Changelog — Fase 1 (backend, 100% aditivo)

**Criados:**
- `app/db_migrate.py` — migração leve dialect-aware (Postgres/SQLite)
- `app/services/scoring.py` — score de lead + SLA de parado
- `app/services/lost_service.py` — perda e reativação
- `app/services/dashboard_service.py` — métricas + visão 360 do cliente
- `app/services/card_service.py` — cards enriquecidos (sem N+1)
- `app/schemas/dashboard.py` — schemas de dashboard e resumo do cliente
- `app/routes/dashboard.py` — `GET /dashboard/metrics`
- `.env.example` — `DATABASE_URL` (Supabase) e `CORS_ORIGINS`
- `smoke_test.py` — teste de integração da Fase 1

**Alterados (sem quebrar contrato):**
- `app/models/opportunity.py` — +10 colunas (value, lost_*, follow_up_at, archived, last_interaction_at, stage_changed_at, post_sale_stage)
- `app/models/interaction.py` — +`user`
- `app/schemas/opportunity.py` — enums (LostReason, PostSaleStage, LeadScore, StallLevel), campos novos, campos calculados (score/stall/dias), `BoardCard`, requests de lose/reactivate/value/post-sale
- `app/schemas/interaction.py` — tipos `meet`/`visita` + `user`
- `app/schemas/contact.py` — `ContactBrief`
- `app/routes/opportunities.py` — `/board`, `/reactivation`, `/stalled`, `/value`, `/lose`, `/reactivate`, `/post-sale-stage` + filtros novos + SLA no `/status`
- `app/routes/interactions.py` — aceita `user`, alimenta SLA
- `app/routes/contacts.py` — `GET /{id}/summary`
- `app/services/intake_service.py` — alimenta `last_interaction_at`
- `app/database.py` — Supabase/Postgres via `DATABASE_URL` (fallback SQLite)
- `app/main.py` — router de dashboard, `ensure_schema`, CORS configurável
- `requirements.txt` — +`psycopg2-binary`

**Removidos:** nenhum.

### Endpoints da Fase 1 (todos novos, contratos antigos intactos)
`GET /opportunities/board` · `GET /opportunities/reactivation` ·
`GET /opportunities/stalled` · `PUT /opportunities/{id}/value` ·
`PUT /opportunities/{id}/lose` · `POST /opportunities/{id}/reactivate` ·
`PUT /opportunities/{id}/post-sale-stage` · `GET /dashboard/metrics` ·
`GET /contacts/{id}/summary` · filtros novos em `GET /opportunities`.

### Deploy / variáveis de ambiente
- `DATABASE_URL` — connection string do Supabase (Project Settings → Database → Connection string → URI). **Nunca commitar** (vai em variável de ambiente do host).
- `CORS_ORIGINS` — URL do frontend na Vercel em produção (ex.: `https://meu-crm.vercel.app`).
