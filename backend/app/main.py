from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import auth, dashboard, admin
from app.api.media import router as upload_router
from app.api.reports import router as report_router

app = FastAPI(
    title="DeepTrace AI",
    description="AI-Powered Digital Media Authenticity Verification SaaS Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
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

# Register all routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(upload_router, prefix="/api/media", tags=["Media Upload"])
app.include_router(report_router, prefix="/api/media", tags=["Reports"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
