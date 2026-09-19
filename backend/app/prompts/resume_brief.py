def get_resume_brief_prompt(resume_text: str) -> str:
    return f"""RULES:
1. Summarize the candidate resume into a concise brief of MAX 300 words.
2. Extract candidate name, current/latest role, top verified skills, and notable projects with 1-line impact.
3. FORBIDDEN: Do not invent any experience, metrics, or technologies not in the text.
4. Respond ONLY with valid JSON matching the exact schema.

RESUME TEXT:
{resume_text[:3500]}

OUTPUT JSON SCHEMA:
{{
  "candidate_name": "Name",
  "current_role": "Current or Recent Title",
  "top_skills": ["skill1", "skill2"],
  "top_projects": ["Project A: built X using Y, achieved Z", "Project B: led W resulting in Q"],
  "brief": "Concise summary under 300 words covering role history, verified skills, project impacts, and education."
}}

EXAMPLE:
{{
  "candidate_name": "Alex Smith",
  "current_role": "Software Engineer",
  "top_skills": ["Python", "React", "SQL", "Docker"],
  "top_projects": ["Analytics Pipeline: built real-time streaming pipeline reducing ingestion delay by 40%", "Auth Service: migrated monolith auth to OAuth2 JWT with 99.9% uptime"],
  "brief": "Alex has 3 years of experience as a Software Engineer building backend services in Python and frontend interfaces in React. Proven record in API design and cloud migration. BS in Computer Science."
}}
"""
