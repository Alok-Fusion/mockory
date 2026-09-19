import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings, AUDIO_TEMP_DIR
from backend.app.core.database import engine, Base
from backend.app.models import session as models
from backend.app.api.session import router as session_router
from backend.app.api.audio_routes import router as audio_router
from backend.app.api.report_routes import router as report_router
from backend.app.api.health import router as health_router

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Local-first AI Mock Interview platform powered by Ollama, Faster-Whisper, and Kokoro-ONNX"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health_router)
app.include_router(session_router)
app.include_router(audio_router)
app.include_router(report_router)

@app.get("/")
def root():
    return {
        "message": "Mockory API Server is running",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
