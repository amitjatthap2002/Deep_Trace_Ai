import exifread
import hashlib
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from datetime import datetime
from io import BytesIO
from typing import Dict, Any, Optional, Tuple
import imagehash


def _get_exif_data_pillow(image_bytes: bytes) -> Dict[str, Any]:
    """Extract raw EXIF data using Pillow."""
    exif_data = {}
    try:
        img = Image.open(BytesIO(image_bytes))
        raw_exif = img._getexif()
        if raw_exif:
            for tag_id, value in raw_exif.items():
                tag = TAGS.get(tag_id, tag_id)
                exif_data[tag] = str(value)
    except Exception as e:
        exif_data["error"] = str(e)
    return exif_data


def _get_gps_coordinates(image_bytes: bytes) -> Tuple[Optional[float], Optional[float]]:
    """Extract GPS Lat/Lng from EXIF GPS data."""
    try:
        img = Image.open(BytesIO(image_bytes))
        raw_exif = img._getexif()
        if not raw_exif:
            return None, None
        gps_info = {}
        for tag_id, value in raw_exif.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag] = gps_value
        
        if not gps_info:
            return None, None
        
        def _convert_dms_to_dd(dms, ref):
            degrees = float(dms[0])
            minutes = float(dms[1]) / 60
            seconds = float(dms[2]) / 3600
            dd = degrees + minutes + seconds
            if ref in ['S', 'W']:
                dd *= -1
            return round(dd, 6)
        
        lat = _convert_dms_to_dd(gps_info.get("GPSLatitude"), gps_info.get("GPSLatitudeRef", "N"))
        lng = _convert_dms_to_dd(gps_info.get("GPSLongitude"), gps_info.get("GPSLongitudeRef", "E"))
        return lat, lng
    except Exception:
        return None, None


def _detect_flags(exif_data: Dict[str, Any]) -> Dict[str, Any]:
    """Detect suspicious flags from EXIF metadata."""
    flags = {}
    
    software = exif_data.get("Software", "")
    suspicious_software = ["photoshop", "gimp", "lightroom", "affinity", "pixelmator", "ffmpeg"]
    for sw in suspicious_software:
        if sw.lower() in software.lower():
            flags["editing_software_detected"] = software
            break
    
    # Check if metadata has been stripped
    if not exif_data or len(exif_data) < 3:
        flags["metadata_stripped"] = True
    
    # Check timestamp inconsistency
    original_dt = exif_data.get("DateTimeOriginal")
    modified_dt = exif_data.get("DateTime")
    if original_dt and modified_dt and original_dt != modified_dt:
        flags["timestamp_inconsistency"] = {
            "original": original_dt,
            "modified": modified_dt
        }
    
    return flags


def run_metadata_agent(file_path: str, file_bytes: bytes, media_type: str) -> Dict[str, Any]:
    """
    Main Metadata Agent function.
    Extracts EXIF, GPS, camera info, timestamps, and generates SHA256 + perceptual hash.
    Returns a structured dict with findings and flags.
    """
    result = {
        "exif_data": {},
        "gps_lat": None,
        "gps_lng": None,
        "capture_timestamp": None,
        "camera_make": None,
        "camera_model": None,
        "software_used": None,
        "sha256_hash": None,
        "perceptual_hash": None,
        "flags": {},
        "metadata_integrity_score": 100.0
    }

    # SHA256 hash
    result["sha256_hash"] = hashlib.sha256(file_bytes).hexdigest()

    if media_type == "image":
        # Extract EXIF via Pillow
        exif_data = _get_exif_data_pillow(file_bytes)
        result["exif_data"] = exif_data

        # Also extract with exifread for more completeness
        try:
            tags = exifread.process_file(BytesIO(file_bytes), stop_tag="UNDEF", details=True)
            for tag, val in tags.items():
                if tag not in result["exif_data"]:
                    result["exif_data"][tag] = str(val)
        except Exception:
            pass

        # GPS
        lat, lng = _get_gps_coordinates(file_bytes)
        result["gps_lat"] = lat
        result["gps_lng"] = lng

        # Camera Info
        result["camera_make"] = exif_data.get("Make")
        result["camera_model"] = exif_data.get("Model")
        result["software_used"] = exif_data.get("Software")

        # Capture timestamp
        dt_str = exif_data.get("DateTimeOriginal") or exif_data.get("DateTime")
        if dt_str:
            try:
                result["capture_timestamp"] = datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S").isoformat()
            except Exception:
                pass

        # Perceptual hash (imagehash)
        try:
            img = Image.open(BytesIO(file_bytes))
            result["perceptual_hash"] = str(imagehash.phash(img))
        except Exception:
            pass

        # Detect flags
        flags = _detect_flags(exif_data)
        result["flags"] = flags

        # Calculate metadata integrity score
        score = 100.0
        if flags.get("metadata_stripped"):
            score -= 30
        if flags.get("editing_software_detected"):
            score -= 25
        if flags.get("timestamp_inconsistency"):
            score -= 20
        result["metadata_integrity_score"] = max(0.0, score)

    return result
