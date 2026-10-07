"""FastAPI application entry point for the Novel Audio Synthesizer."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .api.endpoints import router as api_router
from .api.websocket import router as ws_router
from .core.config import settings
from .core.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="Novel Audio Synthesizer",
    description="Multi-voice audiobook synthesis from plain text",
    version="0.1.0",
)

# CORS — allow Vite dev server and local Android WebView
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://10.0.2.2:5173",  # Android emulator
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount output directory for audio file serving
output_path = settings.resolve_path(settings.output_dir)
app.mount("/static/audio", StaticFiles(directory=str(output_path)), name="audio")

# Register routers
app.include_router(api_router, prefix="/api")
app.include_router(ws_router, prefix="/api/ws")


@app.on_event("startup")
async def startup_event():
    logger.info("Novel Audio Synthesizer starting up...")
    logger.info(f"Models directory: {settings.resolve_path(settings.models_dir)}")
    logger.info(f"Output directory: {output_path}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}
