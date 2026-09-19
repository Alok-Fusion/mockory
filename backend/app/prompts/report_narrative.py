from typing import List, Dict, Any

def get_recurring_mistakes_prompt(mistakes_list: List[Dict[str, Any]]) -> str:
    mistakes_str = "\n".join(
        f"- Type: {m.get('type')}, Quote: \"{m.get('quote_from_my_answer', '')}\", Impact: {m.get('why_it_hurts', '')}"
        for m in mistakes_list[:10]
    )
    return f"""RULES:
1. Synthesize the candidate's turn mistakes into the TOP 5 recurring patterns.
2. For each pattern, explain the root cause and how it affects hiring decisions.
3. Respond ONLY with valid JSON.

LOGGED MISTAKES:
{mistakes_str or 'No major mistakes recorded.'}

OUTPUT JSON SCHEMA:
{{
  "top_mistakes": [
    "Recurring Pattern 1: Explanation",
    "Recurring Pattern 2: Explanation"
  ]
}}

EXAMPLE:
{{
  "top_mistakes": [
    "Omitting concrete business metrics: Multiple answers described successful optimizations without quantifying percentage improvements or latency drop numbers.",
    "Jumping to architectural tools prematurely: Began suggesting Redis/Kafka before outlining system requirements and traffic constraints."
  ]
}}
"""

def get_skill_gaps_study_prompt(skill_gaps: List[str], jd_brief: str) -> str:
    gaps_str = ", ".join(skill_gaps) if skill_gaps else "General depth in target tech stack"
    return f"""RULES:
1. Recommend targeted study topics, documentation, and conceptual exercises for the candidate's identified skill gaps against this JD.
2. Keep each recommendation practical and actionable.
3. Respond ONLY with valid JSON.

JD BRIEF:
{jd_brief}

IDENTIFIED SKILL GAPS:
{gaps_str}

OUTPUT JSON SCHEMA:
{{
  "study_guide": [
    {{"skill": "Skill Name", "topic": "Core concept to master", "resource_type": "Books/Docs/Practice", "action": "Exact exercise or focus area"}}
  ]
}}

EXAMPLE:
{{
  "study_guide": [
    {{"skill": "Distributed Systems", "topic": "Consensus & Leader Election", "resource_type": "Docs & Whitepapers", "action": "Read Raft paper and implement a 3-node mock consensus heartbeat in Python."}}
  ]
}}
"""

def get_practice_plan_prompt(role: str, top_mistakes: List[str], weak_areas: List[str]) -> str:
    mistakes_str = "; ".join(top_mistakes[:3]) if top_mistakes else "General interview structure"
    weak_str = "; ".join(weak_areas[:3]) if weak_areas else "Technical deep dives"
    
    return f"""RULES:
1. Create a prioritized 3-step action plan for the candidate preparing for {role} interviews.
2. Address their specific weak areas and recurring mistakes.
3. Respond ONLY with valid JSON.

WEAK AREAS: {weak_str}
RECURRING MISTAKES: {mistakes_str}

OUTPUT JSON SCHEMA:
{{
  "practice_plan": [
    {{"step": "Step 1: Focus Area", "timeline": "Days 1-3", "action": "Specific practice drills and storytelling preparation."}},
    {{"step": "Step 2: Focus Area", "timeline": "Days 4-6", "action": "Mock drills focusing on metrics."}},
    {{"step": "Step 3: Focus Area", "timeline": "Day 7", "action": "Timed end-to-end rehearsal."}}
  ]
}}

EXAMPLE:
{{
  "practice_plan": [
    {{"step": "Step 1: STAR Story Metric Polish", "timeline": "Days 1-2", "action": "Rewrite top 4 resume project stories into STAR format with explicit % and latency metrics."}},
    {{"step": "Step 2: Distributed Systems Trade-offs Drill", "timeline": "Days 3-5", "action": "Practice explaining CAP theorem and partitioning trade-offs out loud in under 2 minutes."}},
    {{"step": "Step 3: High-Pressure Mock Rehearsal", "timeline": "Days 6-7", "action": "Conduct a strict-mode mock interview focusing on active listening before answering."}}
  ]
}}
"""
