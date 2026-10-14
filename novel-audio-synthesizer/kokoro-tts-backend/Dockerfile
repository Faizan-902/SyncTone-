# ==============================================================================
# SyncTone Kokoro-TTS Offline Worker Daemon Dockerfile
# ==============================================================================
FROM python:3.11-slim

WORKDIR /app

# Install system audio and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker application
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# Create cache directories
RUN mkdir -p /app/output/pcm_cache /app/models_cache

CMD ["python", "-m", "app.worker"]
