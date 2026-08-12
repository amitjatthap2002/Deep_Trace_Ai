from typing import Dict, Any


def aggregate_evidence(
    metadata_result: Dict[str, Any],
    deepfake_result: Dict[str, Any],
    forensic_result: Dict[str, Any],
    fact_check_result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Merges results from all 4 parallel agents into a single structured evidence object.
    Handles graceful degradation: missing agent results are replaced with defaults.
    """
    # Use defaults if any agent failed
    metadata = metadata_result or {"metadata_integrity_score": 50.0, "flags": {}}
    deepfake = deepfake_result or {"deepfake_authenticity_score": 50.0, "probability_fake": 50.0, "verdict": "uncertain"}
    forensic = forensic_result or {"forensic_consistency_score": 50.0, "details": {}}
    fact_check = fact_check_result or {"context_verification_score": 50.0, "context_flags": []}

    return {
        "metadata": metadata,
        "deepfake": deepfake,
        "forensic": forensic,
        "fact_check": fact_check,
        "sub_scores": {
            "metadata_integrity_score": float(metadata.get("metadata_integrity_score", 50.0)),
            "deepfake_authenticity_score": float(deepfake.get("deepfake_authenticity_score", 50.0)),
            "forensic_consistency_score": float(forensic.get("forensic_consistency_score", 50.0)),
            "context_verification_score": float(fact_check.get("context_verification_score", 50.0)),
        }
    }


def calculate_trust_score(evidence: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes the final Trust Score (0-100) using the weighted scoring model.

    Weights (from prompt spec):
        metadata_integrity_score     -> 15%
        deepfake_authenticity_score  -> 35%
        forensic_consistency_score   -> 30%
        context_verification_score   -> 20%

    Risk level mapping:
        80-100 -> Low Risk (Likely Authentic)
        60-79  -> Medium Risk (Some Inconsistencies)
        35-59  -> High Risk (Likely Manipulated)
        0-34   -> Critical Risk (Strong Evidence of Manipulation)
    """
    sub_scores = evidence.get("sub_scores", {})

    metadata_score    = float(sub_scores.get("metadata_integrity_score", 50.0))
    deepfake_score    = float(sub_scores.get("deepfake_authenticity_score", 50.0))
    forensic_score    = float(sub_scores.get("forensic_consistency_score", 50.0))
    fact_check_score  = float(sub_scores.get("context_verification_score", 50.0))

    trust_score = round(
        0.15 * metadata_score +
        0.35 * deepfake_score +
        0.30 * forensic_score +
        0.20 * fact_check_score,
        2
    )

    # Risk level mapping
    if trust_score >= 80:
        risk_level = "Low Risk"
    elif trust_score >= 60:
        risk_level = "Medium Risk"
    elif trust_score >= 35:
        risk_level = "High Risk"
    else:
        risk_level = "Critical Risk"

    # Explain which checks contributed positively/negatively
    explanations = []
    if metadata_score < 60:
        explanations.append(f"Metadata integrity is low ({metadata_score:.1f}/100) — possible editing software or stripped EXIF.")
    if deepfake_score < 60:
        explanations.append(f"Deepfake analysis flagged potential manipulation ({deepfake_score:.1f}/100).")
    if forensic_score < 60:
        explanations.append(f"Forensic analysis found inconsistencies ({forensic_score:.1f}/100) — check ELA and copy-move results.")
    if fact_check_score < 60:
        explanations.append(f"Context verification raised concerns ({fact_check_score:.1f}/100) — sensational language or unverified sources.")

    return {
        "trust_score": trust_score,
        "risk_level": risk_level,
        "sub_scores": sub_scores,
        "explanations": explanations
    }
