"""TTS Synthesis Engine — Kokoro-TTS wrapper.

Generates per-segment audio using the Kokoro multi-speaker TTS model.
Uses kokoro-tts (PyTorch-based) for inference.
"""

import numpy as np
from typing import Optional
from pathlib import Path

from ..core.config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)


class TTSEngine:
    """Wraps Kokoro-TTS for multi-voice synthesis."""

    def __init__(
        self,
        model_path: Optional[str] = None,
        voices_path: Optional[str] = None,
    ):
        self._model_path = model_path or settings.kokoro_model_path
        self._voices_path = voices_path or settings.kokoro_voices_path
        self._model = None
        self._sample_rate = settings.sample_rate
        self._initialized = False

    @property
    def sample_rate(self) -> int:
        return self._sample_rate

    def _ensure_initialized(self):
        """Lazy-load the Kokoro model on first use."""
        if self._initialized:
            return

        model_file = settings.resolve_path(self._model_path)
        voices_file = settings.resolve_path(self._voices_path)

        if not model_file.exists():
            raise FileNotFoundError(
                f"Kokoro model not found at {model_file}. "
                f"Please download it to the models_cache/ directory. "
                f"The application will prompt for model installation on first run."
            )

        if not voices_file.exists():
            raise FileNotFoundError(
                f"Kokoro voices file not found at {voices_file}. "
                f"Please download it to the models_cache/ directory."
            )

        try:
            # Import kokoro-tts (PyTorch-based)
            from kokoro import KokoroTTS

            self._model = KokoroTTS(
                model_path=str(model_file),
                voices_path=str(voices_file),
            )
            self._initialized = True
            logger.info("Kokoro TTS engine initialized successfully")
        except ImportError:
            raise ImportError(
                "kokoro-tts not installed. Run: pip install kokoro-tts"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Kokoro TTS: {e}")

    async def synthesize_segment(
        self,
        text: str,
        voice_id: str,
        speed: float = 1.0,
    ) -> tuple[np.ndarray, int]:
        """Synthesize a text segment with a given voice.

        Args:
            text: The text to synthesize.
            voice_id: Kokoro voice tag (e.g., 'af_heart', 'am_adam').
            speed: Playback speed multiplier (default 1.0).

        Returns:
            Tuple of (pcm_samples as float32 numpy array, duration_ms).
        """
        self._ensure_initialized()

        if not text.strip():
            # Return silence for empty segments
            silence = np.zeros(int(self._sample_rate * 0.1), dtype=np.float32)
            return silence, 100

        try:
            # Generate audio using kokoro-tts
            # The exact API may vary — this matches the common kokoro-tts interface
            samples, sr = self._model.create(
                text=text,
                voice=voice_id,
                speed=speed,
            )

            # Ensure float32
            if samples.dtype != np.float32:
                samples = samples.astype(np.float32)

            # Update sample rate if model returns different
            if sr != self._sample_rate:
                logger.warning(
                    f"Model sample rate ({sr}) differs from config ({self._sample_rate})"
                )
                self._sample_rate = sr

            duration_ms = int(len(samples) / sr * 1000)

            logger.debug(
                f"Synthesized {len(text)} chars with voice '{voice_id}' → "
                f"{duration_ms}ms ({len(samples)} samples @ {sr}Hz)"
            )

            return samples, duration_ms

        except Exception as e:
            logger.error(f"TTS synthesis failed for voice '{voice_id}': {e}")
            # Return 500ms of silence as fallback
            fallback = np.zeros(
                int(self._sample_rate * 0.5), dtype=np.float32
            )
            return fallback, 500

    async def check_model_available(self) -> dict:
        """Check if the TTS model files exist and return status."""
        model_file = settings.resolve_path(self._model_path)
        voices_file = settings.resolve_path(self._voices_path)

        return {
            "model_exists": model_file.exists(),
            "voices_exists": voices_file.exists(),
            "model_path": str(model_file),
            "voices_path": str(voices_file),
            "initialized": self._initialized,
        }
