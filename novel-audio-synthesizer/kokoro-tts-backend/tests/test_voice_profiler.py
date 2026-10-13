"""Unit tests for the voice profiler module."""

import pytest
from app.engine.voice_profiler import VoiceProfiler, VOICE_PALETTE


class TestVoiceProfiler:
    """Test voice profiling and assignment."""

    def test_narrator_default(self):
        profiler = VoiceProfiler()
        voice = profiler.resolve_character_voice("Narrator")
        assert voice == VOICE_PALETTE["narrator"]

    def test_keyword_captain(self):
        profiler = VoiceProfiler()
        voice = profiler.resolve_character_voice("Captain Blackwood")
        assert voice == VOICE_PALETTE["deep_male"]

    def test_keyword_princess(self):
        profiler = VoiceProfiler()
        voice = profiler.resolve_character_voice("Princess Elara")
        assert voice == VOICE_PALETTE["energetic_female"]

    def test_hash_deterministic(self):
        profiler = VoiceProfiler()
        voice1 = profiler.resolve_character_voice("Zyx")
        profiler2 = VoiceProfiler()
        voice2 = profiler2.resolve_character_voice("Zyx")
        assert voice1 == voice2  # Same name → same voice

    def test_registry_persistence(self):
        profiler = VoiceProfiler()
        first = profiler.resolve_character_voice("UniqueName")
        second = profiler.resolve_character_voice("UniqueName")
        assert first == second  # Cached in registry

    def test_manual_assignment(self):
        profiler = VoiceProfiler()
        profiler.assign_voice("test_char", "am_onyx")
        assert profiler.resolve_character_voice("test_char") == "am_onyx"

    def test_context_keyword(self):
        profiler = VoiceProfiler()
        voice = profiler.resolve_character_voice(
            "Marcus", context_snippet="The old man stood up."
        )
        assert voice == VOICE_PALETTE["young_male"]  # 'man' keyword

    def test_available_voices(self):
        voices = VoiceProfiler.get_available_voices()
        assert len(voices) == len(VOICE_PALETTE)
        assert "narrator" in voices
