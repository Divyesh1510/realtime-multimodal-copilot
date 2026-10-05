import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Real-Time Multimodal Copilot"
    VERSION: str = "1.0.0"
    
    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip("'\"")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "").strip("'\"")
    
    GROQ_TEXT_MODEL: str = os.getenv("GROQ_TEXT_MODEL", "qwen/qwen3.8-27b")
    GROQ_WHISPER_MODEL: str = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")

    # OpenRouter Defaults
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_VISION_MODEL: str = os.getenv("OPENROUTER_VISION_MODEL", "openrouter/free")
    OPENROUTER_TEXT_MODEL: str = os.getenv("OPENROUTER_TEXT_MODEL", "openrouter/free")

    # Audio & Streaming Parameters
    SAMPLE_RATE: int = 16000
    AUDIO_CHANNELS: int = 1
    SPEAKER_DEBOUNCE_SECONDS: float = 1.5
    
    # Storage
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./copilot_sessions.db")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
