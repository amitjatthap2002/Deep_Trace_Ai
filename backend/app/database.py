from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

try:
    from app.config import settings
except ImportError:
    from config import settings  # type: ignore

def clean_database_url(url: str) -> str:
    """Strips quotes, spaces, and psql CLI prefixes if pasted from cloud consoles (Neon, Supabase)."""
    if not url:
        return ""
    cleaned = str(url).strip()
    if cleaned.startswith("psql "):
        cleaned = cleaned[5:].strip()
    cleaned = cleaned.strip("'").strip('"').strip()
    return cleaned


# Normalize Database URL for asyncpg and cloud providers (e.g. Neon, Supabase)
db_url = clean_database_url(settings.DATABASE_URL)
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}
if "sslmode=require" in db_url or "ssl=require" in db_url or "neon.tech" in db_url:
    if "?" in db_url:
        base, query = db_url.split("?", 1)
        params = [p for p in query.split("&") if not p.startswith("ssl")]
        db_url = f"{base}?{'&'.join(params)}" if params else base
    connect_args["ssl"] = True

engine = create_async_engine(db_url, echo=settings.DEBUG, connect_args=connect_args)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
