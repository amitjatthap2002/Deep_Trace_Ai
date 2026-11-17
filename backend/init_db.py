import sys
from pathlib import Path

# Ensure backend root is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import asyncio
from app.database import engine, Base
from app.models.user import User
from app.models.media import MediaFile, Metadata, DeepfakeResult, ForensicResult, FactCheckResult, FinalReport

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_models())
    print("Database tables created successfully!")
