import asyncio
import time
from typing import Dict, List, Optional, Callable, Awaitable
from app.services.intent_filter import evaluate_intent

class SemanticDebounceBuffer:
    """
    Buffers audio transcripts for Channel 1 (Remote Speaker).
    Applies sliding silence debouncing (default 1.5s) and heuristic intent filtering
    before triggering LLM reasoning callbacks.
    """
    def __init__(
        self,
        debounce_seconds: float = 1.5,
        on_trigger_callback: Optional[Callable[[str], Awaitable[None]]] = None
    ):
        self.debounce_seconds = debounce_seconds
        self.on_trigger_callback = on_trigger_callback
        
        self.speaker_utterances: List[str] = []
        self.last_audio_timestamp: float = 0.0
        self.debounce_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    async def add_utterance(self, text: str):
        if not text.strip():
            return

        async with self._lock:
            self.speaker_utterances.append(text.strip())
            self.last_audio_timestamp = time.time()
            
            # Cancel any existing debounce task to reset the sliding window
            if self.debounce_task and not self.debounce_task.done():
                self.debounce_task.cancel()
                
            self.debounce_task = asyncio.create_task(self._wait_for_silence())

    async def _wait_for_silence(self):
        try:
            await asyncio.sleep(self.debounce_seconds)
            
            async with self._lock:
                if not self.speaker_utterances:
                    return

                aggregated_query = " ".join(self.speaker_utterances)
                self.speaker_utterances.clear()

            # Evaluate intent heuristics
            should_trigger, reason = evaluate_intent(aggregated_query)
            print(f"[Intent Filter] Query: '{aggregated_query}' | Trigger: {should_trigger} | Reason: {reason}")

            if should_trigger and self.on_trigger_callback:
                await self.on_trigger_callback(aggregated_query)

        except asyncio.CancelledError:
            # Expected when new speech resets the timer
            pass
        except Exception as e:
            print(f"[Debounce Error]: {e}")

    async def flush(self) -> str:
        """Immediately flushes any buffered speaker utterances (e.g., on hotkey trigger)."""
        async with self._lock:
            if not self.speaker_utterances:
                return ""
            query = " ".join(self.speaker_utterances)
            self.speaker_utterances.clear()
            return query
