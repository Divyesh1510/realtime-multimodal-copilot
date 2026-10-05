import re
from typing import Tuple

# Common technical interview intent triggers
QUESTION_PATTERNS = [
    r"\b(what|why|how|when|where|which|who)\b",
    r"\b(can you|could you|would you|explain|describe)\b",
    r"\b(how would you|how do you|how can we)\b",
    r"\b(optimize|implement|solve|refactor|design|architect)\b",
    r"\b(time complexity|space complexity|big o|runtime)\b",
    r"\b(difference between|trade-off|pros and cons)\b",
    r"\b(edge case|null pointer|memory leak|deadlock|race condition)\b",
]

# Common conversational fillers to discard immediately
FILLER_PATTERNS = [
    r"^(okay|ok|yeah|yes|yep|sure|got it|sounds good|cool)\.?$",
    r"^(can you hear me|am i audible|can you see my screen)\??$",
    r"^(let me share|let's get started|one second|hold on)\.?$",
    r"^(hello|hi|hey|good morning|good afternoon)\.?$",
]

def evaluate_intent(transcript: str) -> Tuple[bool, str]:
    """
    Evaluates whether an utterance from the interviewer is an actionable question/task
    worthy of LLM token consumption, or filler conversational noise.
    
    Returns:
        (should_trigger, reason)
    """
    clean_text = transcript.strip().lower()
    
    # 1. Check length threshold
    if len(clean_text) < 8:
        return False, "Utterance too short"
        
    # 2. Check filler patterns
    for filler in FILLER_PATTERNS:
        if re.search(filler, clean_text, re.IGNORECASE):
            return False, f"Matches conversational filler pattern: '{filler}'"
            
    # 3. Check explicit question mark
    if "?" in transcript:
        return True, "Contains explicit question mark"
        
    # 4. Check interview query patterns
    for pattern in QUESTION_PATTERNS:
        if re.search(pattern, clean_text, re.IGNORECASE):
            return True, f"Matched technical intent trigger: '{pattern}'"
            
    return False, "No technical question or problem-solving intent detected"
