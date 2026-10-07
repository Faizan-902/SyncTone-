"""Sliding-Window Attribution Engine.

Resolves unattributed dialogue segments using a local LLM (Ollama)
with a micro-prompt strategy and sliding context window.
"""

import httpx
import json
from typing import Optional

from ..models.schemas import Segment, SegmentType, AttributionSource
from ..core.config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)


class AttributionEngine:
    """Resolves unattributed dialogue using a local LLM via Ollama."""

    def __init__(
        self,
        ollama_base_url: Optional[str] = None,
        model: Optional[str] = None,
        context_window_size: int = 6,
    ):
        self.ollama_url = ollama_base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model
        self.context_window_size = context_window_size
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy-initialize the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.ollama_url,
                timeout=30.0,
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def check_availability(self) -> bool:
        """Check if Ollama is running and the model is available."""
        try:
            client = await self._get_client()
            response = await client.get("/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                available = any(
                    m.get("name", "").startswith(self.model)
                    for m in models
                )
                if available:
                    logger.info(f"Ollama model '{self.model}' is available")
                else:
                    logger.warning(
                        f"Ollama model '{self.model}' not found. "
                        f"Available: {[m.get('name') for m in models]}"
                    )
                return available
        except Exception as e:
            logger.warning(f"Ollama not reachable: {e}")
        return False

    async def resolve_unattributed(
        self,
        segments: list[Segment],
        known_characters: list[str],
    ) -> list[Segment]:
        """Process segments and resolve unattributed dialogue using LLM.

        Args:
            segments: List of segments (some may have speaker_id == 'unresolved').
            known_characters: List of known character names from regex/spaCy pass.

        Returns:
            Updated segments with LLM attributions filled in.
        """
        # Check if we have any unresolved segments
        unresolved_count = sum(
            1 for s in segments
            if s.type == SegmentType.DIALOGUE and s.speaker_id == "unresolved"
        )

        if unresolved_count == 0:
            logger.info("No unresolved segments — skipping LLM attribution")
            return segments

        logger.info(
            f"Resolving {unresolved_count} unattributed segments "
            f"with {len(known_characters)} known characters"
        )

        # Check Ollama availability
        if not await self.check_availability():
            logger.warning(
                "Ollama not available — leaving segments unresolved. "
                "User can manually assign voices in the frontend."
            )
            return segments

        # Build sliding window context and resolve
        history_window: list[str] = []

        for seg in segments:
            if (
                seg.type == SegmentType.DIALOGUE
                and seg.speaker_id == "unresolved"
            ):
                # Build micro-prompt
                prompt = self._build_prompt(
                    history=history_window[-self.context_window_size :],
                    characters=known_characters,
                    unattributed_text=seg.text,
                )

                speaker = await self._query_llm(prompt)

                if speaker and speaker in known_characters:
                    seg.speaker_name = speaker
                    seg.speaker_id = speaker.lower().replace(" ", "_")
                    seg.attribution_source = AttributionSource.LLM_FALLBACK
                    seg.attribution_confidence = 0.7
                    logger.debug(
                        f"Segment {seg.segment_id} attributed to '{speaker}' via LLM"
                    )
                else:
                    logger.debug(
                        f"Segment {seg.segment_id}: LLM returned '{speaker}' "
                        f"(not in known characters — leaving unresolved)"
                    )

            # Update history window for context
            if seg.speaker_name and seg.type == SegmentType.DIALOGUE:
                history_window.append(f'{seg.speaker_name}: "{seg.text}"')
            elif seg.type == SegmentType.NARRATION:
                # Include narration for context but abbreviated
                truncated = seg.text[:100] + ("..." if len(seg.text) > 100 else "")
                history_window.append(f"[Narration]: {truncated}")

        resolved_count = unresolved_count - sum(
            1 for s in segments
            if s.type == SegmentType.DIALOGUE and s.speaker_id == "unresolved"
        )
        logger.info(f"LLM resolved {resolved_count}/{unresolved_count} segments")

        return segments

    def _build_prompt(
        self,
        history: list[str],
        characters: list[str],
        unattributed_text: str,
    ) -> str:
        """Construct the micro-prompt for dialogue attribution."""
        char_list = ", ".join(characters) if characters else "Unknown"
        history_text = "\n".join(history) if history else "(No prior context)"

        return (
            f"Context Characters: [{char_list}]\n"
            f"History:\n{history_text}\n\n"
            f'Unattributed: "{unattributed_text}"\n'
            f"Who spoke the unattributed line? "
            f"Answer with character name only."
        )

    async def _query_llm(self, prompt: str) -> Optional[str]:
        """Query Ollama with the micro-prompt and return the speaker name."""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.0,
                        "num_predict": 10,
                    },
                },
            )

            if response.status_code == 200:
                result = response.json()
                raw_answer = result.get("response", "").strip()
                # Clean the response — take only the first line/word(s)
                speaker = raw_answer.split("\n")[0].strip().strip('"\' .:,')
                return speaker if speaker else None

            logger.warning(f"Ollama returned status {response.status_code}")
        except Exception as e:
            logger.error(f"LLM query failed: {e}")

        return None
