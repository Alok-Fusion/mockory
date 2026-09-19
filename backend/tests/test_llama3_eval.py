import asyncio
import httpx
from backend.app.services.llm import llm_service
from backend.app.models.schemas import EvalAScores, EvalBMistakes, EvalCImproved

async def test_llama3_comparison():
    print("\n--- Comparing Eval Pipeline on llama3:latest ---")
    
    question = "How did you handle cache invalidation and potential race conditions when updating hot keys in Redis?"
    answer = "We used Redlock with a 2-second lock expiry and retry backoff. When cache invalidation failed, we let the 5-minute TTL expire naturally."
    resume_brief = "Alex Morgan is a Senior Backend Developer with 4 years experience in Python, FastAPI, Redis caching, and PostgreSQL."
    jd_brief = "Senior Backend Engineer required to design low-latency microservices with high-throughput Redis caching and strong consistency."

    print("\n[Running Eval on llama3:latest...]")
    # Temporarily set eval model to llama3:latest
    original_model = llm_service.eval_model
    llm_service.eval_model = "llama3:latest"

    try:
        eval_res = await llm_service.evaluate_turn(
            round_type="technical",
            strictness="Realistic",
            difficulty="Senior",
            jd_brief=jd_brief,
            resume_brief=resume_brief,
            question=question,
            candidate_answer=answer,
            delivery_confidence_hint=7.5
        )

        print("\n=== LLaMA 3 Evaluation Output ===")
        print(f"Overall Score: {eval_res.scores.overall}/10")
        print(f"Scores Breakdown: Relevance={eval_res.scores.relevance}, Correctness={eval_res.scores.correctness}, Depth={eval_res.scores.depth}, Structure={eval_res.scores.structure}, Comm={eval_res.scores.communication}")
        print(f"Verdict: {eval_res.scores.verdict}")
        print(f"What was good: {eval_res.what_was_good}")
        print(f"Mistakes: {[m.model_dump() for m in eval_res.mistakes]}")
        print(f"Missing points: {eval_res.missing_points}")
        print(f"Improved Answer: {eval_res.improved_answer}")
        print(f"Pro Tip: {eval_res.tip}")
    finally:
        llm_service.eval_model = original_model

if __name__ == "__main__":
    asyncio.run(test_llama3_comparison())
