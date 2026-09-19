import pytest
from backend.app.services.metrics import calculate_delivery_metrics, compute_similarity, is_duplicate_question

def test_delivery_metrics_calculation():
    sample_transcript = "Um so basically I designed a distributed queue with Redis, and like, it handled 10000 requests per second."
    word_timestamps = [
        {"word": "Um", "start": 0.0, "end": 0.4},
        {"word": "so", "start": 0.5, "end": 0.7},
        {"word": "basically", "start": 0.8, "end": 1.2},
        {"word": "I", "start": 3.5, "end": 3.7},  # 2.3s pause
        {"word": "designed", "start": 3.8, "end": 4.2},
        {"word": "a", "start": 4.3, "end": 4.4},
        {"word": "distributed", "start": 4.5, "end": 5.0},
        {"word": "queue", "start": 5.1, "end": 5.4},
        {"word": "with", "start": 5.5, "end": 5.7},
        {"word": "Redis,", "start": 5.8, "end": 6.2},
        {"word": "and", "start": 6.3, "end": 6.5},
        {"word": "like,", "start": 6.6, "end": 6.9},
        {"word": "it", "start": 7.0, "end": 7.2},
        {"word": "handled", "start": 7.3, "end": 7.7},
        {"word": "10000", "start": 7.8, "end": 8.2},
        {"word": "requests", "start": 8.3, "end": 8.7},
        {"word": "per", "start": 8.8, "end": 9.0},
        {"word": "second.", "start": 9.1, "end": 9.6}
    ]
    
    metrics = calculate_delivery_metrics(sample_transcript, word_timestamps=word_timestamps, total_duration_sec=9.6)
    
    assert metrics.fillers_count >= 3  # um, so, basically, like
    assert len(metrics.pauses_over_2s) >= 1  # 2.3s gap between basically (1.2) and I (3.5)
    assert metrics.wpm > 0

def test_false_starts():
    transcript = "I wanted I wanted to optimize the database query because we were we were seeing latency spikes."
    metrics = calculate_delivery_metrics(transcript, total_duration_sec=10.0)
    assert metrics.false_starts >= 2

def test_question_similarity_dedup():
    q1 = "Can you describe how you optimized database performance in your previous role?"
    q2 = "How did you optimize database queries and performance in your past project?"
    q3 = "Tell me about a time you resolved a major conflict with a team member."

    assert is_duplicate_question(q2, [q1], threshold=0.4)
    assert not is_duplicate_question(q3, [q1], threshold=0.4)
