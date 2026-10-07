"""Text Ingestion & Regex Heuristic Segmenter.

Splits raw text into paragraphs, detects dialogue vs narration,
and extracts speaker attributions using regex patterns and spaCy
dependency parsing.
"""

import re
import uuid
from typing import Optional

from ..models.schemas import (
    Segment,
    SegmentType,
    AttributionSource,
    ParsedChapter,
)
from ..core.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Quote detection patterns (handles straight, curly, and mixed quotes)
# ---------------------------------------------------------------------------

# Matches content inside double quotes (straight or curly)
DIALOGUE_PATTERN = re.compile(
    r'["\u201c]([^"\u201d]+)["\u201d]'
)

# ---------------------------------------------------------------------------
# Speech verb lexicon
# ---------------------------------------------------------------------------

SPEECH_VERBS = (
    r'(?:said|replied|shouted|whispered|muttered|exclaimed|asked|'
    r'cried|called|growled|hissed|stammered|yelled|snapped|sighed|'
    r'murmured|remarked|answered|demanded|insisted|pleaded|declared|'
    r'suggested|added|continued|began|interrupted|warned|promised|'
    r'admitted|announced|argued|begged|boasted|breathed|chanted|'
    r'chuckled|commented|complained|confessed|echoed|gasped|giggled|'
    r'groaned|grumbled|laughed|lied|moaned|mumbled|nagged|noted|'
    r'objected|observed|offered|ordered|panted|quoted|recalled|'
    r'repeated|reported|responded|retorted|roared|sang|screamed|'
    r'shrieked|sobbed|spoke|squealed|stated|stuttered|teased|thought|'
    r'thundered|urged|uttered|vowed|wailed|warned|wept|wondered)'
)

# Pattern: "dialogue," Speaker verb
SPEECH_TAG_AFTER = re.compile(
    rf'["\u201d]\s*[,.]?\s+(\w[\w\s]{{0,30}})\s+{SPEECH_VERBS}',
    re.IGNORECASE,
)

# Pattern: Speaker verb, "dialogue"
SPEECH_TAG_BEFORE = re.compile(
    rf'(\w[\w\s]{{0,30}})\s+{SPEECH_VERBS}\s*[,:]?\s*["\u201c]',
    re.IGNORECASE,
)

# Pattern: Speaker verb (at the start of the paragraph before dialogue)
SPEECH_TAG_START = re.compile(
    rf'^(\w[\w\s]{{0,30}})\s+{SPEECH_VERBS}',
    re.IGNORECASE,
)


def _clean_speaker_name(raw: str) -> str:
    """Clean and normalize an extracted speaker name."""
    # Remove common leading words that aren't names
    noise_words = {"the", "a", "an", "then", "and", "but", "as", "when", "while"}
    words = raw.strip().split()
    # Remove leading noise
    while words and words[0].lower() in noise_words:
        words.pop(0)
    name = " ".join(words).strip()
    # Basic validation: name should be 1-3 words, start with uppercase
    if not name or len(name.split()) > 3:
        return ""
    if name[0].islower():
        return ""
    return name


def _extract_speaker_regex(paragraph: str) -> tuple[Optional[str], AttributionSource]:
    """Try to extract speaker name from a paragraph using regex patterns."""
    # Try: "dialogue," Speaker said
    match = SPEECH_TAG_AFTER.search(paragraph)
    if match:
        name = _clean_speaker_name(match.group(1))
        if name:
            return name, AttributionSource.REGEX_RULE

    # Try: Speaker said, "dialogue"
    match = SPEECH_TAG_BEFORE.search(paragraph)
    if match:
        name = _clean_speaker_name(match.group(1))
        if name:
            return name, AttributionSource.REGEX_RULE

    # Try: Speaker said at the start
    match = SPEECH_TAG_START.search(paragraph)
    if match:
        name = _clean_speaker_name(match.group(1))
        if name:
            return name, AttributionSource.REGEX_RULE

    return None, AttributionSource.UNRESOLVED


def _extract_speaker_spacy(
    paragraph: str, nlp
) -> tuple[Optional[str], AttributionSource]:
    """Try to extract speaker name using spaCy dependency parsing.

    Looks for nsubj → speech_verb dependency chains.
    """
    try:
        doc = nlp(paragraph)
        speech_verb_lemmas = {
            "say", "reply", "shout", "whisper", "mutter", "exclaim", "ask",
            "cry", "call", "growl", "hiss", "stammer", "yell", "snap",
            "sigh", "murmur", "remark", "answer", "demand", "insist",
            "plead", "declare", "suggest", "add", "continue", "begin",
            "interrupt", "warn", "promise", "admit", "announce",
        }

        for token in doc:
            if (
                token.lemma_.lower() in speech_verb_lemmas
                and token.pos_ == "VERB"
            ):
                # Find the subject of this speech verb
                for child in token.children:
                    if child.dep_ in ("nsubj", "nsubjpass"):
                        # Get the full noun phrase
                        if child.pos_ in ("PROPN", "NOUN"):
                            # Include compound modifiers
                            name_parts = []
                            for left in child.lefts:
                                if left.dep_ == "compound":
                                    name_parts.append(left.text)
                            name_parts.append(child.text)
                            name = " ".join(name_parts)
                            if name and name[0].isupper():
                                return name, AttributionSource.DEPENDENCY_TREE
    except Exception as e:
        logger.warning(f"spaCy extraction failed: {e}")

    return None, AttributionSource.UNRESOLVED


def _has_dialogue(paragraph: str) -> bool:
    """Check if a paragraph contains dialogue (quoted text)."""
    return bool(DIALOGUE_PATTERN.search(paragraph))


def _extract_dialogue_text(paragraph: str) -> str:
    """Extract the quoted dialogue text from a paragraph."""
    matches = DIALOGUE_PATTERN.findall(paragraph)
    if matches:
        return " ".join(matches)
    return paragraph


def parse_chapter(
    raw_text: str,
    title: str = "Untitled Chapter",
    chapter_id: Optional[str] = None,
    nlp=None,
) -> ParsedChapter:
    """Parse raw chapter text into attributed segments.

    Args:
        raw_text: The full chapter text.
        title: Chapter title.
        chapter_id: Unique ID (auto-generated if None).
        nlp: Optional spaCy Language model for dependency parsing.

    Returns:
        ParsedChapter with segments attributed where possible.
    """
    if chapter_id is None:
        chapter_id = str(uuid.uuid4())[:8]

    # Split into paragraphs on blank lines
    paragraphs = [
        p.strip() for p in re.split(r'\n\s*\n', raw_text.strip()) if p.strip()
    ]

    logger.info(f"Parsing chapter '{title}' — {len(paragraphs)} paragraphs")

    segments: list[Segment] = []
    known_characters: set[str] = set()

    for idx, para in enumerate(paragraphs):
        if _has_dialogue(para):
            # --- Dialogue segment ---
            dialogue_text = _extract_dialogue_text(para)

            # Try regex extraction first
            speaker, source = _extract_speaker_regex(para)

            # Fall back to spaCy if available and regex failed
            if speaker is None and nlp is not None:
                speaker, source = _extract_speaker_spacy(para, nlp)

            if speaker:
                known_characters.add(speaker)
                speaker_id = speaker.lower().replace(" ", "_")
            else:
                speaker = ""
                speaker_id = "unresolved"
                source = AttributionSource.UNRESOLVED

            segments.append(
                Segment(
                    segment_id=idx,
                    type=SegmentType.DIALOGUE,
                    speaker_name=speaker,
                    speaker_id=speaker_id,
                    text=dialogue_text,
                    attribution_confidence=0.9 if speaker else 0.0,
                    attribution_source=source,
                )
            )
        else:
            # --- Narration segment ---
            segments.append(
                Segment(
                    segment_id=idx,
                    type=SegmentType.NARRATION,
                    speaker_name="Narrator",
                    speaker_id="narrator",
                    text=para,
                    attribution_confidence=1.0,
                    attribution_source=AttributionSource.NARRATOR_DEFAULT,
                )
            )

    logger.info(
        f"Parsed {len(segments)} segments — "
        f"{sum(1 for s in segments if s.type == SegmentType.DIALOGUE)} dialogue, "
        f"{sum(1 for s in segments if s.type == SegmentType.NARRATION)} narration, "
        f"{len(known_characters)} characters detected"
    )

    return ParsedChapter(
        chapter_id=chapter_id,
        title=title,
        segments=segments,
    )
