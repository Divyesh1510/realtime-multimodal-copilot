import os
import io
from typing import Optional
from groq import AsyncGroq
from app.core.config import settings

class STTService:
    def __init__(self):
        self.groq_client = None
        if settings.GROQ_API_KEY:
            self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def transcribe_pcm_chunk(self, pcm_bytes: bytes, filename: str = "audio.wav") -> str:
        """
        Transcribes 16kHz 16-bit PCM audio chunk using Groq Whisper free tier
        (whisper-large-v3-turbo).
        """
        if not self.groq_client:
            # Fallback mock for local dev if key is not yet set
            return "[Mock Transcript: API Key pending]"

        try:
            # Wrap PCM bytes with minimal WAV container in memory
            wav_buffer = self._pcm_to_wav(pcm_bytes)
            wav_buffer.name = filename

            transcription = await self.groq_client.audio.transcriptions.create(
                file=(filename, wav_buffer.read()),
                model="whisper-large-v3-turbo",
                language="en",
                response_format="text",
                temperature=0.0,
                prompt="Technical software interview conversation, questions, code, and algorithmic discussion."
            )
            clean_text = transcription.strip()
            # Filter common Whisper hallucinations on low energy/silence
            hallucinations = ["thank you.", "thank you", "thanks for watching.", "so,", "yeah.", "you know.", "bye."]
            if clean_text.lower() in hallucinations:
                return ""
            return clean_text
        except Exception as e:
            print(f"[STT Error]: {e}")
            return ""

    @staticmethod
    def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 16000, num_channels: int = 1, bit_depth: int = 16) -> io.BytesIO:
        """Constructs a basic RIFF WAV in-memory buffer from raw PCM bytes."""
        import struct
        wav_io = io.BytesIO()
        byte_rate = sample_rate * num_channels * (bit_depth // 8)
        block_align = num_channels * (bit_depth // 8)
        data_size = len(pcm_data)
        
        # Header
        wav_io.write(b"RIFF")
        wav_io.write(struct.pack("<I", 36 + data_size))
        wav_io.write(b"WAVE")
        wav_io.write(b"fmt ")
        wav_io.write(struct.pack("<I", 16)) # Subchunk1Size
        wav_io.write(struct.pack("<H", 1))  # PCM format
        wav_io.write(struct.pack("<H", num_channels))
        wav_io.write(struct.pack("<I", sample_rate))
        wav_io.write(struct.pack("<I", byte_rate))
        wav_io.write(struct.pack("<H", block_align))
        wav_io.write(struct.pack("<H", bit_depth))
        wav_io.write(b"data")
        wav_io.write(struct.pack("<I", data_size))
        wav_io.write(pcm_data)
        
        wav_io.seek(0)
        return wav_io

stt_service = STTService()
