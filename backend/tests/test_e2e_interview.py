import asyncio
import json
import httpx

API_BASE = "http://127.0.0.1:8000/api"

SAMPLE_JD = """Role: Senior Backend Engineer
Requirements:
- 5+ years experience in Python and distributed systems.
- Strong expertise with PostgreSQL, indexing, and Redis caching.
- Deep knowledge of microservices architecture and scalability."""

SAMPLE_RESUME = """Alex Morgan - Senior Backend Developer
Experience:
- Developed high-throughput streaming pipelines in Python and Kafka.
- Optimized PostgreSQL database indexes, decreasing query latency by 45%.
- Implemented Redis distributed caching layer for hot endpoints."""

async def run_e2e_test():
    async with httpx.AsyncClient(timeout=120.0) as client:
        print("\n--- 1. Testing Health Check ---")
        health = (await client.get(f"{API_BASE}/health")).json()
        print(f"Health Status: {health['status']} | Ollama Connected: {health['ollama_connected']}")
        assert health["ollama_connected"], "Ollama should be connected"

        print("\n--- 2. Creating Interview Session (Planning Stage) ---")
        create_resp = await client.post(f"{API_BASE}/session", data={
            "jd_text": SAMPLE_JD,
            "resume_text": SAMPLE_RESUME,
            "rounds_json": json.dumps(["technical", "behavioral"]),
            "difficulty": "Senior",
            "strictness": "Realistic",
            "avatar_mode": "2d",
            "questions_per_round": 3
        })
        session_data = create_resp.json()
        session_id = session_data["session_id"]
        print(f"Session Created: {session_id}")
        print(f"JD Brief: {session_data['jd_brief'][:120]}...")
        print(f"Resume Brief: {session_data['resume_brief'][:120]}...")
        print(f"Plan Must Haves: {session_data['plan'].get('must_have_skills')}")

        print("\n--- 3. Fetching First Question (Opening) ---")
        q1_resp = (await client.post(f"{API_BASE}/session/{session_id}/next")).json()
        print(f"Rory Opening Ack: \"{q1_resp['acknowledgement']}\"")
        print(f"Rory Question: \"{q1_resp['question_text']}\"")
        assert len(q1_resp["question_text"]) > 10, "Question should be populated"

        print("\n--- 4. Submitting Typed Answer ---")
        ans1_resp = (await client.post(f"{API_BASE}/session/{session_id}/answer", data={
            "turn_id": q1_resp["turn_id"],
            "typed_text": "In my previous project, I designed a Redis caching architecture with a write-through strategy. We faced database CPU spikes during peak traffic, and adding Redis caching with a 5-minute TTL reduced our p95 query latency from 850ms to 95ms and lowered database load by 45%."
        })).json()
        
        eval1 = ans1_resp["evaluation"]
        print(f"Turn 1 Score: {eval1['scores']['overall']}/10 (Verdict: {eval1['scores']['verdict']})")
        print(f"What was good: {eval1.get('what_was_good')}")
        print(f"Improved Answer: {eval1.get('improved_answer')[:120]}...")
        print(f"Next Action Decided: {ans1_resp['next_action']['action']} ({ans1_resp['next_action']['reason']})")

        print("\n--- 5. Fetching Second Question (Followup or New Q) ---")
        q2_resp = (await client.post(f"{API_BASE}/session/{session_id}/next")).json()
        print(f"Rory Next Ack: \"{q2_resp['acknowledgement']}\"")
        print(f"Rory Question: \"{q2_resp['question_text']}\" (Topic: {q2_resp['topic']})")

        print("\n--- 6. Submitting Multimodal Answer (Voice Transcript + Typed Notes) ---")
        ans2_resp = (await client.post(f"{API_BASE}/session/{session_id}/answer", data={
            "turn_id": q2_resp["turn_id"],
            "voice_transcript_client": "Um so basically when invalidating cache keys we ran into some race conditions and uh like we used distributed locks.",
            "typed_text": "Note: Specifically used Redlock algorithm with Redis with a 2-second lock expiry and retry backoff."
        })).json()

        print(f"Merged Answer: \"{ans2_resp['merged_answer']}\"")
        dm = ans2_resp["delivery_metrics"]
        print(f"Delivery Metrics: {dm['wpm']} WPM | {dm['fillers_count']} fillers detected")
        print(f"Turn 2 Score: {ans2_resp['evaluation']['scores']['overall']}/10")

        print("\n--- 7. Generating Final Comprehensive Report ---")
        report = (await client.get(f"{API_BASE}/session/{session_id}/report")).json()
        print(f"Overall Final Score: {report['overall_score']}/10")
        print(f"Round Breakdown: {report['round_scores']}")
        print(f"Skill Radar: {report['skill_radar']}")
        print(f"Top Strengths: {report['top_strengths']}")
        print(f"Top Improvement Areas: {report['top_mistakes']}")
        print(f"Practice Plan Steps: {len(report['practice_plan'])}")

        print("\n--- 8. Testing PDF & Markdown Export Endpoints ---")
        pdf_res = await client.get(f"{API_BASE}/session/{session_id}/export/pdf")
        md_res = await client.get(f"{API_BASE}/session/{session_id}/export/md")
        print(f"PDF Export status: {pdf_res.status_code} ({len(pdf_res.content)} bytes)")
        print(f"Markdown Export status: {md_res.status_code} ({len(md_res.content)} bytes)")

        print("\nSUCCESS: All integration checks passed on qwen2.5:3b!")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
