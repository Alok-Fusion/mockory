def get_answer_merge_prompt(voice_transcript: str, typed_text: str) -> str:
    return f"""RULES:
1. Merge the spoken transcript and typed text into a single coherent, final candidate answer.
2. Treat the typed text as intentional additions, refinements, or corrections to the spoken response.
3. Keep the candidate's authentic wording and tone. Do not invent any new claims.
4. Respond ONLY with valid JSON.

SPOKEN TRANSCRIPT:
{voice_transcript}

TYPED TEXT:
{typed_text}

OUTPUT JSON SCHEMA:
{{
  "merged_answer": "Complete combined candidate response",
  "typed_additions": "Summary of what the typed text added or corrected"
}}

EXAMPLE:
{{
  "merged_answer": "I used Redis to cache hot user profiles with a 5-minute TTL, which reduced our database CPU utilization by 35% during peak traffic spikes.",
  "typed_additions": "Added specific 5-minute TTL and 35% CPU reduction metrics that were omitted in speech."
}}
"""
