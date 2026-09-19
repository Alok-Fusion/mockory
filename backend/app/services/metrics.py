import re
import math
from typing import List, Dict, Any, Tuple
from backend.app.models.schemas import DeliveryMetrics

FILLER_WORDS = [
    r"\bum\b",
    r"\buh\b",
    r"\blike\b",
    r"\byou know\b",
    r"\bbasically\b",
    r"\bactually\b",
    r"\bso\b",
    r"\bkind of\b",
    r"\bsort of\b",
    r"\bi mean\b"
]

def calculate_delivery_metrics(
    transcript: str,
    word_timestamps: List[Dict[str, Any]] = None,
    total_duration_sec: float = 0.0
) -> DeliveryMetrics:
    if not transcript or not transcript.strip():
        return DeliveryMetrics(
            wpm=0.0,
            fillers_count=0,
            fillers_list=[],
            pauses_over_2s=[],
            total_duration_sec=total_duration_sec,
            false_starts=0
        )

    words = transcript.strip().split()
    word_count = len(words)
    
    # Duration calculation
    if total_duration_sec <= 0 and word_timestamps and len(word_timestamps) > 0:
        total_duration_sec = max(0.1, word_timestamps[-1].get("end", 0.0) - word_timestamps[0].get("start", 0.0))
    elif total_duration_sec <= 0:
        # Estimated reading speed fallback ~130 wpm
        total_duration_sec = max(1.0, (word_count / 130.0) * 60.0)

    # WPM
    minutes = max(0.01, total_duration_sec / 60.0)
    wpm = round(word_count / minutes, 1)

    # Filler words detection
    lower_text = transcript.lower()
    fillers_list = []
    fillers_count = 0
    for pattern in FILLER_WORDS:
        matches = list(re.finditer(pattern, lower_text))
        count = len(matches)
        if count > 0:
            clean_word = pattern.replace(r"\b", "").replace("\\", "")
            fillers_list.append({"word": clean_word, "count": count})
            fillers_count += count

    # Pauses over 2 seconds from word timestamps
    pauses_over_2s = []
    if word_timestamps and len(word_timestamps) > 1:
        for i in range(len(word_timestamps) - 1):
            curr_end = word_timestamps[i].get("end", 0.0)
            next_start = word_timestamps[i + 1].get("start", 0.0)
            gap = next_start - curr_end
            if gap >= 2.0:
                pauses_over_2s.append(round(gap, 2))

    # False starts detection (e.g., "I wanted I wanted to", "we were we were")
    false_start_pattern = r"\b(\w+(?:\s+\w+)?)\s+\1\b"
    false_start_matches = re.findall(false_start_pattern, lower_text)
    false_starts = len(false_start_matches)

    return DeliveryMetrics(
        wpm=wpm,
        fillers_count=fillers_count,
        fillers_list=fillers_list,
        pauses_over_2s=pauses_over_2s,
        total_duration_sec=round(total_duration_sec, 2),
        false_starts=false_starts
    )

def stem_token(word: str) -> str:
    """Lightweight suffix normalizer."""
    w = word.lower()
    for suffix in ["izing", "ized", "ize", "ising", "ised", "ise", "ies", "ied", "ing", "ed", "es", "s", "tion", "ment", "able", "ive"]:
        if w.endswith(suffix) and len(w) > len(suffix) + 2:
            return w[:-len(suffix)]
    return w

def compute_similarity(text1: str, text2: str) -> float:
    """Compute token overlap and Jaccard similarity between two questions."""
    raw1 = re.findall(r"\w+", text1.lower())
    raw2 = re.findall(r"\w+", text2.lower())
    
    stopwords = {"what", "how", "why", "can", "you", "tell", "me", "about", "a", "an", "the", "in", "to", "for", "with", "is", "are", "your", "my", "did", "do", "have", "past", "previous"}
    tokens1 = {stem_token(w) for w in raw1 if w not in stopwords}
    tokens2 = {stem_token(w) for w in raw2 if w not in stopwords}
    
    if not tokens1 or not tokens2:
        return 0.0
    
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    
    jaccard = len(intersection) / len(union)
    overlap = len(intersection) / min(len(tokens1), len(tokens2))
    
    # Return weighted combination that rewards high overlap of core topics
    return max(jaccard, overlap * 0.8)

def is_duplicate_question(new_question: str, asked_questions: List[str], threshold: float = 0.4) -> bool:
    """Check if new_question is too similar to any previously asked question."""
    for asked in asked_questions:
        if compute_similarity(new_question, asked) >= threshold:
            return True
    return False
