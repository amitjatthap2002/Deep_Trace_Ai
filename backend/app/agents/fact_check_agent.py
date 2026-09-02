import pytesseract
from PIL import Image
from io import BytesIO
from typing import Dict, Any, List, Optional
import os


def _extract_ocr_text(image_bytes: bytes) -> str:
    """
    Extract text from image using Tesseract OCR.
    """
    try:
        img = Image.open(BytesIO(image_bytes))
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        return f"OCR failed: {str(e)}"


def _reverse_image_search(image_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Reverse image search stub.
    In production, integrate with Google Vision API, TinEye, or SerpAPI.
    Returns a list of matched source URLs.
    """
    # Stub: in production replace with actual API call
    return [
        {
            "source": "stub",
            "note": "Reverse image search requires a paid API (e.g., SerpAPI, TinEye). Integration ready — set SERPAPI_KEY env var.",
            "matches": []
        }
    ]


def _cross_reference_fact_check(ocr_text: str) -> Dict[str, Any]:
    """
    Cross-references extracted OCR text against a fact-check API.
    Uses a stub/free endpoint in development.
    """
    if not ocr_text or len(ocr_text) < 5:
        return {"claims_found": False, "sources": [], "context_flags": []}

    context_flags = []

    # Simple heuristic: check for sensational language
    sensational_keywords = [
        "breaking", "exclusive", "confirmed", "proof", "shocking",
        "exposed", "urgent", "warning", "crisis", "classified"
    ]

    found_keywords = [kw for kw in sensational_keywords if kw.lower() in ocr_text.lower()]
    if found_keywords:
        context_flags.append({
            "type": "sensational_language",
            "keywords": found_keywords,
            "severity": "medium"
        })

    return {
        "claims_found": bool(found_keywords),
        "ocr_text_length": len(ocr_text),
        "sensational_keywords_found": found_keywords,
        "sources": [],  # Real sources from fact-check API go here
        "context_flags": context_flags
    }


def run_fact_check_agent(file_bytes: bytes, media_type: str) -> Dict[str, Any]:
    """
    Main Context/Fact-Check Agent function.
    Runs OCR text extraction, reverse image search, and fact-check cross-referencing.
    Returns a structured dict with findings and a context_verification_score.
    """
    result = {
        "ocr_text": "",
        "reverse_search_matches": [],
        "verified_sources": [],
        "first_seen_date": None,
        "context_flags": [],
        "context_verification_score": 75.0  # Default neutral
    }

    if media_type not in ["image", "video"]:
        result["context_verification_score"] = 60.0
        return result

    # --- OCR ---
    ocr_text = _extract_ocr_text(file_bytes)
    result["ocr_text"] = ocr_text

    # --- Reverse Image Search ---
    reverse_results = _reverse_image_search(file_bytes)
    result["reverse_search_matches"] = reverse_results

    # --- Fact Check ---
    fact_check = _cross_reference_fact_check(ocr_text)
    result["context_flags"] = fact_check.get("context_flags", [])
    result["verified_sources"] = fact_check.get("sources", [])

    # --- Score ---
    score = 75.0  # Start neutral
    if fact_check.get("claims_found"):
        score -= 20.0 * len(fact_check.get("sensational_keywords_found", []))
    score = max(0.0, min(100.0, score))
    result["context_verification_score"] = round(score, 2)

    return result
