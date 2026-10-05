import json
import asyncio
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.stt_service import stt_service
from app.services.debounce_buffer import SemanticDebounceBuffer
from app.services.llm_dispatcher import llm_dispatcher

router = APIRouter()

class SessionContext:
    def __init__(self, session_id: str, websocket: WebSocket):
        self.session_id = session_id
        self.websocket = websocket
        self.last_screen_frame: Optional[str] = None
        self.transcript_history: List[Dict[str, str]] = []
        
        # Debounce buffer for speaker audio (Channel 1)
        self.debounce_buffer = SemanticDebounceBuffer(
            debounce_seconds=1.5,
            on_trigger_callback=self.on_intent_triggered
        )

    def append_transcript(self, speaker: str, text: str):
        self.transcript_history.append({"speaker": speaker, "text": text})
        # Keep sliding history capped to last 30 entries
        if len(self.transcript_history) > 30:
            self.transcript_history.pop(0)

    def get_formatted_history(self) -> str:
        return "\n".join([f"{entry['speaker']}: {entry['text']}" for entry in self.transcript_history[-15:]])

    async def on_intent_triggered(self, query: str):
        """Callback invoked when semantic debounce confirms an actionable interviewer question."""
        await self.websocket.send_json({
            "type": "status",
            "message": f"Analyzing question: '{query[:40]}...'"
        })

        await self.websocket.send_json({"type": "stream_start", "mode": "auto_trigger"})

        history = self.get_formatted_history()
        
        # If screen frame is present, run multimodal; otherwise text reasoning
        if self.last_screen_frame:
            async for chunk in llm_dispatcher.stream_multimodal_reasoning(
                prompt=query,
                image_base64=self.last_screen_frame,
                conversation_history=history
            ):
                await self.websocket.send_json({"type": "stream_chunk", "delta": chunk})
        else:
            async for chunk in llm_dispatcher.stream_text_reasoning(
                prompt=query,
                conversation_history=history
            ):
                await self.websocket.send_json({"type": "stream_chunk", "delta": chunk})

        await self.websocket.send_json({"type": "stream_end"})

    async def handle_manual_hotkey(self, custom_query: Optional[str] = None):
        """Immediately bypasses debounce and triggers priority reasoning."""
        flushed_text = await self.debounce_buffer.flush()
        query = custom_query or flushed_text or "Analyze current screen state and discuss technical approach."

        await self.websocket.send_json({
            "type": "status",
            "message": "Manual Hotkey Triggered: Running Priority Inference"
        })

        await self.websocket.send_json({"type": "stream_start", "mode": "manual_hotkey"})

        history = self.get_formatted_history()
        if self.last_screen_frame:
            async for chunk in llm_dispatcher.stream_multimodal_reasoning(
                prompt=query,
                image_base64=self.last_screen_frame,
                conversation_history=history
            ):
                await self.websocket.send_json({"type": "stream_chunk", "delta": chunk})
        else:
            async for chunk in llm_dispatcher.stream_text_reasoning(
                prompt=query,
                conversation_history=history
            ):
                await self.websocket.send_json({"type": "stream_chunk", "delta": chunk})

        await self.websocket.send_json({"type": "stream_end"})

@router.websocket("/ws/{session_id}")
async def websocket_copilot_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = SessionContext(session_id=session_id, websocket=websocket)
    print(f"[WebSocket] Connected session: {session_id}")

    try:
        while True:
            # We receive either binary frames (audio) or text frames (JSON control/screen)
            message = await websocket.receive()
            
            # 1. Binary Payload: Tagged Audio Chunk (Byte 0 = channel_id: 0 or 1)
            if "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                if len(raw_bytes) > 1:
                    channel_id = raw_bytes[0]
                    pcm_chunk = raw_bytes[1:]
                    
                    # Transcribe PCM
                    transcript = await stt_service.transcribe_pcm_chunk(pcm_chunk)
                    if transcript:
                        speaker_label = "Interviewer" if channel_id == 1 else "User"
                        session.append_transcript(speaker_label, transcript)
                        
                        # Send live transcript back to HUD
                        await websocket.send_json({
                            "type": "transcript",
                            "channel_id": channel_id,
                            "speaker": speaker_label,
                            "text": transcript
                        })

                        # Channel 1 (Remote Speaker) feeds the debounce buffer
                        if channel_id == 1:
                            await session.debounce_buffer.add_utterance(transcript)

            # 2. Text/JSON Payload: Screen Frames, Hotkey events, Ping
            elif "text" in message and message["text"]:
                data = json.loads(message["text"])
                msg_type = data.get("type")

                if msg_type == "screen_keyframe":
                    # Store latest high-res WebP keyframe from client dHash
                    session.last_screen_frame = data.get("image_base64")
                    await websocket.send_json({
                        "type": "status",
                        "message": f"Screen keyframe updated (dHash diff: {data.get('diff', 0)})"
                    })

                elif msg_type == "hotkey_trigger":
                    # Manual user override (Ctrl+Space)
                    custom_prompt = data.get("prompt")
                    await session.handle_manual_hotkey(custom_prompt)

                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        print(f"[WebSocket] Disconnected session: {session_id}")
    except Exception as e:
        print(f"[WebSocket Error] {e}")
