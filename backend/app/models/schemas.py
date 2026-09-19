from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SessionCreateRequest(BaseModel):
    jd_text: Optional[str] = ""
    resume_text: Optional[str] = ""
    rounds: List[str] = Field(default_factory=lambda: ["technical", "behavioral"])
    difficulty: str = "Mid"         # Junior, Mid, Senior
    strictness: str = "Realistic"   # Friendly, Realistic, Tough
    avatar_mode: str = "2d"         # 2d, 3d
    questions_per_round: int = 6

class InterviewPlan(BaseModel):
    role: str = ""
    seniority: str = "Mid"
    must_have_skills: List[str] = Field(default_factory=list)
    nice_to_have_skills: List[str] = Field(default_factory=list)
    resume_projects: List[str] = Field(default_factory=list)
    skill_gaps: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)

class JDBriefResponse(BaseModel):
    role: str = ""
    seniority: str = "Mid"
    core_skills: List[str] = Field(default_factory=list)
    brief: str = ""

class ResumeBriefResponse(BaseModel):
    candidate_name: str = "Candidate"
    current_role: str = ""
    top_skills: List[str] = Field(default_factory=list)
    top_projects: List[str] = Field(default_factory=list)
    brief: str = ""

class NextActionDecision(BaseModel):
    action: str = "new_question"  # followup, new_question, wrap_up_round
    reason: str = ""
    topic: str = ""

class QuestionGenResponse(BaseModel):
    acknowledgement: str = ""  # under 12 words, natural, varied
    question: str = ""        # under 50 words, natural conversational
    topic: str = ""

class EvalAScores(BaseModel):
    relevance: float = 7.0
    correctness: float = 7.0
    depth: float = 7.0
    structure: float = 7.0
    communication: float = 7.0
    confidence: float = 7.0
    overall: float = 7.0
    verdict: str = "Good attempt"

class MistakeItem(BaseModel):
    type: str = "vague"  # factual error, vague, missing example, rambling, off-topic, weak structure, buzzword without substance, contradiction with resume, negative framing
    quote_from_my_answer: str = ""
    why_it_hurts: str = ""

class STARCheck(BaseModel):
    situation: bool = True
    task: bool = True
    action: bool = True
    result: bool = True
    notes: str = ""

class EvalBMistakes(BaseModel):
    what_was_good: List[str] = Field(default_factory=list)
    mistakes: List[MistakeItem] = Field(default_factory=list)
    missing_points: List[str] = Field(default_factory=list)
    star_completeness: Optional[STARCheck] = None

class EvalCImproved(BaseModel):
    improved_answer: str = ""
    tip: str = ""

class DeliveryMetrics(BaseModel):
    wpm: float = 0.0
    fillers_count: int = 0
    fillers_list: List[Dict[str, Any]] = Field(default_factory=list)
    pauses_over_2s: List[float] = Field(default_factory=list)
    total_duration_sec: float = 0.0
    false_starts: int = 0

class FullTurnEvaluation(BaseModel):
    scores: EvalAScores = Field(default_factory=EvalAScores)
    what_was_good: List[str] = Field(default_factory=list)
    mistakes: List[MistakeItem] = Field(default_factory=list)
    missing_points: List[str] = Field(default_factory=list)
    star_completeness: Optional[STARCheck] = None
    improved_answer: str = ""
    tip: str = ""

class TurnResponse(BaseModel):
    turn_id: str
    turn_index: int
    round_type: str
    acknowledgement: str
    question_text: str
    audio_path: Optional[str] = None
    is_followup: bool = False
    topic: str = ""
    is_complete: bool = False

class AnswerSubmitRequest(BaseModel):
    typed_text: Optional[str] = ""
    voice_transcript: Optional[str] = ""
    audio_metrics: Optional[DeliveryMetrics] = None

class AnswerTurnResponse(BaseModel):
    turn_id: str
    transcript: str = ""
    merged_answer: str = ""
    delivery_metrics: Optional[DeliveryMetrics] = None
    evaluation: Optional[FullTurnEvaluation] = None
    next_action: Optional[NextActionDecision] = None
    is_complete: bool = False

class FinalReportResponse(BaseModel):
    session_id: str
    overall_score: float = 0.0
    round_scores: Dict[str, float] = Field(default_factory=dict)
    skill_radar: Dict[str, float] = Field(default_factory=dict)
    top_strengths: List[str] = Field(default_factory=list)
    top_mistakes: List[str] = Field(default_factory=list)
    skill_gaps_study: List[Dict[str, str]] = Field(default_factory=list)
    delivery_summary: Dict[str, Any] = Field(default_factory=dict)
    practice_plan: List[Dict[str, str]] = Field(default_factory=list)
    qa_review: List[Dict[str, Any]] = Field(default_factory=list)

class HealthResponse(BaseModel):
    status: str = "ok"
    ollama_connected: bool = False
    models_available: List[str] = Field(default_factory=list)
    interview_model: str = ""
    eval_model: str = ""
    whisper_ready: bool = False
    kokoro_ready: bool = False
    fix_command: Optional[str] = None
