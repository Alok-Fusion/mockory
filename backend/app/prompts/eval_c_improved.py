def get_eval_c_improved_prompt(
    resume_brief: str,
    question: str,
    candidate_answer: str,
    missing_points_summary: str
) -> str:
    return f"""RULES:
1. Write an improved, high-scoring model answer in the first person ('I...'), speaking authentically in the candidate's voice.
2. Ground the answer strictly in the candidate's resume brief. FORBIDDEN: Never invent fake metrics or companies. If a specific metric or example is missing from the resume, insert a clear placeholder like '[add your real metric here, e.g., reduced p99 latency by 30%]'.
3. Provide exactly ONE high-impact, actionable tip for the candidate to use next time.
4. Respond ONLY with valid JSON.

RESUME BRIEF:
{resume_brief}

QUESTION:
{question}

CANDIDATE'S ORIGINAL ANSWER:
{candidate_answer}

KEY POINTS TO INCLUDE:
{missing_points_summary}

OUTPUT JSON SCHEMA:
{{
  "improved_answer": "Concise, first-person improved answer (120-180 words) highlighting actions, reasoning, and measurable impact.",
  "tip": "One clear, actionable coaching tip for future rounds."
}}

EXAMPLE:
{{
  "improved_answer": "In my previous role building backend microservices, when we faced slow query response times, I used PostgreSQL's EXPLAIN ANALYZE to identify sequential table scans on our transactions table. I implemented a compound B-tree index on user_id and created_at, and added a Redis cache with a 5-minute TTL for read-heavy endpoints. This reduced our database p95 response time from [add your real baseline, e.g., 850ms to 95ms] without causing noticeable write lag.",
  "tip": "Always state the diagnostic tool you used before jumping straight to the solution to show structured debugging ability."
}}
"""
