import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from backend.app.services.llm import LLMService
from backend.app.models.schemas import NextActionDecision, EvalAScores

@pytest.mark.asyncio
async def test_next_action_wrap_up_limit():
    service = LLMService()
    decision = await service.decide_next_action(
        round_type="technical",
        current_question="What is CAP theorem?",
        candidate_answer="A system can guarantee at most two out of three.",
        consecutive_followups=0,
        turns_in_round=6,
        max_turns_in_round=6,
        current_topic="Distributed Systems"
    )
    assert decision.action == "wrap_up_round"

@pytest.mark.asyncio
async def test_next_action_followup_cap():
    service = LLMService()
    decision = await service.decide_next_action(
        round_type="technical",
        current_question="What is CAP theorem?",
        candidate_answer="Vague response.",
        consecutive_followups=2, # Cap reached!
        turns_in_round=3,
        max_turns_in_round=6,
        current_topic="Distributed Systems"
    )
    assert decision.action == "new_question"

@pytest.mark.asyncio
async def test_schema_fallback_on_invalid_json():
    service = LLMService()
    with patch.object(service, "call_ollama_raw", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "INVALID NON-JSON OUTPUT THAT CANNOT BE PARSED"
        fallback = EvalAScores(overall=5.5, verdict="Fallback used")
        
        result = await service.call_structured(
            EvalAScores,
            prompt="Score this answer",
            model="qwen2.5:3b",
            fallback_factory=fallback
        )
        
        assert result.overall == 5.5
        assert result.verdict == "Fallback used"
