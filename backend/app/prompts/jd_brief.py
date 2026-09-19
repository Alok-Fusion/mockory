def get_jd_brief_prompt(jd_text: str) -> str:
    return f"""RULES:
1. Summarize the Job Description into a concise brief of MAX 250 words.
2. Extract the target role, seniority level, must-have skills, and key responsibilities.
3. Respond ONLY with valid JSON matching the exact schema. No markdown formatting outside JSON.

JOB DESCRIPTION:
{jd_text[:3500]}

OUTPUT JSON SCHEMA:
{{
  "role": "Role Title",
  "seniority": "Junior | Mid | Senior | Staff",
  "core_skills": ["skill1", "skill2", "skill3"],
  "brief": "Concise summary under 250 words covering requirements and expectations."
}}

EXAMPLE:
{{
  "role": "Senior Backend Engineer",
  "seniority": "Senior",
  "core_skills": ["Python", "FastAPI", "PostgreSQL", "Distributed Systems", "Docker"],
  "brief": "Senior backend role focusing on high-throughput microservices in Python. Requires strong database optimization, API design, and cloud deployments. Needs 5+ years experience and proven ownership of scale challenges."
}}
"""
