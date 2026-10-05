import os
import asyncio
from dotenv import load_dotenv
from groq import AsyncGroq
from openai import AsyncOpenAI

load_dotenv(".env")
groq_key = os.getenv("GROQ_API_KEY", "").strip("'\"")
openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip("'\"")

async def test_live():
    print("Testing Live API Endpoints...")
    
    # 1. Groq (Text & Whisper)
    groq_client = AsyncGroq(api_key=groq_key)
    try:
        resp = await groq_client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[{"role": "user", "content": "Explain binary search in 10 words"}],
            max_tokens=30
        )
        print(" [GROQ SUCCESS]:", resp.choices[0].message.content.strip())
    except Exception as e:
        print(" [GROQ ERROR]:", e)

    # 2. OpenRouter (Vision & Text)
    or_client = AsyncOpenAI(base_url="https://openrouter.ai/api/v1", api_key=openrouter_key)
    try:
        resp = await or_client.chat.completions.create(
            model="qwen/qwen3.8-27b:free",
            messages=[{"role": "user", "content": "Explain two-pointer approach in 10 words"}],
            max_tokens=30
        )
        print(" [OPENROUTER SUCCESS]:", resp.choices[0].message.content.strip())
    except Exception as e:
        print(" [OPENROUTER ERROR]:", e)

if __name__ == "__main__":
    asyncio.run(test_live())
