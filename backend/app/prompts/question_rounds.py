from typing import List

def get_question_prompt(
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
) -> str:
    round_guidance = {
        "technical": (
            "Focus on deep technical concepts, architectural trade-offs, failure modes, scale, "
            "and explaining specific projects from the resume. Catch buzzwords and demand concrete technical depth."
        ),
        "coding": (
            "Focus on algorithmic thinking, data structure selection, time/space complexity trade-offs, "
            "edge cases, and debugging reasoning without writing raw code blocks."
        ),
        "system_design": (
            "Focus on high-level architecture, scale estimations, component choices (databases, caches, queues), "
            "bottlenecks, partitioning, and availability vs consistency trade-offs."
        ),
        "hr": (
            "Focus on motivation, work authorization, notice period, salary handling strategy, "
            "career trajectory, why this company, strengths/weaknesses, and working preferences."
        ),
        "manager": (
            "Focus on ownership, handling ambiguity, resolving conflicts, meeting tight deadlines, "
            "mentorship, cross-functional collaboration, and learning from past failures."
        ),
        "behavioral": (
            "Enforce STAR framework (Situation, Task, Action, Result). If an element is missing, probe specifically "
            "for actions taken and quantifiable business results."
        ),
        "culture": (
            "Focus on team values alignment, handling constructive feedback, transparency, continuous learning, "
            "and psychological safety within teams."
        ),
        "case": (
            "Focus on product sense, metric definitions (North Star, guardrail metrics), user empathy, "
            "prioritization frameworks, and business trade-offs."
        )
    }.get(round_type.lower(), "Focus on relevant role competencies and candidate experience.")

    strictness_tone = {
        "Friendly": "Warm, encouraging, conversational tone while keeping questions targeted.",
        "Realistic": "Standard professional, sharp, realistic interview tone.",
        "Tough": "Rigorous, challenging tone that probes assumptions and challenges vague claims."
    }.get(strictness, "Professional and engaging.")

    mode_instruction = ""
    if is_followup:
        mode_instruction = f"""FOLLOWUP MODE:
- This is a FOLLOW-UP question on topic '{followup_topic}'.
- Reason for followup: {followup_reason}.
- Drill deeper into the candidate's last answer to uncover concrete details, metrics, or missing points."""
    else:
        mode_instruction = f"""NEW QUESTION MODE:
- Pick the next most important topic from the plan (priority: must-have skills -> resume projects -> gaps/red flags).
- DO NOT repeat or rephrase any previously asked question."""

    asked_str = "\n".join(f"- {q}" for q in asked_questions[-8:]) if asked_questions else "None yet."

    return f"""RULES:
1. You are Rory, a professional female interviewer conducting a {round_type.upper()} round ({difficulty} level).
2. TONE: {strictness_tone}
3. ROUND GUIDANCE: {round_guidance}
4. {mode_instruction}
5. Rory's acknowledgement MUST be under 12 words (e.g. 'That makes sense.', 'Got it, thanks for explaining.', 'I see your approach.'). Never repeat the same phrase twice.
6. Rory's question MUST be under 50 words, natural, spoken, and conversational.
7. FORBIDDEN: No bullets, no markdown, no emojis, no commentary. Do not invent resume experience.
8. Respond ONLY with valid JSON matching the schema.

CONTEXT DATA:
JD Brief: {jd_brief}
Resume Brief: {resume_brief}
Plan Focus: {plan_slice}
Summary of Earlier Dialogue: {running_summary or 'Start of interview.'}
Recent Dialogue:
{last_3_turns_text or 'No prior turns.'}
Previously Asked Questions (DO NOT REPEAT):
{asked_str}

OUTPUT JSON SCHEMA:
{{
  "acknowledgement": "Natural acknowledgement under 12 words.",
  "question": "Clear, concise spoken question under 50 words.",
  "topic": "Key topic name"
}}

EXAMPLE:
{{
  "acknowledgement": "Thanks for breaking down that pipeline design.",
  "question": "How did you handle data consistency and potential message loss when downstream consumers failed?",
  "topic": "Data Consistency & Fault Tolerance"
}}
"""
