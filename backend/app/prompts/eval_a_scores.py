def get_eval_a_scores_prompt(
    round_type: str,
    strictness: str,
    difficulty: str,
    question: str,
    candidate_answer: str,
    delivery_confidence_hint: float = 7.0
) -> str:
    scoring_guide = {
        "Friendly": "Be supportive and encouraging. Reward good intent and basic structure (standard range: 7.5 - 9.5).",
        "Realistic": "Realistic corporate interview standard. Expect solid technical depth and clear reasoning (standard range: 5.5 - 8.5).",
        "Tough": "Strict bar. Heavily penalize hand-waving, buzzwords without mechanics, and lack of quantified metrics (standard range: 3.5 - 7.5)."
    }.get(strictness, "Realistic corporate interview standard.")

    return f"""RULES:
1. You are an expert interview evaluator evaluating a candidate's answer for a {round_type.upper()} question ({difficulty} level).
2. SCORING STANDARD ({strictness}): {scoring_guide}
3. Score each dimension on a scale from 1.0 to 10.0 (one decimal place).
4. Dimensions:
   - relevance: How directly it answered the exact question.
   - correctness: Technical accuracy and domain correctness.
   - depth: Architectural / mechanical detail and trade-offs.
   - structure: Logical flow, clarity, STAR adherence if behavioral.
   - communication: Conciseness, directness, professional articulation.
   - confidence: Assessed delivery poise (use baseline ~{delivery_confidence_hint:.1f}).
   - overall: Weighted composite score.
5. Provide a short 1-sentence verdict.
6. Respond ONLY with valid JSON.

QUESTION:
{question}

CANDIDATE ANSWER:
{candidate_answer}

OUTPUT JSON SCHEMA:
{{
  "relevance": 7.5,
  "correctness": 7.0,
  "depth": 6.5,
  "structure": 8.0,
  "communication": 7.5,
  "confidence": 7.0,
  "overall": 7.2,
  "verdict": "Clear response with good high-level concepts, but needs deeper mechanical explanation."
}}

EXAMPLE:
{{
  "relevance": 8.5,
  "correctness": 8.0,
  "depth": 7.0,
  "structure": 7.5,
  "communication": 8.0,
  "confidence": 7.5,
  "overall": 7.8,
  "verdict": "Strong grasp of caching layers; could improve by addressing cache invalidation trade-offs."
}}
"""
