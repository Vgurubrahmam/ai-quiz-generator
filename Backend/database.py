import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv() 

DATABASE_URL = os.getenv("DATABASE_URL")
is_vercel = bool(os.getenv("VERCEL"))

# Allow local overrides so we do not depend on a cloud Postgres instance when running locally.
if not is_vercel:
    local_override = os.getenv("LOCAL_DATABASE_URL")
    if local_override:
        DATABASE_URL = local_override

if not DATABASE_URL:
    if is_vercel:
        raise RuntimeError("DATABASE_URL must be configured for Vercel deployments")
    # Fall back to a local SQLite database for development convenience.
    DATABASE_URL = "sqlite:///./quiz.db"

# Ensure SQLAlchemy uses the psycopg (psycopg3) driver instead of the legacy psycopg2
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()
