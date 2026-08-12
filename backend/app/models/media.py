import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, BigInteger, ForeignKey, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class MediaFile(Base):
    __tablename__ = "media_file"

    media_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    filename = Column(String, nullable=False)
    media_type = Column(String, nullable=False) # image/video/audio/document
    storage_path = Column(String, nullable=False)
    sha256_hash = Column(String, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending") # pending/processing/completed/failed

    user = relationship("User", backref="media_files")
    metadata_info = relationship("Metadata", back_populates="media_file", uselist=False)
    deepfake_result = relationship("DeepfakeResult", back_populates="media_file", uselist=False)
    forensic_result = relationship("ForensicResult", back_populates="media_file", uselist=False)
    fact_check_result = relationship("FactCheckResult", back_populates="media_file", uselist=False)
    final_report = relationship("FinalReport", back_populates="media_file", uselist=False)

class Metadata(Base):
    __tablename__ = "metadata"

    metadata_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media_file.media_id"), nullable=False)
    exif_data = Column(JSONB, nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    capture_timestamp = Column(DateTime, nullable=True)
    camera_make = Column(String, nullable=True)
    camera_model = Column(String, nullable=True)
    software_used = Column(String, nullable=True)
    flags = Column(JSONB, nullable=True)

    media_file = relationship("MediaFile", back_populates="metadata_info")

class DeepfakeResult(Base):
    __tablename__ = "deepfake_result"

    result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media_file.media_id"), nullable=False)
    probability_fake = Column(Float, nullable=True)
    verdict = Column(String, nullable=True) # real/fake/uncertain
    confidence = Column(Float, nullable=True)
    heatmap_path = Column(String, nullable=True)
    model_version = Column(String, nullable=True)

    media_file = relationship("MediaFile", back_populates="deepfake_result")

class ForensicResult(Base):
    __tablename__ = "forensic_result"

    forensic_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media_file.media_id"), nullable=False)
    ela_score = Column(Float, nullable=True)
    shadow_score = Column(Float, nullable=True)
    lighting_score = Column(Float, nullable=True)
    compression_score = Column(Float, nullable=True)
    copy_move_detected = Column(Boolean, nullable=True)
    camera_fingerprint_match = Column(Boolean, nullable=True)
    details = Column(JSONB, nullable=True)

    media_file = relationship("MediaFile", back_populates="forensic_result")

class FactCheckResult(Base):
    __tablename__ = "fact_check_result"

    fact_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media_file.media_id"), nullable=False)
    reverse_search_matches = Column(JSONB, nullable=True)
    ocr_text = Column(String, nullable=True)
    verified_sources = Column(JSONB, nullable=True)
    first_seen_date = Column(DateTime, nullable=True)
    context_flags = Column(JSONB, nullable=True)

    media_file = relationship("MediaFile", back_populates="fact_check_result")

class FinalReport(Base):
    __tablename__ = "final_report"

    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media_file.media_id"), nullable=False)
    trust_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
    ai_summary = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    media_file = relationship("MediaFile", back_populates="final_report")
