import os
from pathlib import Path
from pydantic_settings import BaseSettings

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
BASE_DATA_DIR = ROOT_DIR / "backend" / "data"
BASE_DATA_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_TEMP_DIR = BASE_DATA_DIR / "audio_temp"
AUDIO_TEMP_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Rory Mock Interview"
    VERSION: str = "1.0.0"
    
    # Ollama LLM Configuration
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL_INTERVIEW: str = "qwen2.5:3b"
    OLLAMA_MODEL_EVAL: str = "qwen2.5:3b"
    OLLAMA_NUM_CTX_INTERVIEW: int = 4096
    OLLAMA_NUM_CTX_EVAL: int = 8192
    TEMPERATURE_INTERVIEW: float = 0.7
    TEMPERATURE_EVAL: float = 0.2
    
    # Audio STT Configuration (faster-whisper)
    WHISPER_MODEL_SIZE: str = "base.en"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    
    # Audio TTS Configuration (kokoro-onnx)
    KOKORO_VOICE: str = "af_heart"
    KOKORO_MODEL_PATH: str = ""
    KOKORO_VOICES_PATH: str = ""
    
    # Server & Storage
    DATA_DIR: str = str(BASE_DATA_DIR)
    AUDIO_TEMP_DIR: str = str(AUDIO_TEMP_DIR)
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173
    DATABASE_URL: str = f"sqlite:///{BASE_DATA_DIR / 'rory_mock.db'}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
