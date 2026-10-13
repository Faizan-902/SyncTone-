"""Unit tests for the attribution engine."""

import pytest
from app.engine.attribution import AttributionEngine


class TestAttributionEngine:
    """Test attribution prompt construction."""

    def test_build_prompt(self):
        engine = AttributionEngine()
        prompt = engine._build_prompt(
            history=['Lin: "The gate is locked."', 'Valeria: "Can you bypass it?"'],
            characters=["Lin", "Valeria", "Guard"],
            unattributed_text="Give me two minutes.",
        )

        assert "Lin" in prompt
        assert "Valeria" in prompt
        assert "Guard" in prompt
        assert "Give me two minutes." in prompt
        assert "character name only" in prompt.lower()

    def test_build_prompt_no_history(self):
        engine = AttributionEngine()
        prompt = engine._build_prompt(
            history=[],
            characters=["Alice"],
            unattributed_text="Hello.",
        )
        assert "No prior context" in prompt

    def test_build_prompt_no_characters(self):
        engine = AttributionEngine()
        prompt = engine._build_prompt(
            history=[],
            characters=[],
            unattributed_text="Hello.",
        )
        assert "Unknown" in prompt
