import cv2
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
from io import BytesIO
from typing import Dict, Any


def _perform_ela(image_bytes: bytes, quality: int = 90) -> Dict[str, Any]:
    """
    Error Level Analysis (ELA).
    Re-compresses the image at a known quality and computes the difference.
    High-variance regions indicate possible tampering.
    """
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")

        # Save at given quality
        compressed_buffer = BytesIO()
        img.save(compressed_buffer, format="JPEG", quality=quality)
        compressed_buffer.seek(0)
        compressed_img = Image.open(compressed_buffer)

        # Difference between original and re-compressed
        diff = ImageChops.difference(img, compressed_img)
        diff = ImageEnhance.Brightness(diff).enhance(20)  # Amplify for visibility

        # Calculate ELA score as mean pixel difference
        diff_array = np.array(diff)
        ela_score = float(np.mean(diff_array))

        # Save heatmap to bytes for storage
        heatmap_buffer = BytesIO()
        diff.save(heatmap_buffer, format="PNG")
        heatmap_bytes = heatmap_buffer.getvalue()

        return {
            "ela_score": round(ela_score, 4),
            "heatmap_bytes": heatmap_bytes,
            "suspicious": ela_score > 15.0  # Threshold: higher means more suspicious
        }
    except Exception as e:
        return {"ela_score": None, "error": str(e), "suspicious": False}


def _detect_copy_move(image_bytes: bytes) -> Dict[str, Any]:
    """
    Copy-Move Forgery Detection using ORB feature matching.
    Detects duplicated regions within the same image.
    """
    try:
        np_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_GRAYSCALE)

        if img is None:
            return {"copy_move_detected": False, "matches_found": 0}

        # ORB detector
        orb = cv2.ORB_create(nfeatures=1000)
        keypoints, descriptors = orb.detectAndCompute(img, None)

        if descriptors is None or len(descriptors) < 10:
            return {"copy_move_detected": False, "matches_found": 0}

        # BruteForce matcher with Hamming distance
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(descriptors, descriptors)

        # Filter out self-matches and close-keypoint matches
        suspicious_matches = []
        for m in matches:
            kp1 = keypoints[m.queryIdx].pt
            kp2 = keypoints[m.trainIdx].pt
            dist = np.sqrt((kp1[0] - kp2[0])**2 + (kp1[1] - kp2[1])**2)
            if m.queryIdx != m.trainIdx and dist > 50:
                suspicious_matches.append(m)

        copy_move_detected = len(suspicious_matches) > 20

        return {
            "copy_move_detected": copy_move_detected,
            "matches_found": len(suspicious_matches)
        }
    except Exception as e:
        return {"copy_move_detected": False, "error": str(e)}


def _check_shadow_and_lighting(image_bytes: bytes) -> Dict[str, Any]:
    """
    Lighting and shadow consistency heuristic check using OpenCV.
    Computes gradient direction variance as a proxy for lighting consistency.
    """
    try:
        np_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_GRAYSCALE)

        if img is None:
            return {"shadow_score": 50.0, "lighting_score": 50.0}

        # Compute Sobel gradients
        sobelx = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=5)
        sobely = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=5)
        gradient_direction = np.arctan2(sobely, sobelx) * (180 / np.pi)

        # Variance in gradient direction: higher = more inconsistent = lower score
        direction_variance = float(np.var(gradient_direction))
        
        # Normalize: low variance (consistent) -> high score, high variance -> low score
        shadow_score = max(0.0, 100.0 - min(100.0, direction_variance / 100.0))
        lighting_score = shadow_score  # Simplified: use same heuristic for both

        return {
            "shadow_score": round(shadow_score, 2),
            "lighting_score": round(lighting_score, 2),
            "gradient_variance": round(direction_variance, 2)
        }
    except Exception as e:
        return {"shadow_score": 50.0, "lighting_score": 50.0, "error": str(e)}


def _analyze_compression(image_bytes: bytes) -> Dict[str, Any]:
    """
    Detects double JPEG compression artifacts by analyzing DCT coefficient distribution.
    """
    try:
        np_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if img is None:
            return {"compression_score": 50.0, "double_compressed": False}

        # Convert to float and compute DCT on 8x8 blocks
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        h, w = gray.shape
        h = (h // 8) * 8
        w = (w // 8) * 8
        gray = gray[:h, :w]

        dct_coeffs = []
        for i in range(0, h, 8):
            for j in range(0, w, 8):
                block = gray[i:i+8, j:j+8]
                dct_block = cv2.dct(block)
                dct_coeffs.extend(dct_block.flatten().tolist())

        dct_array = np.array(dct_coeffs)
        std_dev = float(np.std(dct_array))

        # Very low std dev in DCT -> uniform compression -> suspicious
        double_compressed = std_dev < 50.0
        compression_score = min(100.0, std_dev)

        return {
            "compression_score": round(compression_score, 2),
            "double_compressed": double_compressed,
            "dct_std_dev": round(std_dev, 2)
        }
    except Exception as e:
        return {"compression_score": 50.0, "double_compressed": False, "error": str(e)}


def run_forensic_agent(file_bytes: bytes, media_type: str) -> Dict[str, Any]:
    """
    Main Forensic Agent function.
    Runs ELA, copy-move detection, shadow/lighting analysis, and compression analysis.
    Returns a structured dict with findings and a forensic_consistency_score.
    """
    result = {
        "ela": {},
        "copy_move": {},
        "shadow_lighting": {},
        "compression": {},
        "forensic_consistency_score": 100.0,
        "details": {}
    }

    if media_type not in ["image", "video"]:
        result["forensic_consistency_score"] = 75.0  # Default for non-image
        return result

    # --- Run each analysis ---
    ela_result = _perform_ela(file_bytes)
    copy_move_result = _detect_copy_move(file_bytes)
    shadow_result = _check_shadow_and_lighting(file_bytes)
    compression_result = _analyze_compression(file_bytes)

    result["ela"] = {k: v for k, v in ela_result.items() if k != "heatmap_bytes"}
    result["copy_move"] = copy_move_result
    result["shadow_lighting"] = shadow_result
    result["compression"] = compression_result
    result["heatmap_bytes"] = ela_result.get("heatmap_bytes")

    # --- Calculate forensic_consistency_score ---
    score = 100.0

    if ela_result.get("suspicious"):
        score -= 35.0
    if copy_move_result.get("copy_move_detected"):
        score -= 30.0
    if compression_result.get("double_compressed"):
        score -= 15.0

    # Integrate shadow/lighting score
    shadow_score = shadow_result.get("shadow_score", 50.0)
    lighting_score = shadow_result.get("lighting_score", 50.0)
    avg_consistency = (shadow_score + lighting_score) / 2
    score = score * (avg_consistency / 100.0)

    result["forensic_consistency_score"] = round(max(0.0, score), 2)
    result["details"] = {
        "ela_score": ela_result.get("ela_score"),
        "shadow_score": shadow_result.get("shadow_score"),
        "lighting_score": shadow_result.get("lighting_score"),
        "compression_score": compression_result.get("compression_score"),
        "copy_move_detected": copy_move_result.get("copy_move_detected"),
        "matches_found": copy_move_result.get("matches_found"),
    }

    return result
