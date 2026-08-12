from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.media import MediaFile
from app.api.deps import get_current_user
import os

router = APIRouter()


def _require_admin(current_user: User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin: List all registered users."""
    _require_admin(current_user)
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [
        {
            "user_id": str(u.user_id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]


@router.get("/system-health")
async def system_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Returns system health status."""
    _require_admin(current_user)

    # DB connectivity check
    try:
        await db.execute(select(func.count(User.user_id)))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "operational",
        "database": db_status,
        "environment": os.getenv("ENV", "development"),
        "version": "1.0.0"
    }
