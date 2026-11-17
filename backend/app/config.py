from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file from the backend directory regardless of cwd
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "DeepTrace AI"
    DEBUG: bool = True

    # Security / JWT
    JWT_SECRET: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/deeptrace_db"

    # MinIO Settings
    MINIO_URL: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadminpassword"
    MINIO_BUCKET_NAME: str = "deeptrace-media"

    # AI / LLM
    ANTHROPIC_API_KEY: str = ""

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = str(BACKEND_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
