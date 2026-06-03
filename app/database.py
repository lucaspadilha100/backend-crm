import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Banco principal: Supabase (Postgres). Defina DATABASE_URL no ambiente, ex.:
#   postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres?sslmode=require
# Fallback para SQLite apenas em desenvolvimento local sem DATABASE_URL.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crm.db")

# Normaliza o esquema "postgres://" (formato antigo) para "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # pool_pre_ping evita conexões mortas (importante com o pooler do Supabase).
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
