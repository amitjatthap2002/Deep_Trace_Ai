import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from io import BytesIO
from app.database import get_db
from app.models.user import User
from app.models.media import MediaFile, FinalReport
from app.api.deps import get_current_user
from app.minio_utils import get_minio_client
import hashlib

router = APIRouter()


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a media file for forensic analysis.
    Accepted: image, video, audio.
    Returns a media_id to use for polling status and retrieving reports.
    """
    # File size check (200MB video / 25MB image limit)
    file_content = await file.read()
    file_size = len(file_content)

    content_type = file.content_type or "application/octet-stream"
    if content_type.startswith("image/") and file_size > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds 25MB limit")
    if content_type.startswith("video/") and file_size > 200 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Video exceeds 200MB limit")

    if content_type.startswith("image/"):
        media_type = "image"
    elif content_type.startswith("video/"):
        media_type = "video"
    elif content_type.startswith("audio/"):
        media_type = "audio"
    else:
        media_type = "document"

    sha256_hash = hashlib.sha256(file_content).hexdigest()

    # Upload to MinIO
    from app.minio_utils import ensure_bucket_exists, upload_file_to_minio
    from app.config import settings
    ensure_bucket_exists()

    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    minio_filename = f"{current_user.user_id}/{uuid.uuid4()}.{file_ext}"
    storage_path = upload_file_to_minio(BytesIO(file_content), minio_filename, file_size, content_type)

    new_media = MediaFile(
        user_id=current_user.user_id,
        filename=file.filename,
        media_type=media_type,
        storage_path=storage_path,
        sha256_hash=sha256_hash,
        file_size_bytes=file_size,
        status="pending"
    )
    db.add(new_media)
    await db.commit()
    await db.refresh(new_media)

    # Trigger Celery background analysis task
    from app.worker.tasks import run_analysis_pipeline
    run_analysis_pipeline.delay(str(new_media.media_id))

    return {
        "message": "File uploaded successfully. Analysis started.",
        "media_id": str(new_media.media_id),
        "status": "pending"
    }


@router.get("/{media_id}/status")
async def get_media_status(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MediaFile).filter(MediaFile.media_id == media_id, MediaFile.user_id == current_user.user_id)
    )
    media = result.scalars().first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"media_id": str(media.media_id), "status": media.status, "filename": media.filename}


@router.get("/{media_id}/report")
async def get_report(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
        return {"media_id": str(media_id), "status": media.status, "message": "Analysis in progress"}

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
        },
        "fact_check": {
            "ocr_text": fact_check.ocr_text if fact_check else None,
            "reverse_search_matches": fact_check.reverse_search_matches if fact_check else None,
            "context_flags": fact_check.context_flags if fact_check else None,
        }
    }


@router.get("/{media_id}/report/pdf")
async def download_pdf_report(
    media_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
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
    result = await db.execute(
        select(MediaFile).filter(MediaFile.media_id == media_id, MediaFile.user_id == current_user.user_id)
    )
    media = result.scalars().first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    try:
        minio_client = get_minio_client()
        bucket, object_name = media.storage_path.split("/", 1)
        minio_client.remove_object(bucket, object_name)
    except Exception as e:
        print(f"MinIO delete error (non-fatal): {e}")
    await db.delete(media)
    await db.commit()
    return {"message": "Media deleted successfully"}
