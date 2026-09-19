def get_running_summary_prompt(
    prior_summary: str,
    latest_turn_q: str,
    latest_turn_a: str
) -> str:
    return f"""RULES:
1. Update the running interview dialogue summary to incorporate the latest turn.
2. Keep the summary under 100 words total. Focus only on key topics covered, candidate strengths, and gaps shown.
3. Respond ONLY with valid JSON.

PRIOR SUMMARY:
{prior_summary or 'No prior dialogue.'}

LATEST TURN:
Q: {latest_turn_q}
A: {latest_turn_a}

OUTPUT JSON SCHEMA:
{{
  "updated_summary": "Concise updated running summary under 100 words."
}}

EXAMPLE:
{{
  "updated_summary": "Candidate introduced background in backend engineering and discussed Redis caching architecture for high-volume transactions. Demonstrated solid understanding of cache TTLs, but lacked depth on cache invalidation and database indexing."
}}
"""
