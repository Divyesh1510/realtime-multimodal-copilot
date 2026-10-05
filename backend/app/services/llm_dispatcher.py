import os
from typing import AsyncGenerator
from groq import AsyncGroq
from openai import AsyncOpenAI
from app.core.config import settings

class LLMDispatcher:
    def __init__(self):
        # Groq client for low-latency text reasoning
        self.groq_client = None
        if settings.GROQ_API_KEY:
            self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            
        # OpenRouter client (OpenAI-compatible) for vision and general models
        self.openrouter_client = None
        if settings.OPENROUTER_API_KEY:
            self.openrouter_client = AsyncOpenAI(
                base_url=settings.OPENROUTER_BASE_URL,
                api_key=settings.OPENROUTER_API_KEY,
                default_headers={
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "RealTime-Multimodal-Copilot"
                }
            )

    async def stream_text_reasoning(
        self, 
        prompt: str, 
        conversation_history: str = ""
    ) -> AsyncGenerator[str, None]:
        """
        Uses Groq (if available) or OpenRouter free models for fast sub-300ms text reasoning.
        """
        system_instruction = (
            "You are an expert technical interview and engineering copilot. "
            "Deliver direct, highly technical, actionable advice, optimal code patterns, "
            "or algorithmic complexity without filler."
        )
        user_content = f"Recent Conversation Context:\n{conversation_history}\n\nCurrent Question/Query:\n{prompt}"

        # Option A: Fast Groq Inference
        if self.groq_client:
            try:
                stream = await self.groq_client.chat.completions.create(
                    model=settings.GROQ_TEXT_MODEL,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=0.2,
                    max_tokens=700,
                    stream=True
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                return
            except Exception as e:
                yield f"\n[Groq Text Error: {e}, falling back to OpenRouter...]\n"

        # Option B: OpenRouter Fallback
        if self.openrouter_client:
            try:
                stream = await self.openrouter_client.chat.completions.create(
                    model=settings.OPENROUTER_TEXT_MODEL,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=0.2,
                    max_tokens=700,
                    stream=True
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                return
            except Exception as e:
                yield f"\n[OpenRouter Text Error: {e}]"
                return

        # Fallback if no keys provided yet
        yield "*(LLM Dispatcher ready. Configure GROQ_API_KEY or OPENROUTER_API_KEY in backend/.env)*"

    async def stream_multimodal_reasoning(
        self,
        prompt: str,
        image_base64: str,
        conversation_history: str = ""
    ) -> AsyncGenerator[str, None]:
        """
        Streams visual reasoning using OpenRouter free vision models
        (e.g., google/gemini-2.0-flash-exp:free or qwen/qwen-2.5-vl-72b-instruct:free).
        """
        if not self.openrouter_client:
            yield "*(OpenRouter client ready. Add OPENROUTER_API_KEY to backend/.env to enable vision analysis)*"
            return

        # Ensure valid data URI
        if not image_base64.startswith("data:image"):
            image_url = f"data:image/jpeg;base64,{image_base64}"
        else:
            image_url = image_base64

        system_instruction = (
            "You are an expert AI technical interview copilot with screen vision. "
            "Analyze the provided screenshot (code editor, IDE, question, or diagram) alongside the conversation. "
            "Identify bugs, outline optimal algorithms, or provide key code snippets concisely."
        )

        user_content = [
            {"type": "text", "text": f"Recent Conversation:\n{conversation_history}\n\nTask/Question: {prompt}"},
            {"type": "image_url", "image_url": {"url": image_url}}
        ]

        try:
            stream = await self.openrouter_client.chat.completions.create(
                model=settings.OPENROUTER_VISION_MODEL,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.2,
                max_tokens=800,
                stream=True
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            yield f"\n[OpenRouter Vision Error: {e}]"

llm_dispatcher = LLMDispatcher()
