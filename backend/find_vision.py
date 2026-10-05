import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv(".env")
openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip("'\"")

async def get_vision_free():
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {openrouter_key}"}
        )
        data = resp.json()
        free_vision = []
        for m in data.get("data", []):
            pricing = m.get("pricing", {})
            prompt_cost = float(pricing.get("prompt", 0))
            completion_cost = float(pricing.get("completion", 0))
            architecture = m.get("architecture", {})
            modality = architecture.get("modality", "")
            if prompt_cost == 0 and completion_cost == 0:
                if "image" in modality or "multimodal" in modality:
                    free_vision.append(m["id"])
        
        print("Free Vision Models:")
        for fm in free_vision:
            print(" -", fm)

if __name__ == "__main__":
    asyncio.run(get_vision_free())
