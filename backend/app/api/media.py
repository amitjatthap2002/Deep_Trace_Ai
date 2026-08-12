import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from io import BytesIO
from app.database import get_db
from app.models.user import User
from app.models.media import MediaFile, FinalReport, Metadata, DeepfakeResult, ForensicResult, FactCheckResult
from app.api.deps import get_current_user
from app.minio_utils import get_minio_client
from app.config import settings

router = APIRouter()


@router.get("/{media_id}/report")
async def get_report(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return the full JSON forensic report for a given media file."""
    result = await db.execute(
        select(MediaFile)
        .options(
            selectinload(MediaFile.metadata_info),
            selectinload(MediaFile.deepfake_result),
            selectinload(MediaFile.forensic_result),
            selectinload(MediaFile.fact_check_result),
            selectinload(MediaFile.final_report),
        )
        .filter(MediaFile.media_id == media_id, MediaFile.user_id == current_user.user_id)
    )
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.status != "completed":
        raise HTTPException(status_code=202, detail=f"Analysis is still in progress. Status: {media.status}")

    report = media.final_report
    meta = media.metadata_info
    deepfake = media.deepfake_result
    forensic = media.forensic_result
    fact_check = media.fact_check_result

    return {
        "media_id": str(media.media_id),
        "filename": media.filename,
        "media_type": media.media_type,
        "status": media.status,
        "trust_score": report.trust_score if report else None,
        "risk_level": report.risk_level if report else None,
        "ai_summary": report.ai_summary if report else None,
        "metadata": {
            "camera_make": meta.camera_make if meta else None,
            "camera_model": meta.camera_model if meta else None,
            "software_used": meta.software_used if meta else None,
            "gps_lat": meta.gps_lat if meta else None,
            "gps_lng": meta.gps_lng if meta else None,
            "flags": meta.flags if meta else None,
            "exif_data": meta.exif_data if meta else None,
        },
        "deepfake": {
            "probability_fake": deepfake.probability_fake if deepfake else None,
            "verdict": deepfake.verdict if deepfake else None,
            "confidence": deepfake.confidence if deepfake else None,
            "heatmap_path": deepfake.heatmap_path if deepfake else None,
        },
        "forensic": {
            "ela_score": forensic.ela_score if forensic else None,
            "shadow_score": forensic.shadow_score if forensic else None,
            "lighting_score": forensic.lighting_score if forensic else None,
            "compression_score": forensic.compression_score if forensic else None,
            "copy_move_detected": forensic.copy_move_detected if forensic else None,
            "details": forensic.details if forensic else None,
        },
        "fact_check": {
            "ocr_text": fact_check.ocr_text if fact_check else None,
            "reverse_search_matches": fact_check.reverse_search_matches if fact_check else None,
            "context_flags": fact_check.context_flags if fact_check else None,
            "verified_sources": fact_check.verified_sources if fact_check else None,
        }
    }


@router.get("/{media_id}/report/pdf")
async def download_pdf_report(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download the PDF forensic report for a given media file."""
    result = await db.execute(
        select(MediaFile)
        .options(selectinload(MediaFile.final_report))
        .filter(MediaFile.media_id == media_id, MediaFile.user_id == current_user.user_id)
    )
    media = result.scalars().first()
    if not media or not media.final_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not media.final_report.pdf_path:
        raise HTTPException(status_code=404, detail="PDF not yet generated")

    pdf_path = media.final_report.pdf_path
    bucket, object_name = pdf_path.split("/", 1)

    minio_client = get_minio_client()
    response_data = minio_client.get_object(bucket, object_name)
    pdf_bytes = response_data.read()

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=deeptrace_{media_id}_report.pdf"}
    )


@router.get("/")
async def list_media(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    """List all media uploads for the current user (paginated)."""
    result = await db.execute(
        select(MediaFile)
        .filter(MediaFile.user_id == current_user.user_id)
        .order_by(MediaFile.upload_time.desc())
        .offset(skip).limit(limit)
    )
    items = result.scalars().all()
    return [
        {
            "media_id": str(m.media_id),
            "filename": m.filename,
            "media_type": m.media_type,
            "status": m.status,
            "upload_time": m.upload_time.isoformat() if m.upload_time else None,
        }
        for m in items
    ]


@router.delete("/{media_id}")
async def delete_media(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a media record and its associated storage object."""
    result = await db.execute(
        select(MediaFile).filter(MediaFile.media_id == media_id, MediaFile.user_id == current_user.user_id)
    )
    media = result.scalars().first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Remove from MinIO
    try:
        minio_client = get_minio_client()
        bucket, object_name = media.storage_path.split("/", 1)
        minio_client.remove_object(bucket, object_name)
    except Exception as e:
        print(f"MinIO delete error (non-fatal): {e}")

    await db.delete(media)
    await db.commit()
    return {"message": "Media deleted successfully"}
