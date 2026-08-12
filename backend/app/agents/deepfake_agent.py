import cv2
import numpy as np
from PIL import Image
from io import BytesIO
from typing import Dict, Any, Optional
import base64


def _detect_faces(image_bytes: bytes) -> Dict[str, Any]:
    """
    Detect faces in an image using OpenCV's Haar Cascade as a fallback
    (RetinaFace or MTCNN can be integrated here when available).
    Returns bounding boxes and count.
    """
    try:
        np_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if img is None:
            return {"faces_detected": 0, "bounding_boxes": []}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Use OpenCV's built-in face detector as fallback
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        bounding_boxes = []
        for (x, y, w, h) in faces:
            bounding_boxes.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h)})

        # Draw boxes on image for visualization
        for box in bounding_boxes:
            cv2.rectangle(img, (box["x"], box["y"]),
                          (box["x"] + box["w"], box["y"] + box["h"]),
                          (0, 255, 0), 2)

        _, face_img_buffer = cv2.imencode(".jpg", img)
        face_annotated_bytes = face_img_buffer.tobytes()

        return {
            "faces_detected": len(bounding_boxes),
            "bounding_boxes": bounding_boxes,
            "annotated_image_bytes": face_annotated_bytes
        }
    except Exception as e:
        return {"faces_detected": 0, "bounding_boxes": [], "error": str(e)}


def _detect_gan_artifacts(image_bytes: bytes) -> Dict[str, Any]:
    """
    GAN artifact detection heuristic.
    Checks for periodic noise patterns in the frequency domain (FFT analysis)
    that are characteristic of GAN-generated images.
    """
    try:
        np_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return {"gan_artifact_score": 0.0, "ai_generated_suspected": False}

        # FFT analysis
        f = np.fft.fft2(img.astype(np.float32))
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = np.log(np.abs(fshift) + 1)

        # GAN images often have periodic/uniform frequency patterns
        # High uniformity in the spectrum suggests synthetic generation
        spectrum_std = float(np.std(magnitude_spectrum))
        spectrum_mean = float(np.mean(magnitude_spectrum))

        # Normalized score: lower STD relative to mean = more uniform = more likely AI generated
        uniformity_ratio = spectrum_std / (spectrum_mean + 1e-6)
        gan_artifact_score = max(0.0, min(100.0, (1.0 - uniformity_ratio) * 100.0))

        ai_generated_suspected = gan_artifact_score > 60.0

        return {
            "gan_artifact_score": round(gan_artifact_score, 2),
            "spectrum_std": round(spectrum_std, 4),
            "ai_generated_suspected": ai_generated_suspected
        }
    except Exception as e:
        return {"gan_artifact_score": 0.0, "ai_generated_suspected": False, "error": str(e)}


def _analyze_texture_consistency(image_bytes: bytes) -> float:
    """
    Analyzes texture consistency across different image regions.
    Inconsistent textures (especially near face boundaries) can indicate face swaps.
    Returns a score 0-100 where higher = more consistent (more likely real).
    """
    try:
        np_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_array, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 75.0

        h, w = img.shape
        # Divide into quadrants and compare Laplacian variance (sharpness proxy)
        regions = [
            img[:h//2, :w//2],
            img[:h//2, w//2:],
            img[h//2:, :w//2],
            img[h//2:, w//2:]
        ]

        variances = [cv2.Laplacian(r, cv2.CV_64F).var() for r in regions]
        variance_of_variances = float(np.var(variances))

        # High variance between quadrants = inconsistent = face swap likely
        consistency_score = max(0.0, 100.0 - min(100.0, variance_of_variances / 10.0))
        return round(consistency_score, 2)
    except Exception:
        return 75.0


def run_deepfake_agent(file_bytes: bytes, media_type: str) -> Dict[str, Any]:
    """
    Main Deepfake Agent function.
    Runs face detection, GAN artifact analysis, and texture consistency checks.
    Returns structured results including a deepfake probability and verdict.
    """
    result = {
        "face_detection": {},
        "gan_artifacts": {},
        "texture_consistency_score": 75.0,
        "probability_fake": 0.0,
        "verdict": "uncertain",
        "confidence": 0.0,
        "model_version": "heuristic-v1",
        "deepfake_authenticity_score": 100.0,
        "heatmap_bytes": None
    }

    if media_type not in ["image", "video"]:
        # For audio, stub voice clone detection
        result["voice_clone_detection"] = {
            "status": "stub",
            "note": "Voice clone detection requires spectrogram model — stub for audio media"
        }
        result["probability_fake"] = 0.0
        result["verdict"] = "uncertain"
        result["deepfake_authenticity_score"] = 50.0
        return result

    # Run face detection
    face_result = _detect_faces(file_bytes)
    result["face_detection"] = {k: v for k, v in face_result.items() if k != "annotated_image_bytes"}
    result["heatmap_bytes"] = face_result.get("annotated_image_bytes")

    # Run GAN artifact detection
    gan_result = _detect_gan_artifacts(file_bytes)
    result["gan_artifacts"] = gan_result

    # Texture consistency
    texture_score = _analyze_texture_consistency(file_bytes)
    result["texture_consistency_score"] = texture_score

    # --- Compute overall fake probability ---
    fake_probability = 0.0

    if gan_result.get("ai_generated_suspected"):
        fake_probability += 50.0
    else:
        fake_probability += gan_result.get("gan_artifact_score", 0.0) * 0.4

    # Low texture consistency = higher fake probability
    texture_contribution = max(0.0, (100.0 - texture_score) * 0.3)
    fake_probability += texture_contribution

    fake_probability = round(min(100.0, fake_probability), 2)
    result["probability_fake"] = fake_probability

    # Verdict
    if fake_probability >= 70.0:
        result["verdict"] = "fake"
    elif fake_probability >= 35.0:
        result["verdict"] = "uncertain"
    else:
        result["verdict"] = "real"

    result["confidence"] = round(abs(fake_probability - 50.0) / 50.0, 4)
    result["deepfake_authenticity_score"] = round(max(0.0, 100.0 - fake_probability), 2)

    return result
