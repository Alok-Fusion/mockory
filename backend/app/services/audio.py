import os
import io
import re
import wave
import shutil
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from pypdf import PdfReader
from docx import Document

from backend.app.core.config import settings, BASE_DATA_DIR, AUDIO_TEMP_DIR

logger = logging.getLogger(__name__)

_whisper_model = None
_kokoro_pipeline = None

def is_whisper_ready() -> bool:
    """Fast non-blocking check."""
    return _whisper_model is not None

def is_kokoro_ready() -> bool:
    """Fast non-blocking check."""
    return _kokoro_pipeline is not None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            models_dir = BASE_DATA_DIR / "models_cache"
            models_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Loading faster-whisper model ({settings.WHISPER_MODEL_SIZE}) on {settings.WHISPER_DEVICE}...")
            _whisper_model = WhisperModel(
                settings.WHISPER_MODEL_SIZE,
                device=settings.WHISPER_DEVICE,
                compute_type=settings.WHISPER_COMPUTE_TYPE,
                download_root=str(models_dir)
            )
            logger.info("faster-whisper model loaded successfully.")
        except Exception as e:
            logger.warning(f"Failed to load faster-whisper: {e}")
            _whisper_model = None
    return _whisper_model

def get_kokoro_pipeline():
    global _kokoro_pipeline
    if _kokoro_pipeline is None:
        try:
            from kokoro_onnx import Kokoro
            model_path = settings.KOKORO_MODEL_PATH
            voices_path = settings.KOKORO_VOICES_PATH
            
            models_dir = BASE_DATA_DIR / "models_cache"
            models_dir.mkdir(parents=True, exist_ok=True)
            if not model_path:
                default_m = models_dir / "kokoro-v0_19.onnx"
                if default_m.exists():
                    model_path = str(default_m)
            if not voices_path:
                default_v = models_dir / "voices.bin"
                if default_v.exists():
                    voices_path = str(default_v)

            if model_path and voices_path and os.path.exists(model_path) and os.path.exists(voices_path):
                logger.info("Loading Kokoro-ONNX TTS...")
                _kokoro_pipeline = Kokoro(model_path, voices_path)
                logger.info("Kokoro-ONNX TTS loaded successfully.")
            else:
                logger.info("Kokoro ONNX model files not found in cache. Using browser speech synthesis fallback.")
        except Exception as e:
            logger.warning(f"Failed to initialize Kokoro TTS: {e}")
            _kokoro_pipeline = None
    return _kokoro_pipeline

# --- File Text Extraction ---
def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    text = ""
    try:
        if ext == ".pdf":
            reader = PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        elif ext in [".docx", ".doc"]:
            doc = Document(io.BytesIO(file_bytes))
            for para in doc.paragraphs:
                text += para.text + "\n"
        else: # plain text
            text = file_bytes.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"Error extracting text from {filename}: {e}")
        text = file_bytes.decode("utf-8", errors="ignore")
    return text.strip()

# --- Audio STT ---
def convert_to_wav_16k(input_path: str, output_path: str) -> bool:
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            output_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return result.returncode == 0
    except Exception as e:
        logger.warning(f"ffmpeg conversion failed: {e}")
        return False

def transcribe_audio_file(audio_bytes: bytes, filename: str) -> Tuple[str, List[Dict[str, Any]], float]:
    temp_input = AUDIO_TEMP_DIR / f"upload_{filename}"
    temp_wav = AUDIO_TEMP_DIR / f"conv_{Path(filename).stem}.wav"
    
    with open(temp_input, "wb") as f:
        f.write(audio_bytes)
        
    wav_path = str(temp_input)
    if not filename.lower().endswith(".wav"):
        if convert_to_wav_16k(str(temp_input), str(temp_wav)):
            wav_path = str(temp_wav)

    model = get_whisper_model()
    if model is None:
        return "", [], 0.0

    try:
        segments, info = model.transcribe(
            wav_path,
            beam_size=5,
            word_timestamps=True,
            language="en"
        )
        
        full_transcript = []
        word_timestamps = []
        
        for segment in segments:
            full_transcript.append(segment.text)
            if segment.words:
                for w in segment.words:
                    word_timestamps.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "probability": round(w.probability, 2)
                    })
                    
        transcript_text = " ".join(full_transcript).strip()
        total_duration = info.duration if hasattr(info, "duration") else 0.0
        return transcript_text, word_timestamps, round(total_duration, 2)
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        return "", [], 0.0
    finally:
        try:
            if temp_input.exists(): temp_input.unlink()
            if temp_wav.exists(): temp_wav.unlink()
        except Exception:
            pass

# --- Audio TTS ---
def split_sentences(text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if s.strip()]

def synthesize_speech(text: str, voice: str = "af_heart") -> Optional[bytes]:
    kokoro = get_kokoro_pipeline()
    if kokoro is None:
        return None
        
    try:
        samples, sample_rate = kokoro.create(
            text,
            voice=voice or settings.KOKORO_VOICE,
            speed=1.0,
            lang="en-us"
        )
        buffer = io.BytesIO()
        import soundfile as sf
        sf.write(buffer, samples, sample_rate, format="WAV")
        return buffer.getvalue()
    except Exception as e:
        logger.warning(f"Kokoro TTS generation failed: {e}")
        return None
