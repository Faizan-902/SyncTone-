"""Unit tests for the audio stitcher module."""

import numpy as np
import pytest
from pathlib import Path
from app.engine.audio_stitcher import AudioStitcher
from app.models.schemas import AudioFormat


class TestAudioStitcher:
    """Test audio stitching and timeline generation."""

    def _make_segments(self, n: int, same_voice: bool = False) -> list[dict]:
        """Create test segments with synthetic audio."""
        sr = 24000
        segments = []
        for i in range(n):
            # 1 second of audio per segment
            samples = np.random.randn(sr).astype(np.float32) * 0.1
            segments.append({
                "segment_id": i,
                "voice_id": "af_heart" if same_voice else f"voice_{i}",
                "speaker_name": f"Speaker {i}",
                "pcm_samples": samples,
            })
        return segments

    def test_single_segment(self, tmp_path: Path):
        stitcher = AudioStitcher(sample_rate=24000, inter_speaker_pause_ms=150)
        segments = self._make_segments(1)

        manifest = stitcher.stitch(
            segments=segments,
            output_dir=tmp_path,
            chapter_id="test_single",
            output_format=AudioFormat.WAV,
        )

        assert manifest.chapter_id == "test_single"
        assert len(manifest.timeline) == 1
        assert manifest.timeline[0].start_ms == 0
        assert manifest.timeline[0].end_ms > 0
        assert manifest.total_duration_ms > 0
        assert (tmp_path / "test_single.wav").exists()

    def test_multiple_segments_different_voices(self, tmp_path: Path):
        stitcher = AudioStitcher(sample_rate=24000, inter_speaker_pause_ms=150)
        segments = self._make_segments(3, same_voice=False)

        manifest = stitcher.stitch(
            segments=segments,
            output_dir=tmp_path,
            chapter_id="test_multi",
            output_format=AudioFormat.WAV,
        )

        assert len(manifest.timeline) == 3
        # Check pauses are inserted between different voices
        assert manifest.timeline[1].start_ms > manifest.timeline[0].end_ms
        gap = manifest.timeline[1].start_ms - manifest.timeline[0].end_ms
        assert gap == 150  # Inter-speaker pause

    def test_same_voice_no_pause(self, tmp_path: Path):
        stitcher = AudioStitcher(sample_rate=24000, inter_speaker_pause_ms=150)
        segments = self._make_segments(2, same_voice=True)

        manifest = stitcher.stitch(
            segments=segments,
            output_dir=tmp_path,
            chapter_id="test_same",
            output_format=AudioFormat.WAV,
        )

        # No pause between same voice
        assert manifest.timeline[1].start_ms == manifest.timeline[0].end_ms

    def test_timeline_ordering(self, tmp_path: Path):
        stitcher = AudioStitcher(sample_rate=24000, inter_speaker_pause_ms=150)
        segments = self._make_segments(5, same_voice=False)

        manifest = stitcher.stitch(
            segments=segments,
            output_dir=tmp_path,
            chapter_id="test_order",
            output_format=AudioFormat.WAV,
        )

        # Timeline should be monotonically increasing
        for i in range(1, len(manifest.timeline)):
            assert manifest.timeline[i].start_ms >= manifest.timeline[i - 1].start_ms
            assert manifest.timeline[i].start_ms >= manifest.timeline[i - 1].end_ms
