import uuid
import os
import tempfile
from app.worker.celery import celery
from app.agents.orchestrator import orchestrator_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.media import MediaFile, DeepfakeResult, ForensicResult, FactCheckResult, FinalReport, Metadata
from app.minio_utils import get_minio_client
from app.config import settings
from app.pdf_report import generate_pdf_report
import io

from app.database import clean_database_url

_sync_engine = None
_SyncSessionLocal = None


def get_sync_db():
    global _sync_engine, _SyncSessionLocal
    if _SyncSessionLocal is None:
        raw_url = clean_database_url(settings.DATABASE_URL)
        sync_url = raw_url.replace("postgresql+asyncpg://", "postgresql://")
        _sync_engine = create_engine(sync_url)
        _SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_sync_engine)
    return _SyncSessionLocal()


@celery.task(bind=True, max_retries=3)
def run_analysis_pipeline(self, media_id: str):
    """
    Celery task: Downloads the media file from MinIO, runs the full LangGraph 
    orchestration pipeline, and saves all agent results to the database.
    """
    db = get_sync_db()
    try:
        # 1. Load MediaFile record
        media_uuid = uuid.UUID(media_id)
        media = db.query(MediaFile).filter(MediaFile.media_id == media_uuid).first()
        if not media:
            raise Exception(f"Media {media_id} not found in DB")

        # Update status to processing
        media.status = "processing"
        db.commit()

        # 2. Download file from MinIO to a temp file
        minio_client = get_minio_client()
        # storage_path is "bucket/object_name"
        bucket, object_name = media.storage_path.split("/", 1)

        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{media.filename}") as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.close()
        minio_client.fget_object(bucket, object_name, tmp_path)

        # 3. Run the LangGraph orchestrator
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
            "errors": []
        }

        final_state = orchestrator_app.invoke(initial_state)

        # 4. Persist agent results to DB
        # Metadata
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

        # Deepfake
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
        heatmap_path = None
        heatmap_bytes = d_result.get("heatmap_bytes") or (final_state.get("forensic_result") or {}).get("heatmap_bytes")
        if heatmap_bytes:
            heatmap_obj_name = f"heatmaps/{media_id}_heatmap.jpg"
            minio_client.put_object(
                bucket, heatmap_obj_name,
                io.BytesIO(heatmap_bytes),
                len(heatmap_bytes),
                content_type="image/jpeg"
            )
            heatmap_path = f"{bucket}/{heatmap_obj_name}"
            db_deepfake.heatmap_path = heatmap_path

        # Forensic
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

        # Fact-Check
        fc_result = final_state.get("fact_check_result") or {}
        db_fact = FactCheckResult(
            media_id=media_uuid,
            reverse_search_matches=fc_result.get("reverse_search_matches"),
            ocr_text=fc_result.get("ocr_text"),
            verified_sources=fc_result.get("verified_sources"),
            context_flags=fc_result.get("context_flags")
        )
        db.add(db_fact)

        # Final Report
        db_report = FinalReport(
            media_id=media_uuid,
            trust_score=final_state.get("trust_score"),
            risk_level=final_state.get("risk_level"),
            ai_summary=final_state.get("report_text")
        )
        db.add(db_report)
        db.flush()  # Get the report_id

        # --- Generate PDF ---
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
            print(f"PDF generation failed (non-fatal): {pdf_err}")

        # Mark media as completed
        media.status = "completed"
        db.commit()

        # Cleanup temp file
        os.unlink(tmp_path)

        return {"status": "completed", "media_id": media_id, "trust_score": final_state.get("trust_score")}

    except Exception as exc:
        db.rollback()
        if media:
            media.status = "failed"
            db.commit()
        raise self.retry(exc=exc, countdown=10)
    finally:
        db.close()
