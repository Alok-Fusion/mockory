def get_next_action_prompt(
    round_type: str,
    current_question: str,
    candidate_answer: str,
    consecutive_followups: int,
    turns_in_round: int,
    max_turns_in_round: int,
    current_topic: str
) -> str:
    return f"""RULES:
1. You are the interview decision engine. Decide Rory's next action after hearing the candidate's answer.
2. Actions:
   - "followup": Use if the answer was vague, shallow, missing concrete numbers/metrics, technically incomplete, contradicted resume, or opened an interesting thread worth probing.
     * NOTE: If consecutive_followups is >= 2, you MUST NOT choose "followup" (limit reached).
   - "new_question": Use if the topic was sufficiently covered OR followup limit was hit, and more questions remain in the round.
   - "wrap_up_round": Use ONLY if turns_in_round >= {max_turns_in_round}.
3. Respond ONLY with valid JSON.

DATA:
Round: {round_type}
Current Question: {current_question}
Candidate Answer: {candidate_answer}
Current Topic: {current_topic}
Consecutive Followups on this topic: {consecutive_followups} (Max allowed: 2)
Turns Completed in Round: {turns_in_round} / {max_turns_in_round}

OUTPUT JSON SCHEMA:
{{
  "action": "followup | new_question | wrap_up_round",
  "reason": "Brief reason in under 15 words",
  "topic": "{current_topic}"
}}

EXAMPLE:
{{
  "action": "followup",
  "reason": "Candidate gave a high-level overview without mentioning specific database indexing strategies.",
  "topic": "Database Optimization"
}}
"""
