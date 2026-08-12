import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from io import BytesIO
from app.database import get_db
from app.models.user import User
from app.models.media import MediaFile, FinalReport
from app.api.deps import get_current_user
from sqlalchemy import func

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns aggregate statistics for the logged-in user's dashboard:
    total analyses, completed, average trust score, risk level counts.
    """
    # Total media count
    total_result = await db.execute(
        select(func.count(MediaFile.media_id)).filter(MediaFile.user_id == current_user.user_id)
    )
    total = total_result.scalar()

    # Completed count
    completed_result = await db.execute(
        select(func.count(MediaFile.media_id)).filter(
            MediaFile.user_id == current_user.user_id,
            MediaFile.status == "completed"
        )
    )
    completed = completed_result.scalar()

    # Average trust score
    avg_result = await db.execute(
        select(func.avg(FinalReport.trust_score))
        .join(MediaFile, FinalReport.media_id == MediaFile.media_id)
        .filter(MediaFile.user_id == current_user.user_id)
    )
    avg_trust_score = avg_result.scalar()

    # Risk level distribution
    risk_counts = {}
    for risk in ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]:
        risk_result = await db.execute(
            select(func.count(FinalReport.report_id))
            .join(MediaFile, FinalReport.media_id == MediaFile.media_id)
            .filter(
                MediaFile.user_id == current_user.user_id,
                FinalReport.risk_level == risk
            )
        )
        risk_counts[risk] = risk_result.scalar()

    return {
        "total_analyses": total,
        "completed_analyses": completed,
        "pending_analyses": total - completed,
        "average_trust_score": round(float(avg_trust_score), 2) if avg_trust_score else None,
        "risk_distribution": risk_counts
    }


@router.get("/recent")
async def get_recent_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the 10 most recent analyses for the user."""
    result = await db.execute(
        select(MediaFile)
        .options(selectinload(MediaFile.final_report))
        .filter(MediaFile.user_id == current_user.user_id)
        .order_by(MediaFile.upload_time.desc())
        .limit(10)
    )
    items = result.scalars().all()
    return [
        {
            "media_id": str(m.media_id),
            "filename": m.filename,
            "media_type": m.media_type,
            "status": m.status,
            "upload_time": m.upload_time.isoformat() if m.upload_time else None,
            "trust_score": m.final_report.trust_score if m.final_report else None,
            "risk_level": m.final_report.risk_level if m.final_report else None,
        }
        for m in items
    ]
