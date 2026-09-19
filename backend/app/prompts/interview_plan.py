def get_interview_plan_prompt(jd_brief: str, resume_brief: str, difficulty: str) -> str:
    return f"""RULES:
1. Create a structured interview plan comparing the JD Brief and Resume Brief for difficulty '{difficulty}'.
2. Identify must-have skills from JD, resume projects worth probing, skill gaps (JD requirements missing in resume), and potential red flags.
3. FORBIDDEN: Do not invent skills. Base strictly on the provided briefs.
4. Respond ONLY with valid JSON matching the exact schema.

JD BRIEF:
{jd_brief}

RESUME BRIEF:
{resume_brief}

OUTPUT JSON SCHEMA:
{{
  "role": "Role Title",
  "seniority": "{difficulty}",
  "must_have_skills": ["skill1", "skill2", "skill3"],
  "nice_to_have_skills": ["skill4", "skill5"],
  "resume_projects": ["Project A to probe", "Project B to probe"],
  "skill_gaps": ["Skill X required by JD but missing/weak in resume"],
  "red_flags": ["Potential ambiguity, short tenures, or unquantified claims"]
}}

EXAMPLE:
{{
  "role": "Senior Backend Engineer",
  "seniority": "Senior",
  "must_have_skills": ["Python", "FastAPI", "Distributed Systems", "PostgreSQL"],
  "nice_to_have_skills": ["Kubernetes", "gRPC"],
  "resume_projects": ["Analytics Pipeline data migration", "Auth Service overhaul"],
  "skill_gaps": ["Distributed consensus experience not mentioned in resume"],
  "red_flags": ["No scale numbers provided on database optimization"]
}}
"""
