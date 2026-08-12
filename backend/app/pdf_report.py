from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, Optional


def _get_risk_color(risk_level: str):
    mapping = {
        "Low Risk": colors.HexColor("#22c55e"),
        "Medium Risk": colors.HexColor("#f59e0b"),
        "High Risk": colors.HexColor("#f97316"),
        "Critical Risk": colors.HexColor("#ef4444"),
    }
    return mapping.get(risk_level, colors.grey)


def _draw_trust_score_gauge(trust_score: float, risk_level: str) -> Drawing:
    """Draws a simple horizontal trust score bar."""
    d = Drawing(400, 50)
    # Background bar
    d.add(Rect(0, 10, 400, 30, fillColor=colors.HexColor("#1e293b"), strokeColor=None))
    # Score bar
    bar_width = max(0, min(400, (trust_score / 100) * 400))
    d.add(Rect(0, 10, bar_width, 30, fillColor=_get_risk_color(risk_level), strokeColor=None))
    # Label
    d.add(String(205, 20, f"{trust_score:.1f} / 100", fontSize=12, fillColor=colors.white, textAnchor='middle'))
    return d


def generate_pdf_report(
    media_filename: str,
    trust_score: float,
    risk_level: str,
    report_text: str,
    sub_scores: Dict[str, float],
    metadata: Optional[Dict[str, Any]] = None,
    deepfake: Optional[Dict[str, Any]] = None,
    forensic: Optional[Dict[str, Any]] = None,
    fact_check: Optional[Dict[str, Any]] = None,
) -> bytes:
    """
    Generates a professional PDF forensic report using ReportLab.
    Returns the PDF as bytes.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=f"DeepTrace AI Forensic Report — {media_filename}"
    )

    styles = getSampleStyleSheet()
    risk_color = _get_risk_color(risk_level)

    # --- Custom styles ---
    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Title"],
        fontSize=22, textColor=colors.HexColor("#0ea5e9"), spaceAfter=4
    )
    heading_style = ParagraphStyle(
        "HeadingStyle", parent=styles["Heading2"],
        fontSize=14, textColor=colors.HexColor("#0ea5e9"), spaceBefore=12, spaceAfter=4
    )
    body_style = ParagraphStyle(
        "BodyStyle", parent=styles["Normal"],
        fontSize=10, leading=14, textColor=colors.HexColor("#334155")
    )
    caption_style = ParagraphStyle(
        "CaptionStyle", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#64748b"), italic=True
    )

    story = []

    # === HEADER ===
    story.append(Paragraph("DeepTrace AI", title_style))
    story.append(Paragraph("Digital Media Forensic Analysis Report", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0ea5e9")))
    story.append(Spacer(1, 10))

    # === META INFO TABLE ===
    meta_info = [
        ["File Analyzed:", media_filename],
        ["Report Generated:", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")],
        ["Risk Level:", risk_level],
    ]
    meta_table = Table(meta_info, colWidths=[1.8 * inch, 4.5 * inch])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (1, 2), (1, 2), risk_color),
        ('FONTNAME', (1, 2), (1, 2), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # === TRUST SCORE GAUGE ===
    story.append(Paragraph("Trust Score", heading_style))
    gauge = _draw_trust_score_gauge(trust_score, risk_level)
    story.append(gauge)
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Classification: <b>{risk_level}</b>", caption_style))
    story.append(Spacer(1, 12))

    # === SUB-SCORES TABLE ===
    story.append(Paragraph("Sub-Score Breakdown", heading_style))
    sub_score_data = [
        ["Analysis Module", "Score (0-100)", "Weight"],
        ["Metadata Integrity", f"{sub_scores.get('metadata_integrity_score', 'N/A'):.1f}", "15%"],
        ["Deepfake Authenticity", f"{sub_scores.get('deepfake_authenticity_score', 'N/A'):.1f}", "35%"],
        ["Forensic Consistency", f"{sub_scores.get('forensic_consistency_score', 'N/A'):.1f}", "30%"],
        ["Context Verification", f"{sub_scores.get('context_verification_score', 'N/A'):.1f}", "20%"],
        ["FINAL TRUST SCORE", f"{trust_score:.1f}", "100%"],
    ]
    sub_table = Table(sub_score_data, colWidths=[3.0 * inch, 2.0 * inch, 1.5 * inch])
    sub_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0ea5e9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.HexColor("#f8fafc"), colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sub_table)
    story.append(Spacer(1, 14))

    # === AI REPORT TEXT ===
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1")))
    story.append(Paragraph("AI-Generated Forensic Analysis", heading_style))

    for line in (report_text or "No report generated.").split("\n"):
        cleaned = line.strip()
        if not cleaned:
            story.append(Spacer(1, 4))
        elif cleaned.startswith("## ") or cleaned.startswith("# "):
            story.append(Paragraph(cleaned.replace("## ", "").replace("# ", ""), heading_style))
        else:
            story.append(Paragraph(cleaned, body_style))

    story.append(Spacer(1, 12))

    # === FORENSIC DETAILS SECTION ===
    if forensic:
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1")))
        story.append(Paragraph("Forensic Analysis Details", heading_style))
        details = forensic.get("details", {})
        forensic_data = [
            ["Check", "Result"],
            ["ELA Score", str(details.get("ela_score", "N/A"))],
            ["ELA Suspicious", str(forensic.get("ela", {}).get("suspicious", "N/A"))],
            ["Copy-Move Detected", str(details.get("copy_move_detected", "N/A"))],
            ["Matches Found", str(details.get("matches_found", "N/A"))],
            ["Shadow Score", str(details.get("shadow_score", "N/A"))],
            ["Lighting Score", str(details.get("lighting_score", "N/A"))],
            ["Compression Score", str(details.get("compression_score", "N/A"))],
            ["Double Compressed", str(forensic.get("compression", {}).get("double_compressed", "N/A"))],
        ]
        f_table = Table(forensic_data, colWidths=[3.0 * inch, 3.5 * inch])
        f_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(f_table)
        story.append(Spacer(1, 12))

    # === FOOTER ===
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0ea5e9")))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This report was generated automatically by DeepTrace AI. Results are provided for investigative purposes only "
        "and should be reviewed by a qualified forensic professional before being used in legal or editorial contexts.",
        caption_style
    ))

    doc.build(story)
    return buffer.getvalue()
