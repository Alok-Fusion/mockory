def get_eval_b_mistakes_prompt(
    round_type: str,
    jd_brief: str,
    question: str,
    candidate_answer: str
) -> str:
    is_star = round_type.lower() in ["behavioral", "hr", "manager", "culture"]

    star_section = ""
    if is_star:
        star_section = """
- Check for STAR framework adherence:
  * situation: Did they describe the context/background?
  * task: Did they specify their personal objective?
  * action: Did they explain specific steps THEY took?
  * result: Did they provide measurable business impact?
"""

    return f"""RULES:
1. Identify what was good, concrete mistakes with direct quotes, and missing points that a top-tier candidate would mention for this JD.
2. Mistake types allowed: 'factual error', 'vague', 'missing example', 'rambling', 'off-topic', 'weak structure', 'buzzword without substance', 'contradiction with resume', 'negative framing'.
3. Every mistake MUST include:
   - type: one of the allowed types.
   - quote_from_my_answer: verbatim quote or phrase from the answer.
   - why_it_hurts: specific reason why an interviewer views this negatively.
4. If no mistakes exist, leave mistakes array empty [].{star_section}
5. Respond ONLY with valid JSON.

JD BRIEF:
{jd_brief}

QUESTION:
{question}

CANDIDATE ANSWER:
{candidate_answer}

OUTPUT JSON SCHEMA:
{{
  "what_was_good": ["Strong point 1", "Strong point 2"],
  "mistakes": [
    {{
      "type": "vague",
      "quote_from_my_answer": "exact quote from answer",
      "why_it_hurts": "explanation of why it weakens the answer"
    }}
  ],
  "missing_points": ["Point that should have been covered"],
  "star_completeness": {{"situation": true, "task": true, "action": true, "result": false, "notes": "Missing quantitative impact"}}
}}

EXAMPLE:
{{
  "what_was_good": ["Immediately identified database indexing as the primary bottleneck", "Clear explanation of B-tree vs Hash indexes"],
  "mistakes": [
    {{
      "type": "missing example",
      "quote_from_my_answer": "I optimized our slow queries at my previous job",
      "why_it_hurts": "Lacks specific numbers (e.g. latency drop from 2s to 120ms) and tooling used (e.g. EXPLAIN ANALYZE)."
    }}
  ],
  "missing_points": ["Impact of write amplification when adding multiple indexes"],
  "star_completeness": null
}}
"""
