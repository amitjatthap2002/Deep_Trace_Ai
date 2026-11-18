from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import auth, dashboard, admin, media
from app.database import engine, Base
import app.models.user  # noqa: F401
import app.models.media  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize database tables on startup if they don't exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[Startup] Database tables verified/created successfully.")
    except Exception as e:
        print(f"[Startup] Warning: Could not auto-create database tables: {e}")
    yield


app = FastAPI(
    title="DeepTrace AI",
    description="AI-Powered Digital Media Authenticity Verification SaaS Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Configure CORS for frontend (supports local dev and any production domain with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "error": "Internal Server Error"}
    )

@app.get("/")
async def root():
    return {"message": "Welcome to the DeepTrace AI API", "docs": "/api/docs"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "DeepTrace AI API"}

# Register all routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(media.router, prefix="/api/media", tags=["Media & Analysis"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
