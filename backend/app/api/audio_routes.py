import io
from fastapi import APIRouter, UploadFile, File, Form, Response, HTTPException
from pydantic import BaseModel

from backend.app.services.audio import transcribe_audio_file, synthesize_speech
from backend.app.services.metrics import calculate_delivery_metrics

router = APIRouter(prefix="/api", tags=["Audio"])

class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Synthesizes text to spoken WAV audio."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    wav_bytes = synthesize_speech(req.text, req.voice)
    if wav_bytes is None:
        # Inform client to use browser SpeechSynthesis fallback
        return Response(
            content=b"",
            status_code=204,
            headers={"X-TTS-Fallback": "browser"}
        )
        
    return Response(content=wav_bytes, media_type="audio/wav")


@router.post("/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    """Transcribes audio file to text with word timestamps and computed metrics."""
    audio_bytes = await audio_file.read()
    transcript, word_timestamps, total_duration = transcribe_audio_file(audio_bytes, audio_file.filename)
    
    metrics = calculate_delivery_metrics(
        transcript=transcript,
        word_timestamps=word_timestamps,
        total_duration_sec=total_duration
    )
    
    return {
        "transcript": transcript,
        "word_timestamps": word_timestamps,
        "metrics": metrics
    }
