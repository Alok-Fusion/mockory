from fastapi import APIRouter
from backend.app.models.schemas import HealthResponse
from backend.app.services.llm import llm_service
from backend.app.services.audio import is_whisper_ready, is_kokoro_ready
from backend.app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/api/health", response_model=HealthResponse)
async def check_health():
    """Checks Ollama connection, loaded models, and audio engines."""
    llm_health = await llm_service.check_health()
    
    whisper_ready = is_whisper_ready()
    kokoro_ready = is_kokoro_ready()
    
    fix_cmd = None
    if not llm_health["connected"]:
        fix_cmd = "ollama serve"
    elif not llm_health["interview_model_present"]:
        fix_cmd = f"ollama pull {settings.OLLAMA_MODEL_INTERVIEW}"
    elif not llm_health["eval_model_present"]:
        fix_cmd = f"ollama pull {settings.OLLAMA_MODEL_EVAL}"

    status = "ok" if (llm_health["connected"] and llm_health["interview_model_present"]) else "error"

    return HealthResponse(
        status=status,
        ollama_connected=llm_health["connected"],
        models_available=llm_health["models"],
        interview_model=settings.OLLAMA_MODEL_INTERVIEW,
        eval_model=settings.OLLAMA_MODEL_EVAL,
        whisper_ready=whisper_ready,
        kokoro_ready=kokoro_ready,
        fix_command=fix_cmd
    )
