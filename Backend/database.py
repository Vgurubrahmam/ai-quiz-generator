import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# --- Step 1: Choose the correct database URL ---
DATABASE_URL = os.getenv("DATABASE_URL")
is_vercel = bool(os.getenv("VERCEL"))

# Allow local override (optional for local dev)
if not is_vercel:
    local_override = os.getenv("LOCAL_DATABASE_URL")
    if local_override:
        DATABASE_URL = local_override

# Fallback to SQLite for local use if nothing else set
if not DATABASE_URL:
    if is_vercel:
        raise RuntimeError("DATABASE_URL must be configured for Vercel deployments")
    DATABASE_URL = "sqlite:///./quiz.db"

# --- Step 2: Normalize the driver for SQLAlchemy ---
# Replace legacy prefix with modern one
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# --- Step 3: Engine configuration ---
engine_kwargs = {
    "echo": False,         # disable SQL logging
    "pool_pre_ping": True  # auto-reconnect dropped connections
}

# SQLite requires this flag on local dev
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

if "supabase.co" in DATABASE_URL:
    engine_kwargs["connect_args"] = {"sslmode": "require"}

# --- Step 4: Create engine and session ---
engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# --- Optional helper ---
def get_db():
    """Dependency to get DB session (FastAPI compatible)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

print("✅ Using database:", DATABASE_URL.split("@")[-1])
