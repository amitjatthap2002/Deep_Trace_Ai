from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

try:
    from app.config import settings
except ImportError:
    from config import settings  # type: ignore

import re

def clean_database_url(url: str) -> str:
    """Strips quotes, spaces, psql CLI prefixes, and variable names if pasted from cloud consoles."""
    if not url:
        return ""
    cleaned = str(url).strip()
    if cleaned.startswith("psql "):
        cleaned = cleaned[5:].strip()
    if cleaned.startswith("DATABASE_URL="):
        cleaned = cleaned[13:].strip()
    cleaned = cleaned.strip("'").strip('"').strip()
    if cleaned.startswith("DATABASE_URL="):
        cleaned = cleaned[13:].strip()
    cleaned = cleaned.strip("'").strip('"').strip()
    if cleaned.startswith("postgres://"):
        cleaned = "postgresql://" + cleaned[11:]
    return cleaned


# Normalize Database URL for asyncpg and cloud providers (e.g. Neon, Supabase)
db_url = clean_database_url(settings.DATABASE_URL)

# Safe masked log for Render output
safe_log = re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", db_url)
print(f"[Database] Configured Database URL: {safe_log}")

if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}
if "sslmode=require" in db_url or "ssl=require" in db_url or "neon.tech" in db_url:
    if "?" in db_url:
        base, query = db_url.split("?", 1)
        # Strip libpq-specific flags that asyncpg doesn't support
        ignore_keys = ("ssl", "channel_binding", "target_session_attrs", "endpoint")
        params = [p for p in query.split("&") if not any(p.startswith(k) for k in ignore_keys)]
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
