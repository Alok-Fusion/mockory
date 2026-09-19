import io
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.models.session import InterviewSession, InterviewTurn
from backend.app.models.schemas import FinalReportResponse
from backend.app.services.llm import llm_service

logger = logging.getLogger(__name__)

async def generate_final_session_report(session: InterviewSession, turns: List[InterviewTurn]) -> Dict[str, Any]:
    """Assembles final report in pure code, utilizing small LLM calls for narrative sections."""
    if not turns:
        return FinalReportResponse(session_id=session.id).model_dump()

    # 1. Compute overall scores and round scores in code
    round_scores: Dict[str, List[float]] = {}
    skill_dimensions: Dict[str, List[float]] = {
        "relevance": [],
        "correctness": [],
        "depth": [],
        "structure": [],
        "communication": [],
        "confidence": []
    }
    all_mistakes: List[Dict[str, Any]] = []
    all_strengths: List[str] = []
    total_wpm_list: List[float] = []
    total_fillers: int = 0
    total_pauses: int = 0
    qa_review: List[Dict[str, Any]] = []

    for t in turns:
        # Extract evaluations
        ev = t.evaluation or {}
        sc = ev.get("scores", {}) if isinstance(ev, dict) else {}
        
        overall_turn_score = sc.get("overall", 7.0)
        round_key = t.round_type or "general"
        round_scores.setdefault(round_key, []).append(overall_turn_score)

        for dim in skill_dimensions.keys():
            if dim in sc:
                skill_dimensions[dim].append(sc[dim])

        # Mistakes & Strengths
        if isinstance(ev, dict):
            for m in ev.get("mistakes", []):
                if isinstance(m, dict):
                    all_mistakes.append(m)
            for g in ev.get("what_was_good", []):
                all_strengths.append(g)

        # Delivery metrics
        dm = t.delivery_metrics or {}
        if isinstance(dm, dict):
            if dm.get("wpm"):
                total_wpm_list.append(dm["wpm"])
            total_fillers += dm.get("fillers_count", 0)
            total_pauses += len(dm.get("pauses_over_2s", []))

        qa_review.append({
            "turn_index": t.turn_index,
            "round_type": t.round_type,
            "question": t.question_text,
            "answer": t.merged_answer or t.typed_text or t.voice_transcript or "",
            "scores": sc,
            "mistakes": ev.get("mistakes", []) if isinstance(ev, dict) else [],
            "what_was_good": ev.get("what_was_good", []) if isinstance(ev, dict) else [],
            "improved_answer": ev.get("improved_answer", "") if isinstance(ev, dict) else "",
            "tip": ev.get("tip", "") if isinstance(ev, dict) else ""
        })

    # Averages in code
    avg_round_scores = {r: round(sum(scores) / max(1, len(scores)), 1) for r, scores in round_scores.items()}
    avg_skill_radar = {d: round(sum(scores) / max(1, len(scores)), 1) if scores else 7.0 for d, scores in skill_dimensions.items()}
    overall_score = round(sum(avg_round_scores.values()) / max(1, len(avg_round_scores)), 1) if avg_round_scores else 7.0
    avg_wpm = round(sum(total_wpm_list) / max(1, len(total_wpm_list)), 1) if total_wpm_list else 135.0

    # Top strengths (deduplicated top 5)
    top_strengths = list(dict.fromkeys(all_strengths))[:5]
    if not top_strengths:
        top_strengths = ["Structured approach to problem breakdown", "Clear communication tone"]

    # Identify weak areas (dimensions under 7.0)
    weak_areas = [k for k, v in avg_skill_radar.items() if v < 7.0]

    # 2. Small LLM narrative calls
    plan_json = session.plan_json or {}
    skill_gaps = plan_json.get("skill_gaps", [])
    role = plan_json.get("role", "Software Engineer")
    jd_brief = session.jd_brief or ""

    narratives = await llm_service.generate_report_narratives(
        role=role,
        jd_brief=jd_brief,
        skill_gaps=skill_gaps,
        all_mistakes=all_mistakes,
        weak_areas=weak_areas
    )

    report = {
        "session_id": session.id,
        "overall_score": overall_score,
        "round_scores": avg_round_scores,
        "skill_radar": avg_skill_radar,
        "top_strengths": top_strengths,
        "top_mistakes": narratives.get("top_mistakes", []),
        "skill_gaps_study": narratives.get("skill_gaps_study", []),
        "delivery_summary": {
            "avg_wpm": avg_wpm,
            "total_fillers": total_fillers,
            "total_pauses_over_2s": total_pauses,
            "pacing_verdict": "Optimal" if 120 <= avg_wpm <= 165 else ("Slightly fast" if avg_wpm > 165 else "Deliberate / Slow")
        },
        "practice_plan": narratives.get("practice_plan", []),
        "qa_review": qa_review
    }

    return report


def generate_pdf_report(report_data: Dict[str, Any]) -> bytes:
    """Generate PDF report using ReportLab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('ReportTitle', parent=styles['Title'], fontSize=20, textColor=colors.HexColor("#6366f1"))
    h2_style = ParagraphStyle('ReportH2', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor("#1e293b"))
    body_style = ParagraphStyle('ReportBody', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor("#334155"))

    elements = []
    
    # Title
    elements.append(Paragraph("Mockory - Performance Report", title_style))
    elements.append(Spacer(1, 10))
    
    # Summary
    overall = report_data.get("overall_score", 0.0)
    elements.append(Paragraph(f"<b>Overall Score:</b> {overall} / 10.0", h2_style))
    elements.append(Spacer(1, 10))
    
    # Round Scores
    elements.append(Paragraph("Round Scores", h2_style))
    round_data = [["Round", "Score"]]
    for r, s in report_data.get("round_scores", {}).items():
        round_data.append([r.capitalize(), f"{s} / 10"])
    
    t_rounds = Table(round_data, colWidths=[200, 100])
    t_rounds.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#3730a3")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    elements.append(t_rounds)
    elements.append(Spacer(1, 15))

    # Top Strengths
    elements.append(Paragraph("Top Strengths", h2_style))
    for st in report_data.get("top_strengths", []):
        elements.append(Paragraph(f"• {st}", body_style))
    elements.append(Spacer(1, 10))

    # Top Recurring Mistakes
    elements.append(Paragraph("Key Improvement Areas", h2_style))
    for m in report_data.get("top_mistakes", []):
        elements.append(Paragraph(f"• {m}", body_style))
    elements.append(Spacer(1, 10))

    # Practice Plan
    elements.append(Paragraph("Recommended Practice Plan", h2_style))
    for p in report_data.get("practice_plan", []):
        elements.append(Paragraph(f"<b>{p.get('step', '')} ({p.get('timeline', '')}):</b> {p.get('action', '')}", body_style))
    elements.append(Spacer(1, 15))

    doc.build(elements)
    return buffer.getvalue()
