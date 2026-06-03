"""Ponto de entrada para a Vercel (Python Serverless Function).

A Vercel detecta a aplicação ASGL exportada como ``app`` e a serve. Todas as
rotas do FastAPI passam a responder sob este function. O banco é o Supabase
(via DATABASE_URL), então não há dependência de filesystem persistente.
"""

from app.main import app  # noqa: F401  — exportado para a Vercel
