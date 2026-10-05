import os
import asyncio
from dotenv import load_dotenv
from groq import AsyncGroq
from openai import AsyncOpenAI

# Load .env explicitly
load_dotenv(".env")

groq_key = os.getenv("GROQ_API_KEY", "").strip("'\"")
openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip("'\"")

async def test_keys():
    print("=== Testing API Keys ===")
    
    # 1. Test Groq
    if groq_key:
        print("\n[Testing Groq API Key...]")
        try:
            groq_client = AsyncGroq(api_key=groq_key)
            resp = await groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": "Respond with 'Groq OK'"}],
                max_tokens=10
            )
            print(">>> Groq Success:", resp.choices[0].message.content.strip())
        except Exception as e:
            print(">>> Groq Error:", e)
    else:
        print(">>> Groq API Key not found!")

    # 2. Test OpenRouter
    if openrouter_key:
        print("\n[Testing OpenRouter API Key...]")
        try:
            or_client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                default_headers={
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "RealTime-Copilot-Test"
                }
            )
            resp = await or_client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct:free",
                messages=[{"role": "user", "content": "Respond with 'OpenRouter OK'"}],
                max_tokens=10
            )
            print(">>> OpenRouter Success:", resp.choices[0].message.content.strip())
        except Exception as e:
            print(">>> OpenRouter Error:", e)
    else:
        print(">>> OpenRouter API Key not found!")

if __name__ == "__main__":
    asyncio.run(test_keys())
