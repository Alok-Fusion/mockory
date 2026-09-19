from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.session import InterviewSession, InterviewTurn
from backend.app.models.schemas import FinalReportResponse
from backend.app.services.report import generate_final_session_report, generate_pdf_report

router = APIRouter(prefix="/api", tags=["Reports & History"])

@router.get("/session/{session_id}/report", response_model=FinalReportResponse)
async def get_session_report(session_id: str, db: Session = Depends(get_db)):
    """Fetches or generates the complete final interview report."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.final_report:
        return session.final_report

    turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_index).all()
    report = await generate_final_session_report(session, turns)
    
    session.final_report = report
    session.status = "completed"
    db.commit()

    return report


@router.get("/session/{session_id}/export/pdf")
async def export_session_pdf(session_id: str, db: Session = Depends(get_db)):
    """Exports session report as a downloadable PDF document."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    report_data = session.final_report
    if not report_data:
        turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_index).all()
        report_data = await generate_final_session_report(session, turns)
        session.final_report = report_data
        db.commit()

    pdf_bytes = generate_pdf_report(report_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=rory_interview_report_{session_id[:8]}.pdf"}
    )


@router.get("/session/{session_id}/export/md")
async def export_session_markdown(session_id: str, db: Session = Depends(get_db)):
    """Exports session report as a formatted Markdown file."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    report = session.final_report
    if not report:
        turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_index).all()
        report = await generate_final_session_report(session, turns)

    md_lines = [
        f"# Rory Mock Interview Report",
        f"**Date:** {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Difficulty:** {session.difficulty} | **Strictness:** {session.strictness}",
        f"**Overall Score:** {report.get('overall_score', 0.0)} / 10.0\n",
        "## Round Breakdown",
    ]
    for r, s in report.get("round_scores", {}).items():
        md_lines.append(f"- **{r.capitalize()}:** {s} / 10")

    md_lines.append("\n## Top Strengths")
    for st in report.get("top_strengths", []):
        md_lines.append(f"- {st}")

    md_lines.append("\n## Top Areas for Improvement")
    for m in report.get("top_mistakes", []):
        md_lines.append(f"- {m}")

    md_lines.append("\n## Practice Plan")
    for p in report.get("practice_plan", []):
        md_lines.append(f"### {p.get('step', '')} ({p.get('timeline', '')})")
        md_lines.append(f"{p.get('action', '')}\n")

    md_lines.append("## Question-by-Question Retrospective")
    for qa in report.get("qa_review", []):
        md_lines.append(f"### Turn {qa.get('turn_index', 0) + 1}: {qa.get('round_type', '').capitalize()}")
        md_lines.append(f"**Question:** {qa.get('question', '')}")
        md_lines.append(f"**Your Answer:** {qa.get('answer', '')}")
        sc = qa.get('scores', {})
        md_lines.append(f"**Turn Score:** {sc.get('overall', 0)}/10 (Relevance: {sc.get('relevance', 0)}, Depth: {sc.get('depth', 0)})")
        if qa.get("improved_answer"):
            md_lines.append(f"**Improved Answer:** {qa.get('improved_answer')}")
        if qa.get("tip"):
            md_lines.append(f"**Tip:** {qa.get('tip')}")
        md_lines.append("---")

    md_content = "\n".join(md_lines)
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=rory_interview_report_{session_id[:8]}.md"}
    )


@router.get("/sessions")
async def get_all_sessions(db: Session = Depends(get_db)):
    """Returns past interview history with score progression."""
    sessions = db.query(InterviewSession).order_by(InterviewSession.created_at.desc()).all()
    results = []
    for s in sessions:
        plan = s.plan_json or {}
        overall = 0.0
        if s.final_report and "overall_score" in s.final_report:
            overall = s.final_report["overall_score"]
        results.append({
            "session_id": s.id,
            "created_at": s.created_at.isoformat(),
            "role": plan.get("role", "Software Engineer"),
            "difficulty": s.difficulty,
            "strictness": s.strictness,
            "rounds": s.rounds,
            "status": s.status,
            "overall_score": overall
        })
    return results
