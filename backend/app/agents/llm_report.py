import os
from typing import Dict, Any
import anthropic

try:
    from app.config import settings
except ImportError:
    from config import settings  # type: ignore


def generate_llm_report(evidence: Dict[str, Any], trust_score_data: Dict[str, Any]) -> str:
    """
    Sends the aggregated forensic evidence to Claude (Anthropic) API to generate
    a human-readable, explainable forensic report.
    Falls back to a template-based report if no API key is set.
    """
    api_key = (settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY", "")).strip()

    trust_score = trust_score_data.get("trust_score", 0)
    risk_level = trust_score_data.get("risk_level", "Unknown")
    sub_scores = trust_score_data.get("sub_scores", {})
    explanations = trust_score_data.get("explanations", [])

    metadata = evidence.get("metadata", {})
    deepfake = evidence.get("deepfake", {})
    forensic = evidence.get("forensic", {})
    fact_check = evidence.get("fact_check", {})

    if api_key:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            prompt = f"""
You are a professional digital media forensic analyst. You have been given the following analysis data 
from an AI-powered forensics pipeline examining a piece of digital media.

Please write a comprehensive, professional forensic report with:
1. An executive summary (2-3 sentences)
2. Key red flags discovered
3. Confidence reasoning for the trust score
4. A final recommendation

--- ANALYSIS DATA ---
Trust Score: {trust_score}/100
Risk Level: {risk_level}

Sub-Scores:
- Metadata Integrity: {sub_scores.get('metadata_integrity_score', 'N/A')}/100
- Deepfake Authenticity: {sub_scores.get('deepfake_authenticity_score', 'N/A')}/100
- Forensic Consistency: {sub_scores.get('forensic_consistency_score', 'N/A')}/100
- Context Verification: {sub_scores.get('context_verification_score', 'N/A')}/100

Metadata Agent Flags: {metadata.get('flags', {})}
Software Detected: {metadata.get('software_used', 'None')}
Camera: {metadata.get('camera_make', 'Unknown')} {metadata.get('camera_model', '')}

Deepfake Agent:
- Face Count Detected: {deepfake.get('face_detection', {}).get('faces_detected', 0)}
- Fake Probability: {deepfake.get('probability_fake', 0)}%
- Verdict: {deepfake.get('verdict', 'uncertain')}
- GAN Artifacts Suspected: {deepfake.get('gan_artifacts', {}).get('ai_generated_suspected', False)}

Forensic Agent:
- ELA Score: {forensic.get('ela', {}).get('ela_score', 'N/A')} (suspicious: {forensic.get('ela', {}).get('suspicious', False)})
- Copy-Move Detected: {forensic.get('copy_move', {}).get('copy_move_detected', False)}
- Double Compressed: {forensic.get('compression', {}).get('double_compressed', False)}

Fact-Check Agent:
- OCR Text Found: {bool(fact_check.get('ocr_text', ''))}
- Context Flags: {fact_check.get('context_flags', [])}

Key Algorithmic Explanations:
{chr(10).join(f'- {e}' for e in explanations)}
---

Write the report in a clear, professional tone suitable for cybersecurity professionals and journalists.
"""
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            for block in message.content:
                if hasattr(block, "text"):
                    return getattr(block, "text")
            return str(message.content[0]) if message.content else ""
        except Exception as e:
            # Fall back to template
            return _generate_template_report(trust_score, risk_level, sub_scores, explanations, e)
    else:
        return _generate_template_report(trust_score, risk_level, sub_scores, explanations, None)


def _generate_template_report(trust_score, risk_level, sub_scores, explanations, error=None) -> str:
    """
    Template-based report when no LLM API key is available.
    """
    lines = [
        "# DeepTrace AI — Forensic Analysis Report",
        "",
        f"## Trust Score: {trust_score}/100 | Risk Level: {risk_level}",
        "",
        "## Executive Summary",
        f"This media file received a Trust Score of {trust_score}/100, placing it in the **{risk_level}** category.",
        "The analysis was performed using a multi-agent forensic pipeline including metadata analysis,",
        "deepfake detection, forensic consistency checks, and context verification.",
        "",
        "## Sub-Scores",
        f"- Metadata Integrity: {sub_scores.get('metadata_integrity_score', 'N/A')}/100",
        f"- Deepfake Authenticity: {sub_scores.get('deepfake_authenticity_score', 'N/A')}/100",
        f"- Forensic Consistency: {sub_scores.get('forensic_consistency_score', 'N/A')}/100",
        f"- Context Verification: {sub_scores.get('context_verification_score', 'N/A')}/100",
        "",
        "## Key Findings",
    ]

    if explanations:
        for finding in explanations:
            lines.append(f"- {finding}")
    else:
        lines.append("- No major anomalies detected. The media appears consistent across all forensic checks.")

    lines += [
        "",
        "## Recommendation",
        f"Based on the Trust Score of {trust_score}/100, this media is classified as **{risk_level}**.",
    ]

    if trust_score >= 80:
        lines.append("The media shows no significant signs of manipulation and is likely authentic.")
    elif trust_score >= 60:
        lines.append("Some minor inconsistencies were found. Manual review is recommended before publishing.")
    elif trust_score >= 35:
        lines.append("Significant forensic anomalies detected. This media should NOT be used without thorough manual verification.")
    else:
        lines.append("Strong evidence of manipulation. This media is very likely fake or heavily altered. Do NOT use or publish.")

    if error:
        lines += ["", f"*Note: LLM report generation was unavailable ({error}). This is a template-based report.*"]

    return "\n".join(lines)
