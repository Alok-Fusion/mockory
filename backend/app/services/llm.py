import json
import logging
import asyncio
from typing import Type, TypeVar, Optional, List, Dict, Any
import httpx
from pydantic import BaseModel, ValidationError, Field

from backend.app.core.config import settings
from backend.app.models.schemas import (
    JDBriefResponse,
    ResumeBriefResponse,
    InterviewPlan,
    QuestionGenResponse,
    NextActionDecision,
    EvalAScores,
    EvalBMistakes,
    EvalCImproved,
    FullTurnEvaluation,
    MistakeItem,
    STARCheck
)
from backend.app.prompts.jd_brief import get_jd_brief_prompt
from backend.app.prompts.resume_brief import get_resume_brief_prompt
from backend.app.prompts.interview_plan import get_interview_plan_prompt
from backend.app.prompts.opening import get_opening_prompt
from backend.app.prompts.question_rounds import get_question_prompt
from backend.app.prompts.next_action import get_next_action_prompt
from backend.app.prompts.answer_merge import get_answer_merge_prompt
from backend.app.prompts.eval_a_scores import get_eval_a_scores_prompt
from backend.app.prompts.eval_b_mistakes import get_eval_b_mistakes_prompt
from backend.app.prompts.eval_c_improved import get_eval_c_improved_prompt
from backend.app.prompts.running_summary import get_running_summary_prompt
from backend.app.prompts.report_narrative import (
    get_recurring_mistakes_prompt,
    get_skill_gaps_study_prompt,
    get_practice_plan_prompt
)
from backend.app.services.metrics import is_duplicate_question

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class LLMService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.interview_model = settings.OLLAMA_MODEL_INTERVIEW
        self.eval_model = settings.OLLAMA_MODEL_EVAL

    async def check_health(self) -> Dict[str, Any]:
        """Verify Ollama reachability and list loaded models."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    has_interview = any(self.interview_model in m for m in models)
                    has_eval = any(self.eval_model in m for m in models)
                    return {
                        "connected": True,
                        "models": models,
                        "interview_model": self.interview_model,
                        "eval_model": self.eval_model,
                        "interview_model_present": has_interview,
                        "eval_model_present": has_eval
                    }
        except Exception as e:
            logger.warning(f"Ollama connection check failed: {e}")
        return {
            "connected": False,
            "models": [],
            "interview_model": self.interview_model,
            "eval_model": self.eval_model,
            "interview_model_present": False,
            "eval_model_present": False
        }

    async def call_ollama_raw(
        self,
        model: str,
        prompt: str,
        temperature: float = 0.7,
        num_ctx: int = 4096,
        json_format: bool = True
    ) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_ctx": num_ctx
            }
        }
        if json_format:
            payload["format"] = "json"

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Ollama request failed with status {resp.status_code}: {resp.text}")
            data = resp.json()
            return data.get("response", "").strip()

    async def call_structured(
        self,
        schema_cls: Type[T],
        prompt: str,
        model: str,
        temperature: float = 0.2,
        num_ctx: int = 4096,
        fallback_factory: Optional[T] = None
    ) -> T:
        """Calls Ollama with JSON enforcement and up to 3 repair retries."""
        current_prompt = prompt
        last_error = ""

        for attempt in range(3):
            try:
                raw_response = await self.call_ollama_raw(
                    model=model,
                    prompt=current_prompt,
                    temperature=temperature,
                    num_ctx=num_ctx,
                    json_format=True
                )
                # Attempt to parse into target Pydantic schema
                parsed = schema_cls.model_validate_json(raw_response)
                return parsed
            except (ValidationError, json.JSONDecodeError, Exception) as err:
                last_error = str(err)
                logger.warning(f"LLM Structured Call Attempt {attempt + 1} failed: {err}")
                # Build concise repair prompt
                schema_json = json.dumps(schema_cls.model_json_schema())
                current_prompt = (
                    f"PREVIOUS ATTEMPT FAILED: {last_error}\n"
                    f"CRITICAL: Output MUST be strictly valid JSON matching this schema:\n{schema_json}\n"
                    f"Original Task:\n{prompt}"
                )

        logger.error(f"All 3 repair attempts failed. Using fallback for {schema_cls.__name__}. Error: {last_error}")
        if fallback_factory is not None:
            return fallback_factory
        return schema_cls()

    # --- Brief Generation ---
    async def generate_jd_brief(self, jd_text: str) -> JDBriefResponse:
        prompt = get_jd_brief_prompt(jd_text)
        fallback = JDBriefResponse(
            role="Software Engineer",
            seniority="Mid",
            core_skills=["Problem Solving", "Software Design"],
            brief=jd_text[:300]
        )
        return await self.call_structured(
            JDBriefResponse,
            prompt,
            model=self.interview_model,
            temperature=0.2,
            num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
            fallback_factory=fallback
        )

    async def generate_resume_brief(self, resume_text: str) -> ResumeBriefResponse:
        prompt = get_resume_brief_prompt(resume_text)
        fallback = ResumeBriefResponse(
            candidate_name="Candidate",
            current_role="Software Engineer",
            top_skills=["Programming", "System Engineering"],
            top_projects=["Demonstrated software projects"],
            brief=resume_text[:300]
        )
        return await self.call_structured(
            ResumeBriefResponse,
            prompt,
            model=self.interview_model,
            temperature=0.2,
            num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
            fallback_factory=fallback
        )

    async def generate_interview_plan(self, jd_brief: str, resume_brief: str, difficulty: str) -> InterviewPlan:
        prompt = get_interview_plan_prompt(jd_brief, resume_brief, difficulty)
        fallback = InterviewPlan(
            role="Software Engineer",
            seniority=difficulty,
            must_have_skills=["Core Concepts", "Problem Solving", "Architecture"],
            nice_to_have_skills=["Testing", "CI/CD"],
            resume_projects=["Resume Project Walkthrough"],
            skill_gaps=["Production scale verification"],
            red_flags=["Vague metrics"]
        )
        return await self.call_structured(
            InterviewPlan,
            prompt,
            model=self.interview_model,
            temperature=0.2,
            num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
            fallback_factory=fallback
        )

    # --- Turn Generation & Decision ---
    async def generate_opening(self, candidate_name: str, role: str, round_type: str, strictness: str) -> QuestionGenResponse:
        prompt = get_opening_prompt(candidate_name, role, round_type, strictness)
        fallback = QuestionGenResponse(
            acknowledgement=f"Hi {candidate_name}, welcome! I am Rory, and I'll be interviewing you today.",
            question=f"To get started, could you briefly introduce yourself and highlight your experience relevant to the {role} role?",
            topic="Introduction"
        )
        return await self.call_structured(
            QuestionGenResponse,
            prompt,
            model=self.interview_model,
            temperature=settings.TEMPERATURE_INTERVIEW,
            num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
            fallback_factory=fallback
        )

    async def generate_question(
        self,
        round_type: str,
        strictness: str,
        difficulty: str,
        jd_brief: str,
        resume_brief: str,
        plan_slice: str,
        last_3_turns_text: str,
        running_summary: str,
        asked_questions: List[str],
        is_followup: bool = False,
        followup_topic: str = "",
        followup_reason: str = ""
    ) -> QuestionGenResponse:
        # Retry with deduplication filter
        for _ in range(3):
            prompt = get_question_prompt(
                round_type=round_type,
                strictness=strictness,
                difficulty=difficulty,
                jd_brief=jd_brief,
                resume_brief=resume_brief,
                plan_slice=plan_slice,
                last_3_turns_text=last_3_turns_text,
                running_summary=running_summary,
                asked_questions=asked_questions,
                is_followup=is_followup,
                followup_topic=followup_topic,
                followup_reason=followup_reason
            )
            fallback = QuestionGenResponse(
                acknowledgement="Thanks for explaining that.",
                question="Can you dive into a specific technical challenge you faced in your most recent project?",
                topic="Technical Execution"
            )
            res = await self.call_structured(
                QuestionGenResponse,
                prompt,
                model=self.interview_model,
                temperature=settings.TEMPERATURE_INTERVIEW,
                num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
                fallback_factory=fallback
            )
            if not is_duplicate_question(res.question, asked_questions):
                return res

        return res

    async def decide_next_action(
        self,
        round_type: str,
        current_question: str,
        candidate_answer: str,
        consecutive_followups: int,
        turns_in_round: int,
        max_turns_in_round: int,
        current_topic: str
    ) -> NextActionDecision:
        if turns_in_round >= max_turns_in_round:
            return NextActionDecision(action="wrap_up_round", reason="Round question limit reached", topic=current_topic)
        if consecutive_followups >= 2:
            return NextActionDecision(action="new_question", reason="Max followups reached", topic=current_topic)

        prompt = get_next_action_prompt(
            round_type=round_type,
            current_question=current_question,
            candidate_answer=candidate_answer,
            consecutive_followups=consecutive_followups,
            turns_in_round=turns_in_round,
            max_turns_in_round=max_turns_in_round,
            current_topic=current_topic
        )
        fallback = NextActionDecision(action="new_question", reason="Moving to next topic", topic=current_topic)
        return await self.call_structured(
            NextActionDecision,
            prompt,
            model=self.interview_model,
            temperature=0.2,
            num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
            fallback_factory=fallback
        )

    async def merge_answer(self, voice_transcript: str, typed_text: str) -> str:
        if not voice_transcript:
            return typed_text
        if not typed_text:
            return voice_transcript
        
        prompt = get_answer_merge_prompt(voice_transcript, typed_text)
        
        class MergeRes(BaseModel):
            merged_answer: str = ""
            typed_additions: str = ""
            
        res = await self.call_structured(
            MergeRes,
            prompt,
            model=self.interview_model,
            temperature=0.2,
            num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
            fallback_factory=MergeRes(merged_answer=f"{voice_transcript}\n[Note]: {typed_text}")
        )
        return res.merged_answer or f"{voice_transcript} {typed_text}"

    # --- Evaluation Split Pipeline (A + B parallel -> C -> Merge) ---
    async def evaluate_turn(
        self,
        round_type: str,
        strictness: str,
        difficulty: str,
        jd_brief: str,
        resume_brief: str,
        question: str,
        candidate_answer: str,
        delivery_confidence_hint: float = 7.0
    ) -> FullTurnEvaluation:
        # 1. Parallel execute A (Scores) and B (Mistakes & Missing)
        prompt_a = get_eval_a_scores_prompt(
            round_type=round_type,
            strictness=strictness,
            difficulty=difficulty,
            question=question,
            candidate_answer=candidate_answer,
            delivery_confidence_hint=delivery_confidence_hint
        )
        prompt_b = get_eval_b_mistakes_prompt(
            round_type=round_type,
            jd_brief=jd_brief,
            question=question,
            candidate_answer=candidate_answer
        )

        task_a = self.call_structured(
            EvalAScores,
            prompt_a,
            model=self.eval_model,
            temperature=settings.TEMPERATURE_EVAL,
            num_ctx=settings.OLLAMA_NUM_CTX_EVAL,
            fallback_factory=EvalAScores()
        )
        task_b = self.call_structured(
            EvalBMistakes,
            prompt_b,
            model=self.eval_model,
            temperature=settings.TEMPERATURE_EVAL,
            num_ctx=settings.OLLAMA_NUM_CTX_EVAL,
            fallback_factory=EvalBMistakes(what_was_good=["Clear effort on core response"])
        )

        eval_a, eval_b = await asyncio.gather(task_a, task_b)

        # 2. Execute C (Improved Answer & Tip) based on missing points
        missing_summary = ", ".join(eval_b.missing_points) if eval_b.missing_points else "Add quantified metrics and trade-offs"
        prompt_c = get_eval_c_improved_prompt(
            resume_brief=resume_brief,
            question=question,
            candidate_answer=candidate_answer,
            missing_points_summary=missing_summary
        )
        eval_c = await self.call_structured(
            EvalCImproved,
            prompt_c,
            model=self.eval_model,
            temperature=settings.TEMPERATURE_EVAL,
            num_ctx=settings.OLLAMA_NUM_CTX_EVAL,
            fallback_factory=EvalCImproved(
                improved_answer=f"In my previous projects, I approached {question} by breaking down the architecture...",
                tip="Be sure to highlight trade-offs and quantitative results."
            )
        )

        # 3. Assemble FullTurnEvaluation
        return FullTurnEvaluation(
            scores=eval_a,
            what_was_good=eval_b.what_was_good,
            mistakes=eval_b.mistakes,
            missing_points=eval_b.missing_points,
            star_completeness=eval_b.star_completeness,
            improved_answer=eval_c.improved_answer,
            tip=eval_c.tip
        )

    async def update_running_summary(self, prior_summary: str, latest_turn_q: str, latest_turn_a: str) -> str:
        prompt = get_running_summary_prompt(prior_summary, latest_turn_q, latest_turn_a)
        
        class SummaryRes(BaseModel):
            updated_summary: str = ""
            
        res = await self.call_structured(
            SummaryRes,
            prompt,
            model=self.interview_model,
            temperature=0.2,
            num_ctx=settings.OLLAMA_NUM_CTX_INTERVIEW,
            fallback_factory=SummaryRes(updated_summary=f"{prior_summary} Covered: {latest_turn_q[:50]}")
        )
        return res.updated_summary

    async def generate_report_narratives(
        self,
        role: str,
        jd_brief: str,
        skill_gaps: List[str],
        all_mistakes: List[Dict[str, Any]],
        weak_areas: List[str]
    ) -> Dict[str, Any]:
        # Small narrative calls for final report
        prompt_mistakes = get_recurring_mistakes_prompt(all_mistakes)
        prompt_gaps = get_skill_gaps_study_prompt(skill_gaps, jd_brief)
        prompt_plan = get_practice_plan_prompt(role, [m.get("why_it_hurts", "") for m in all_mistakes], weak_areas)

        class TopMistakesRes(BaseModel):
            top_mistakes: List[str] = Field(default_factory=list)

        class StudyGuideRes(BaseModel):
            study_guide: List[Dict[str, str]] = Field(default_factory=list)

        class PracticePlanRes(BaseModel):
            practice_plan: List[Dict[str, str]] = Field(default_factory=list)

        task_m = self.call_structured(
            TopMistakesRes, prompt_mistakes, model=self.eval_model, temperature=0.2, num_ctx=settings.OLLAMA_NUM_CTX_EVAL,
            fallback_factory=TopMistakesRes(top_mistakes=["Provide concrete metrics", "Structure answers with clear trade-offs"])
        )
        task_g = self.call_structured(
            StudyGuideRes, prompt_gaps, model=self.eval_model, temperature=0.2, num_ctx=settings.OLLAMA_NUM_CTX_EVAL,
            fallback_factory=StudyGuideRes(study_guide=[{"skill": s, "topic": "Core Fundamentals", "resource_type": "Docs", "action": "Deep dive"} for s in skill_gaps[:3]])
        )
        task_p = self.call_structured(
            PracticePlanRes, prompt_plan, model=self.eval_model, temperature=0.2, num_ctx=settings.OLLAMA_NUM_CTX_EVAL,
            fallback_factory=PracticePlanRes(practice_plan=[{"step": "Step 1: Metrics Polish", "timeline": "Day 1-2", "action": "Practice STAR stories"}])
        )

        res_m, res_g, res_p = await asyncio.gather(task_m, task_g, task_p)
        return {
            "top_mistakes": res_m.top_mistakes,
            "skill_gaps_study": res_g.study_guide,
            "practice_plan": res_p.practice_plan
        }

llm_service = LLMService()
