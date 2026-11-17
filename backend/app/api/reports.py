# Re-export media router for backwards compatibility
from app.api.media import router, _run_analysis_in_background, upload_media, get_media_status, get_report, download_pdf_report, list_media, delete_media

__all__ = [
    "router",
    "_run_analysis_in_background",
    "upload_media",
    "get_media_status",
    "get_report",
    "download_pdf_report",
    "list_media",
    "delete_media",
]
