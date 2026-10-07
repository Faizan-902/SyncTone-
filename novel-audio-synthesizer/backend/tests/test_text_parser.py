"""Unit tests for the text parser module."""

import pytest
from app.engine.text_parser import (
    parse_chapter,
    _has_dialogue,
    _extract_dialogue_text,
    _extract_speaker_regex,
    _clean_speaker_name,
)
from app.models.schemas import SegmentType, AttributionSource


class TestHasDialogue:
    """Test dialogue detection."""

    def test_straight_double_quotes(self):
        assert _has_dialogue('He said, "Hello there."')

    def test_curly_double_quotes(self):
        assert _has_dialogue('She whispered, \u201cBe careful.\u201d')

    def test_no_dialogue(self):
        assert not _has_dialogue("The sun set over the horizon.")

    def test_empty_string(self):
        assert not _has_dialogue("")

    def test_single_quotes_in_contraction(self):
        # "don't" should not be detected as dialogue
        assert not _has_dialogue("He don't know about that.")


class TestExtractDialogueText:
    """Test dialogue text extraction."""

    def test_simple_extraction(self):
        result = _extract_dialogue_text('He said, "Hello there."')
        assert result == "Hello there."

    def test_curly_quotes(self):
        result = _extract_dialogue_text('She said, \u201cGoodbye.\u201d')
        assert result == "Goodbye."

    def test_multiple_quotes(self):
        result = _extract_dialogue_text('"First part." She paused. "Second part."')
        assert "First part." in result
        assert "Second part." in result


class TestCleanSpeakerName:
    """Test speaker name cleaning."""

    def test_simple_name(self):
        assert _clean_speaker_name("Alice") == "Alice"

    def test_leading_noise(self):
        assert _clean_speaker_name("the Captain") == "Captain"

    def test_lowercase_rejected(self):
        assert _clean_speaker_name("someone") == ""

    def test_too_many_words(self):
        assert _clean_speaker_name("the big bad wolf man") == ""


class TestExtractSpeakerRegex:
    """Test regex-based speaker extraction."""

    def test_said_after_quote(self):
        speaker, source = _extract_speaker_regex('"I will go," Alice said.')
        assert speaker == "Alice"
        assert source == AttributionSource.REGEX_RULE

    def test_said_before_quote(self):
        speaker, source = _extract_speaker_regex('Bob replied, "Of course."')
        assert speaker == "Bob"
        assert source == AttributionSource.REGEX_RULE

    def test_no_attribution(self):
        speaker, source = _extract_speaker_regex('"Just a floating quote."')
        assert speaker is None
        assert source == AttributionSource.UNRESOLVED

    def test_whispered(self):
        speaker, source = _extract_speaker_regex('"Be quiet," Lin whispered.')
        assert speaker == "Lin"


class TestParseChapter:
    """Test full chapter parsing."""

    def test_simple_chapter(self):
        text = """The sun rose over the mountains.

"Good morning," Alice said with a smile.

"Morning," Bob replied.

They walked together toward the village."""

        result = parse_chapter(text, title="Test Chapter", chapter_id="test01")

        assert result.chapter_id == "test01"
        assert result.title == "Test Chapter"
        assert len(result.segments) == 4

        # First segment is narration
        assert result.segments[0].type == SegmentType.NARRATION
        assert result.segments[0].speaker_id == "narrator"

        # Second segment is dialogue from Alice
        assert result.segments[1].type == SegmentType.DIALOGUE
        assert result.segments[1].speaker_name == "Alice"

        # Third segment is dialogue from Bob
        assert result.segments[2].type == SegmentType.DIALOGUE
        assert result.segments[2].speaker_name == "Bob"

        # Fourth segment is narration
        assert result.segments[3].type == SegmentType.NARRATION

    def test_empty_text(self):
        result = parse_chapter("", title="Empty")
        assert len(result.segments) == 0

    def test_narration_only(self):
        text = "The world was quiet.\n\nNothing stirred."
        result = parse_chapter(text)
        assert all(s.type == SegmentType.NARRATION for s in result.segments)
