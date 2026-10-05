import os
import asyncio
from dotenv import load_dotenv
from groq import AsyncGroq
from openai import AsyncOpenAI

load_dotenv(".env")
groq_key = os.getenv("GROQ_API_KEY", "").strip("'\"")
openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip("'\"")

async def check_models():
    # 1. Groq models
    if groq_key:
        print("Checking Groq models...")
        try:
            client = AsyncGroq(api_key=groq_key)
            models = await client.models.list()
            print("Groq available models:")
            for m in models.data:
                print(" -", m.id)
        except Exception as e:
            print("Groq list error:", e)

    # 2. OpenRouter models
    if openrouter_key:
        print("\nChecking OpenRouter free models...")
        try:
            client = AsyncOpenAI(base_url="https://openrouter.ai/api/v1", api_key=openrouter_key)
            # Test popular free models:
            test_models = [
                "meta-llama/llama-3.1-8b-instruct:free",
                "mistralai/mistral-7b-instruct:free",
                "google/gemini-2.0-flash-exp:free",
                "google/gemma-2-9b-it:free",
                "qwen/qwen-2.5-coder-32b-instruct:free"
            ]
            for tm in test_models:
                try:
                    res = await client.chat.completions.create(
                        model=tm,
                        messages=[{"role": "user", "content": "hi"}],
                        max_tokens=5
                    )
                    print(f" [OK] {tm}: {res.choices[0].message.content.strip()}")
                except Exception as ex:
                    print(f" [FAIL] {tm}: {ex}")
        except Exception as e:
            print("OpenRouter error:", e)

if __name__ == "__main__":
    asyncio.run(check_models())
