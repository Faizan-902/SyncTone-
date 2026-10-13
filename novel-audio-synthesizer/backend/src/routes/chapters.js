const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { parseChapter } = require('../engine/textParser');
const { attributionEngine } = require('../engine/attribution');
const { voiceProfiler } = require('../engine/voiceProfiler');
const { ttsEngine } = require('../engine/ttsEngine');
const { audioStitcher } = require('../engine/audioStitcher');
const { broadcastProgress } = require('../websocket');
const { config } = require('../config');

const router = Router();
const chaptersStore = new Map();

function persistChapterToDisk(chapterId, title, text) {
  const chapterDir = path.join(config.paths.chaptersDir, chapterId);
  if (!fs.existsSync(chapterDir)) {
    fs.mkdirSync(chapterDir, { recursive: true });
  }
  fs.writeFileSync(path.join(chapterDir, 'raw.txt'), text, 'utf-8');
  fs.writeFileSync(
    path.join(chapterDir, 'metadata.json'),
    JSON.stringify({ title, chapter_id: chapterId }),
    'utf-8'
  );
}

// 1. POST /api/upload
router.post('/upload', (req, res) => {
  const { text, title = 'Untitled Chapter' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" field' });
  }

  const chapterId = uuidv4().slice(0, 8);
  chaptersStore.set(chapterId, {
    text,
    title,
    parsed: null,
    manifest: null,
  });

  persistChapterToDisk(chapterId, title, text);
  console.log(`[Chapters] Uploaded '${title}' as ${chapterId}`);

  return res.json({ chapter_id: chapterId });
});

// 2. GET /api/chapters
router.get('/chapters', (_req, res) => {
  const list = [];
  for (const [cid, data] of chaptersStore.entries()) {
    list.push({
      chapter_id: cid,
      title: data.title,
      has_parsed: data.parsed !== null,
      has_manifest: data.manifest !== null,
    });
  }
  return res.json({ chapters: list });
});

// 3. POST /api/parse/:chapter_id
router.post('/parse/:chapter_id', async (req, res) => {
  const { chapter_id } = req.params;
  const chapterData = chaptersStore.get(chapter_id);
  if (!chapterData) {
    return res.status(404).json({ detail: 'Chapter not found' });
  }

  broadcastProgress(chapter_id, {
    chapter_id,
    current_segment: 0,
    total_segments: 0,
    percent_complete: 10,
    status: 'parsing',
  });

  const parsed = parseChapter(chapterData.text, chapterData.title, chapter_id);

  broadcastProgress(chapter_id, {
    chapter_id,
    current_segment: 0,
    total_segments: parsed.segments.length,
    percent_complete: 40,
    status: 'attributing',
  });

  const knownChars = Array.from(
    new Set(
      parsed.segments
        .filter((s) => s.speaker_name && s.speaker_id !== 'unresolved' && s.speaker_id !== 'narrator')
        .map((s) => s.speaker_name)
    )
  );

  parsed.segments = await attributionEngine.resolveUnattributed(parsed.segments, knownChars);
  parsed.segments = voiceProfiler.applyVoicesToSegments(parsed.segments);
  chapterData.parsed = parsed;

  const chapterDir = path.join(config.paths.chaptersDir, chapter_id);
  if (!fs.existsSync(chapterDir)) fs.mkdirSync(chapterDir, { recursive: true });
  fs.writeFileSync(path.join(chapterDir, 'parsed.json'), JSON.stringify(parsed, null, 2), 'utf-8');

  broadcastProgress(chapter_id, {
    chapter_id,
    current_segment: parsed.segments.length,
    total_segments: parsed.segments.length,
    percent_complete: 100,
    status: 'complete',
  });

  console.log(`[Chapters] Parsed ${chapter_id} with ${parsed.segments.length} segments`);
  return res.json(parsed);
});

// 4. POST /api/synthesize/:chapter_id
router.post('/synthesize/:chapter_id', async (req, res) => {
  const { chapter_id } = req.params;
  const chapterData = chaptersStore.get(chapter_id);
  if (!chapterData) {
    return res.status(404).json({ detail: 'Chapter not found' });
  }

  const parsed = chapterData.parsed;
  if (!parsed) {
    return res.status(400).json({ detail: 'Chapter not yet parsed. Call /parse first.' });
  }

  const total = parsed.segments.length;
  const segmentAudios = [];

  for (let i = 0; i < total; i++) {
    const seg = parsed.segments[i];
    broadcastProgress(chapter_id, {
      chapter_id,
      current_segment: i + 1,
      total_segments: total,
      percent_complete: Math.round(((i + 1) / total) * 90),
      status: 'synthesizing',
    });

    const result = await ttsEngine.synthesizeSegment(
      seg.text,
      seg.assigned_voice_id
    );

    segmentAudios.push({
      segment_id: seg.segment_id,
      voice_id: seg.assigned_voice_id,
      speaker_name: seg.speaker_name,
      audio_buffer: result.audio_buffer,
      duration_ms: result.duration_ms,
      format: result.format,
      engine: result.engine,
    });
  }

  broadcastProgress(chapter_id, {
    chapter_id,
    current_segment: total,
    total_segments: total,
    percent_complete: 95,
    status: 'stitching',
  });

  const manifest = audioStitcher.stitch(segmentAudios, chapter_id);
  chapterData.manifest = manifest;

  const chapterDir = path.join(config.paths.chaptersDir, chapter_id);
  if (!fs.existsSync(chapterDir)) fs.mkdirSync(chapterDir, { recursive: true });
  fs.writeFileSync(path.join(chapterDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  broadcastProgress(chapter_id, {
    chapter_id,
    current_segment: total,
    total_segments: total,
    percent_complete: 100,
    status: 'complete',
  });

  console.log(`[Chapters] Synthesized ${chapter_id} (${manifest.total_duration_ms}ms, format: ${manifest.audio_format})`);
  return res.json(manifest);
});

// 5. GET /api/stream/:chapter_id
router.get('/stream/:chapter_id', (req, res) => {
  const { chapter_id } = req.params;
  const audioPathMp3 = path.join(config.paths.outputDir, `${chapter_id}.mp3`);
  const audioPathWav = path.join(config.paths.outputDir, `${chapter_id}.wav`);
  const isMp3 = fs.existsSync(audioPathMp3);
  const audioPath = isMp3 ? audioPathMp3 : audioPathWav;

  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ detail: 'Audio file not found' });
  }

  const stat = fs.statSync(audioPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = isMp3 ? 'audio/mpeg' : 'audio/wav';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    const file = fs.createReadStream(audioPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(audioPath).pipe(res);
  }
});

// 6. GET /api/manifest/:chapter_id
router.get('/manifest/:chapter_id', (req, res) => {
  const { chapter_id } = req.params;
  const chapterData = chaptersStore.get(chapter_id);
  if (!chapterData) {
    return res.status(404).json({ detail: 'Chapter not found' });
  }

  if (!chapterData.manifest) {
    return res.status(400).json({ detail: 'Chapter not yet synthesized. Call /synthesize first.' });
  }

  return res.json(chapterData.manifest);
});

// 7. GET /api/characters/:chapter_id
router.get('/characters/:chapter_id', (req, res) => {
  const { chapter_id } = req.params;
  const chapterData = chaptersStore.get(chapter_id);
  if (!chapterData || !chapterData.parsed) {
    return res.status(404).json({ detail: 'Chapter not found or not yet parsed.' });
  }

  const charCounts = new Map();
  for (const seg of chapterData.parsed.segments) {
    if (seg.speaker_id && seg.speaker_id !== 'narrator') {
      const prev = charCounts.get(seg.speaker_id) || {
        name: seg.speaker_name,
        voice: seg.assigned_voice_id,
        count: 0,
      };
      prev.count += 1;
      charCounts.set(seg.speaker_id, prev);
    }
  }

  const characters = [];
  for (const [cid, val] of charCounts.entries()) {
    characters.push({
      character_id: cid,
      character_name: val.name,
      assigned_voice_id: val.voice,
      segment_count: val.count,
    });
  }

  return res.json({ characters });
});

module.exports = router;
