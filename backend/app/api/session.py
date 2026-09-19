import json
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.session import InterviewSession, InterviewTurn
from backend.app.models.schemas import (
    SessionCreateRequest,
    TurnResponse,
    AnswerTurnResponse,
    DeliveryMetrics,
    NextActionDecision,
    FullTurnEvaluation
)
from backend.app.services.llm import llm_service
from backend.app.services.metrics import calculate_delivery_metrics
from backend.app.services.audio import extract_text_from_file, transcribe_audio_file
from backend.app.services.report import generate_final_session_report

router = APIRouter(prefix="/api/session", tags=["Session"])
logger = logging.getLogger(__name__)

@router.post("", response_model=dict)
async def create_session(
    jd_text: Optional[str] = Form(""),
    resume_text: Optional[str] = Form(""),
    rounds_json: Optional[str] = Form('["technical", "behavioral"]'),
    difficulty: str = Form("Mid"),
    strictness: str = Form("Realistic"),
    avatar_mode: str = Form("2d"),
    questions_per_round: int = Form(6),
    jd_file: Optional[UploadFile] = File(None),
    resume_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Creates a new interview session and generates small-model compression briefs & plan."""
    # Extract file content if provided
    if jd_file:
        content = await jd_file.read()
        extracted = extract_text_from_file(content, jd_file.filename)
        jd_text = extracted or jd_text

    if resume_file:
        content = await resume_file.read()
        extracted = extract_text_from_file(content, resume_file.filename)
        resume_text = extracted or resume_text

    try:
        rounds = json.loads(rounds_json) if isinstance(rounds_json, str) else ["technical"]
    except Exception:
        rounds = ["technical"]

    if not jd_text and not resume_text:
        jd_text = "Software Engineer position focusing on building scalable web services and clean APIs."
        resume_text = "Software Developer with experience in web applications and backend systems."

    # 1. Generate briefs and interview plan using small LLM calls
    jd_brief_res = await llm_service.generate_jd_brief(jd_text)
    resume_brief_res = await llm_service.generate_resume_brief(resume_text)
    plan_res = await llm_service.generate_interview_plan(
        jd_brief=jd_brief_res.brief,
        resume_brief=resume_brief_res.brief,
        difficulty=difficulty
    )

    # 2. Persist session
    session = InterviewSession(
        jd_raw=jd_text,
        resume_raw=resume_text,
        jd_brief=jd_brief_res.brief,
        resume_brief=resume_brief_res.brief,
        rounds=rounds,
        current_round_index=0,
        difficulty=difficulty,
        strictness=strictness,
        avatar_mode=avatar_mode,
        questions_per_round=questions_per_round,
        plan_json=plan_res.model_dump(),
        running_summary="",
        status="in_progress"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "candidate_name": resume_brief_res.candidate_name,
        "role": plan_res.role,
        "jd_brief": session.jd_brief,
        "resume_brief": session.resume_brief,
        "plan": session.plan_json,
        "rounds": session.rounds,
        "status": session.status
    }


@router.post("/{session_id}/next", response_model=TurnResponse)
async def get_next_question(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Generates Rory's next question or opening greeting."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    turns = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_index).all()
    rounds = session.rounds or ["technical"]
    curr_round_idx = min(session.current_round_index, len(rounds) - 1)
    current_round = rounds[curr_round_idx]

    # Check if session or round is complete
    turns_in_this_round = [t for t in turns if t.round_type == current_round]
    if len(turns_in_this_round) >= session.questions_per_round:
        if curr_round_idx + 1 < len(rounds):
            # Advance to next round
            session.current_round_index += 1
            db.commit()
            curr_round_idx = session.current_round_index
            current_round = rounds[curr_round_idx]
            turns_in_this_round = []
        else:
            # Interview complete
            session.status = "completed"
            db.commit()
            return TurnResponse(
                turn_id="",
                turn_index=len(turns),
                round_type="completed",
                acknowledgement="That concludes all the rounds for our interview today! Thank you so much.",
                question_text="Please click 'View Final Report' to review your comprehensive evaluation and practice plan.",
                is_complete=True
            )

    # Determine candidate name & role
    plan = session.plan_json or {}
    role = plan.get("role", "Software Engineer")
    candidate_name = "Candidate"
    
    # Check if this is the very first turn
    if len(turns) == 0:
        opening = await llm_service.generate_opening(
            candidate_name=candidate_name,
            role=role,
            round_type=current_round,
            strictness=session.strictness
        )
        turn = InterviewTurn(
            session_id=session.id,
            turn_index=0,
            round_type=current_round,
            question_text=opening.question,
            acknowledgement=opening.acknowledgement,
            topic=opening.topic,
            is_followup=False,
            followup_count=0
        )
        db.add(turn)
        db.commit()
        db.refresh(turn)
        return TurnResponse(
            turn_id=turn.id,
            turn_index=turn.turn_index,
            round_type=turn.round_type,
            acknowledgement=turn.acknowledgement,
            question_text=turn.question_text,
            is_followup=False,
            topic=turn.topic,
            is_complete=False
        )

    # Gather context slices
    last_3 = turns[-3:]
    last_3_text = "\n".join([
        f"Q: {t.question_text}\nA: {t.merged_answer or t.typed_text or t.voice_transcript or 'No answer'}"
        for t in last_3
    ])
    asked_questions = [t.question_text for t in turns]

    # Check if last turn triggered a followup
    last_turn = turns[-1]
    is_followup = False
    followup_topic = ""
    followup_reason = ""

    if last_turn.evaluation and isinstance(last_turn.delivery_metrics, dict):
        # We can check next_action if stored
        pass

    gen_res = await llm_service.generate_question(
        round_type=current_round,
        strictness=session.strictness,
        difficulty=session.difficulty,
        jd_brief=session.jd_brief or "",
        resume_brief=session.resume_brief or "",
        plan_slice=f"Must haves: {', '.join(plan.get('must_have_skills', [])[:3])}; Gaps: {', '.join(plan.get('skill_gaps', [])[:2])}",
        last_3_turns_text=last_3_text,
        running_summary=session.running_summary or "",
        asked_questions=asked_questions,
        is_followup=is_followup,
        followup_topic=followup_topic,
        followup_reason=followup_reason
    )

    new_turn = InterviewTurn(
        session_id=session.id,
        turn_index=len(turns),
        round_type=current_round,
        question_text=gen_res.question,
        acknowledgement=gen_res.acknowledgement,
        topic=gen_res.topic,
        is_followup=is_followup,
        followup_count=0
    )
    db.add(new_turn)
    db.commit()
    db.refresh(new_turn)

    return TurnResponse(
        turn_id=new_turn.id,
        turn_index=new_turn.turn_index,
        round_type=new_turn.round_type,
        acknowledgement=new_turn.acknowledgement,
        question_text=new_turn.question_text,
        is_followup=is_followup,
        topic=new_turn.topic,
        is_complete=False
    )


@router.post("/{session_id}/answer", response_model=AnswerTurnResponse)
async def submit_answer(
    session_id: str,
    background_tasks: BackgroundTasks,
    turn_id: Optional[str] = Form(None),
    typed_text: Optional[str] = Form(""),
    voice_transcript_client: Optional[str] = Form(""),
    audio_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Submits a candidate answer, transcribes audio, merges text, computes metrics, and evaluates."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if turn_id:
        turn = db.query(InterviewTurn).filter(InterviewTurn.id == turn_id).first()
    else:
        turn = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_index.desc()).first()

    if not turn:
        raise HTTPException(status_code=404, detail="Turn not found")

    voice_transcript = voice_transcript_client or ""
    word_timestamps = []
    total_duration = 0.0

    # STT transcription if audio provided
    if audio_file:
        audio_bytes = await audio_file.read()
        stt_text, stt_timestamps, duration = transcribe_audio_file(audio_bytes, audio_file.filename)
        if stt_text:
            voice_transcript = stt_text
            word_timestamps = stt_timestamps
            total_duration = duration

    # Merge answers if both voice and text exist
    merged_answer = voice_transcript
    if voice_transcript and typed_text:
        merged_answer = await llm_service.merge_answer(voice_transcript, typed_text)
    elif typed_text:
        merged_answer = typed_text

    # Delivery metrics calculation
    delivery_metrics = calculate_delivery_metrics(
        transcript=voice_transcript or merged_answer,
        word_timestamps=word_timestamps,
        total_duration_sec=total_duration
    )

    # Calculate evaluation
    eval_result = await llm_service.evaluate_turn(
        round_type=turn.round_type,
        strictness=session.strictness,
        difficulty=session.difficulty,
        jd_brief=session.jd_brief or "",
        resume_brief=session.resume_brief or "",
        question=turn.question_text,
        candidate_answer=merged_answer or "No answer provided.",
        delivery_confidence_hint=7.5 if delivery_metrics.fillers_count < 3 else 6.0
    )

    # Deduct 1 point if candidate requested a hint
    if turn.hint_requested:
        eval_result.scores.overall = max(1.0, round(eval_result.scores.overall - 1.0, 1))

    # Next action decision
    turns_in_this_round = db.query(InterviewTurn).filter(
        InterviewTurn.session_id == session_id,
        InterviewTurn.round_type == turn.round_type
    ).count()

    next_decision = await llm_service.decide_next_action(
        round_type=turn.round_type,
        current_question=turn.question_text,
        candidate_answer=merged_answer,
        consecutive_followups=turn.followup_count if turn.is_followup else 0,
        turns_in_round=turns_in_this_round,
        max_turns_in_round=session.questions_per_round,
        current_topic=turn.topic
    )

    # Update turn record
    turn.typed_text = typed_text
    turn.voice_transcript = voice_transcript
    turn.merged_answer = merged_answer
    turn.delivery_metrics = delivery_metrics.model_dump()
    turn.evaluation = eval_result.model_dump()
    db.commit()

    # Update running summary in background
    async def _update_summary():
        new_summary = await llm_service.update_running_summary(
            prior_summary=session.running_summary or "",
            latest_turn_q=turn.question_text,
            latest_turn_a=merged_answer
        )
        session.running_summary = new_summary
        db.commit()

    background_tasks.add_task(_update_summary)

    return AnswerTurnResponse(
        turn_id=turn.id,
        transcript=voice_transcript,
        merged_answer=merged_answer,
        delivery_metrics=delivery_metrics,
        evaluation=eval_result,
        next_action=next_decision,
        is_complete=(session.status == "completed")
    )


@router.post("/{session_id}/hint")
async def request_hint(session_id: str, db: Session = Depends(get_db)):
    """Provides a helpful hint for the current turn (costs 1 point)."""
    turn = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_index.desc()).first()
    if not turn:
        raise HTTPException(status_code=404, detail="Turn not found")
    turn.hint_requested = True
    db.commit()

    return {
        "hint": f"Consider structuring your answer around the key trade-offs in {turn.topic or 'this topic'}, mentioning specific tools and quantified impact.",
        "penalty": "1 point penalty applied to this answer's overall score."
    }


@router.post("/{session_id}/skip")
async def skip_question(session_id: str, db: Session = Depends(get_db)):
    """Skips current question."""
    turn = db.query(InterviewTurn).filter(InterviewTurn.session_id == session_id).order_by(InterviewTurn.turn_index.desc()).first()
    if not turn:
        raise HTTPException(status_code=404, detail="Turn not found")
    turn.skipped = True
    turn.merged_answer = "[Candidate skipped this question]"
    db.commit()
    return {"message": "Question skipped"}


@router.post("/{session_id}/end")
async def end_interview(session_id: str, db: Session = Depends(get_db)):
    """Manually completes the interview and prepares the final report."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = "completed"
    db.commit()
    return {"status": "completed"}
