import uuid
import hashlib
import threading
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.media import MediaFile, FinalReport, Metadata, DeepfakeResult, ForensicResult, FactCheckResult
from app.api.deps import get_current_user
from app.minio_utils import get_minio_client, ensure_bucket_exists, upload_file_to_minio
from app.config import settings

router = APIRouter()


def _run_analysis_in_background(media_id: str):
    """
    Runs the full forensic analysis pipeline in a background thread.
    Uses sync DB session since this runs outside the async event loop.
    """
    import os
    import tempfile
    import io
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.agents.orchestrator import orchestrator_app
    from app.models.media import MediaFile, DeepfakeResult, ForensicResult, FactCheckResult, FinalReport, Metadata
    from app.minio_utils import get_minio_client
    from app.config import settings
    from app.pdf_report import generate_pdf_report

    from app.database import clean_database_url
    raw_url = clean_database_url(settings.DATABASE_URL)
    SYNC_DB_URL = raw_url.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(SYNC_DB_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()
    media = None
    tmp_path = None
    try:
        media_uuid = uuid.UUID(media_id)
        media = db.query(MediaFile).filter(MediaFile.media_id == media_uuid).first()
        if not media:
            print(f"[Analysis] Media {media_id} not found in DB")
            return

        media.status = "processing"
        db.commit()

        # Download file from MinIO
        minio_client = get_minio_client()
        bucket, object_name = media.storage_path.split("/", 1)

        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{media.filename}") as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.close()

        minio_client.fget_object(bucket, object_name, tmp_path)

        # Run the LangGraph orchestrator
        initial_state = {
            "media_id": media_id,
            "file_path": tmp_path,
            "media_type": media.media_type,
            "metadata_result": None,
            "deepfake_result": None,
            "forensic_result": None,
            "fact_check_result": None,
            "aggregated_evidence": None,
            "trust_score": None,
            "risk_level": None,
            "report_text": None,
            "explanations": [],
            "errors": []
        }

        print(f"[Analysis] Starting orchestrator for {media_id}")
        final_state = orchestrator_app.invoke(initial_state)
        print(f"[Analysis] Orchestrator completed for {media_id}")

        # Persist results to DB
        m_result = final_state.get("metadata_result") or {}
        db_meta = Metadata(
            media_id=media_uuid,
            exif_data=m_result.get("exif_data"),
            gps_lat=m_result.get("gps_lat"),
            gps_lng=m_result.get("gps_lng"),
            camera_make=m_result.get("camera_make"),
            camera_model=m_result.get("camera_model"),
            software_used=m_result.get("software_used"),
            flags=m_result.get("flags")
        )
        db.add(db_meta)

        d_result = final_state.get("deepfake_result") or {}
        db_deepfake = DeepfakeResult(
            media_id=media_uuid,
            probability_fake=d_result.get("probability_fake"),
            verdict=d_result.get("verdict"),
            confidence=d_result.get("confidence"),
            model_version=d_result.get("model_version", "heuristic-v1")
        )
        db.add(db_deepfake)

        # Upload heatmap if available
        heatmap_bytes = d_result.get("heatmap_bytes") or (final_state.get("forensic_result") or {}).get("heatmap_bytes")
        if heatmap_bytes:
            heatmap_obj_name = f"heatmaps/{media_id}_heatmap.jpg"
            minio_client.put_object(
                bucket, heatmap_obj_name,
                io.BytesIO(heatmap_bytes),
                len(heatmap_bytes),
                content_type="image/jpeg"
            )
            db_deepfake.heatmap_path = f"{bucket}/{heatmap_obj_name}"

        f_result = final_state.get("forensic_result") or {}
        details = f_result.get("details") or {}
        f_result_serializable = {k: v for k, v in f_result.items() if k != "heatmap_bytes"}
        db_forensic = ForensicResult(
            media_id=media_uuid,
            ela_score=details.get("ela_score"),
            shadow_score=details.get("shadow_score"),
            lighting_score=details.get("lighting_score"),
            compression_score=details.get("compression_score"),
            copy_move_detected=details.get("copy_move_detected"),
            details=f_result_serializable
        )
        db.add(db_forensic)

        fc_result = final_state.get("fact_check_result") or {}
        db_fact = FactCheckResult(
            media_id=media_uuid,
            reverse_search_matches=fc_result.get("reverse_search_matches"),
            ocr_text=fc_result.get("ocr_text"),
            verified_sources=fc_result.get("verified_sources"),
            context_flags=fc_result.get("context_flags")
        )
        db.add(db_fact)

        db_report = FinalReport(
            media_id=media_uuid,
            trust_score=final_state.get("trust_score"),
            risk_level=final_state.get("risk_level"),
            ai_summary=final_state.get("report_text")
        )
        db.add(db_report)
        db.flush()

        # Generate PDF
        evidence = final_state.get("aggregated_evidence") or {}
        sub_scores = evidence.get("sub_scores", {})
        try:
            pdf_bytes = generate_pdf_report(
                media_filename=media.filename,
                trust_score=final_state.get("trust_score") or 0,
                risk_level=final_state.get("risk_level") or "Unknown",
                report_text=final_state.get("report_text") or "",
                sub_scores=sub_scores,
                forensic=f_result
            )
            pdf_obj_name = f"reports/{media_id}_report.pdf"
            minio_client.put_object(
                bucket, pdf_obj_name,
                io.BytesIO(pdf_bytes), len(pdf_bytes),
                content_type="application/pdf"
            )
            db_report.pdf_path = f"{bucket}/{pdf_obj_name}"
        except Exception as pdf_err:
            print(f"[Analysis] PDF generation failed (non-fatal): {pdf_err}")

        media.status = "completed"
        db.commit()
        print(f"[Analysis] SUCCESS Completed for {media_id}, trust_score={final_state.get('trust_score')}")

    except Exception as exc:
        print(f"[Analysis] ERROR Failed for {media_id}: {exc}")
        import traceback
        traceback.print_exc()
        db.rollback()
        if media:
            media.status = "failed"
            db.commit()
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
        db.close()
        engine.dispose()


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

    # Dispatch analysis: Prefer Celery worker in production if available, fall back to background thread
    dispatched = False
    try:
        from app.worker.tasks import run_analysis_pipeline
        run_analysis_pipeline.delay(str(new_media.media_id))
        dispatched = True
        print(f"[Dispatch] Dispatched task to Celery for {new_media.media_id}")
    except Exception as celery_err:
        print(f"[Dispatch] Celery not active ({celery_err}), falling back to background thread")

    if not dispatched:
        thread = threading.Thread(
            target=_run_analysis_in_background,
            args=(str(new_media.media_id),),
            daemon=True
        )
        thread.start()

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
    """Check processing status for a media file."""
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
        return {
            "media_id": str(media_id),
            "status": media.status,
            "filename": media.filename,
            "media_type": media.media_type,
            "message": "Analysis in progress" if media.status in ("pending", "processing") else "Analysis failed"
        }

    report = media.final_report
    meta = media.metadata_info
    deepfake = media.deepfake_result
    forensic = media.forensic_result
    fact_check = media.fact_check_result

    forensic_details = forensic.details if forensic and forensic.details else {}

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
            "deepfake_authenticity_score": round(100.0 - (deepfake.probability_fake or 0.0), 2) if deepfake and deepfake.probability_fake is not None else None,
        },
        "forensic": {
            "ela_score": forensic.ela_score if forensic else None,
            "shadow_score": forensic.shadow_score if forensic else None,
            "lighting_score": forensic.lighting_score if forensic else None,
            "compression_score": forensic.compression_score if forensic else None,
            "copy_move_detected": forensic.copy_move_detected if forensic else None,
            "forensic_consistency_score": forensic_details.get("forensic_consistency_score") if forensic_details else None,
            "details": forensic_details,
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


@router.get("")
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
