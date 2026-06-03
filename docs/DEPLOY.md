# Deploy — tudo na Vercel + Supabase

Arquitetura: **frontend** (Vite) e **backend** (FastAPI serverless) na Vercel;
**dados** no Supabase. Sem Render/Railway.

```
┌─ Vercel projeto 1: Frontend (Vite)  ── chama ──▶ ┌─ Vercel projeto 2: API (FastAPI)
│  Root Directory: frontend/                       │  Root Directory: ./ (raiz)
│  Env: VITE_API_URL = url da API                  │  api/index.py + vercel.json
└──────────────────────────────────────────────    │  Env: DATABASE_URL, CORS_ORIGINS
                                                    └──────── conecta ──▶ Supabase (Postgres)
```

## 1. Supabase (banco)
1. Crie um projeto em supabase.com.
2. Clique em **Connect** (topo) e use a aba **Session pooler** (ou Transaction
   pooler). **NÃO use "Direct connection"** — ela é **IPv6-only** e a Vercel
   (serverless) só tem IPv4, então a conexão direta falha.
   - Session pooler (porta 5432): `postgresql://postgres.<ref>:SENHA@aws-0-<regiao>.pooler.supabase.com:5432/postgres`
   - Transaction pooler (porta 6543): idem com `:6543` — recomendada para alto tráfego serverless.
   - Acrescente `?sslmode=require` no final.
   - As tabelas são criadas automaticamente no primeiro acesso (create_all + migração).

## 2. Backend (API) — projeto Vercel #1
1. Vercel → **Add New → Project** → importe o repositório.
2. **Root Directory:** `./` (raiz). A Vercel detecta `api/index.py` (Python) via `vercel.json`.
3. **Environment Variables:**
   - `DATABASE_URL` = a URI do Supabase (com `?sslmode=require`)
   - `CORS_ORIGINS` = a URL do frontend (preencher depois do passo 3), ex.: `https://crm-frontend.vercel.app`
4. Deploy. Anote a URL da API, ex.: `https://crm-api.vercel.app`.
5. Teste: abrir `https://crm-api.vercel.app/` deve retornar `{"status":"ok"}`.

## 3. Frontend — projeto Vercel #2
1. Vercel → **Add New → Project** → mesmo repositório.
2. **Root Directory:** `frontend`. Framework detectado: **Vite**.
3. **Environment Variable:**
   - `VITE_API_URL` = a URL da API do passo 2 (ex.: `https://crm-api.vercel.app`)
4. Deploy. Anote a URL do frontend.
5. Volte ao projeto da API e ajuste `CORS_ORIGINS` para essa URL do frontend → redeploy da API.

## Observações
- **Dois projetos Vercel, um repositório** — cada um com seu Root Directory.
- O `crm.db` (SQLite) é só fallback de desenvolvimento local; em produção usa Supabase.
- Cloudflare R2 (como no seu outro app) só seria necessário se formos guardar
  **arquivos/imagens**. Este CRM ainda não tem upload, então não precisa por enquanto.
- Cold start: a primeira chamada após inatividade pode levar ~1s (normal em serverless).

## Desenvolvimento local
```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload            # http://localhost:8000

# Frontend (outro terminal)
cd frontend && npm install && npm run dev # http://localhost:5173
```
