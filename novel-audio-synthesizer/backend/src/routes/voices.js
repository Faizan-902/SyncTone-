const { Router } = require('express');
const { voiceProfiler, VOICE_PALETTE } = require('../engine/voiceProfiler');
const { ttsEngine } = require('../engine/ttsEngine');
const { audioStitcher } = require('../engine/audioStitcher');
const { authenticateUser, requireRole } = require('../middleware/auth');

const router = Router();

// In-memory cache for on-demand speech segments (speeds up replay and eliminates redundant Edge TTS calls)
const speakCache = new Map();
const MAX_CACHE_ENTRIES = 250;

/**
 * Sends audio buffer with support for HTTP Range requests (crucial for Chrome audio streaming)
 */
function sendAudioBuffer(req, res, buffer, mimeType, engine) {
  res.set({
    'X-TTS-Engine': engine,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
  });

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;

    if (isNaN(start) || start >= buffer.length || end < start) {
      res.status(416).set('Content-Range', `bytes */${buffer.length}`);
      return res.end();
    }

    const chunk = buffer.slice(start, end + 1);
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
      'Content-Length': String(chunk.length),
      'Content-Type': mimeType,
    });
    return res.send(chunk);
  }

  res.status(200).set({
    'Content-Type': mimeType,
    'Content-Length': String(buffer.length),
  });
  return res.send(buffer);
}

// Handler for on-demand segment speech preview
async function handleSpeak(req, res) {
  try {
    const rawText = req.query.text !== undefined ? req.query.text : req.body?.text;
    const voice_id = (req.query.voice_id || req.body?.voice_id || 'en-GB-RyanNeural').toString().trim();
    const speed = parseFloat(req.query.speed || req.body?.speed) || 1.0;
    const engine = req.query.engine || req.body?.engine || 'auto';
    const characterId = (req.query.character_id || req.body?.character_id || '').toString().trim();
    const speakerName = (req.query.speaker_name || req.body?.speaker_name || '').toString().trim();
    const castSlot = req.query.cast_slot ?? req.body?.cast_slot ?? null;
    const isNarrator = req.query.is_narrator === 'true' || req.body?.is_narrator === true || characterId.toLowerCase() === 'narrator';
    const gender = (req.query.gender || req.body?.gender || '').toString().trim();

    // Strip image markers and normalize text
    let cleanText = String(rawText !== undefined && rawText !== null ? rawText : 'Hello, this is a sample preview.');
    cleanText = cleanText.replace(/\[IMAGE:[^\]]+\]/gi, '').trim().slice(0, 1500);

    if (!cleanText) {
      cleanText = ' ';
    }

    const cacheKey = `${engine}:${voice_id}:${characterId}:${castSlot ?? ''}:${speed}:${cleanText}`;
    if (speakCache.has(cacheKey)) {
      const cached = speakCache.get(cacheKey);
      return sendAudioBuffer(req, res, cached.buffer, cached.mimeType, cached.engine);
    }

    const result = await ttsEngine.synthesizeSegment(cleanText, String(voice_id), speed, String(engine), {
      characterId,
      speakerName,
      castSlot,
      isNarrator,
      gender,
    });

    let finalBuffer = result.audio_buffer;
    let mimeType = result.format === 'mp3' ? 'audio/mpeg' : 'audio/wav';

    if (result.format === 'pcm') {
      const wavHeader = audioStitcher.createWavHeader(result.audio_buffer.length, 24000, 1, 16);
      finalBuffer = Buffer.concat([wavHeader, result.audio_buffer]);
      mimeType = 'audio/wav';
    }

    if (speakCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = speakCache.keys().next().value;
      speakCache.delete(oldestKey);
    }
    speakCache.set(cacheKey, {
      buffer: finalBuffer,
      mimeType,
      engine: result.engine || 'msedge-tts',
    });

    return sendAudioBuffer(req, res, finalBuffer, mimeType, result.engine || 'msedge-tts');
  } catch (err) {
    console.error('[Voices Speak Error]:', err.message);
    return res.status(500).json({ error: 'Failed to synthesize speech segment' });
  }
}

// GET & POST /api/voices/speak (On-demand preview synthesis)
router.get('/voices/speak', handleSpeak);
router.post('/voices/speak', handleSpeak);

// GET /api/voices
router.get('/voices', (_req, res) => {
  return res.json({
    available_voices: voiceProfiler.getAvailableVoices(),
    current_assignments: voiceProfiler.getAllAssignments(),
  });
});

// POST /api/voices/assign
router.post('/voices/assign', authenticateUser, requireRole('writer', 'admin'), async (req, res) => {

  const { character_id, new_voice_id, chapter_id, novel_id } = req.body;
  if (!character_id || !new_voice_id) {
    return res.status(400).json({ detail: 'character_id and new_voice_id are required' });
  }

  const { EDGE_TO_KOKORO_MAP } = require('../engine/voiceProfiler');
  const validVoices = new Set([
    ...Object.values(VOICE_PALETTE),
    ...Object.keys(VOICE_PALETTE),
    'am_adam', 'af_heart', 'af_bella', 'af_nicole', 'af_sarah',
    'am_michael', 'am_george', 'bm_george', 'bf_emma', 'bm_daniel',
    'am_onyx', 'af_sky',
    'bm_fable', 'bf_isabella', 'am_puck',
    'mac_daniel', 'mac_serena', 'mac_reed', 'mac_rocko',
    'mac_shelley', 'mac_grandpa', 'mac_flo', 'mac_moira',
  ]);

  if (!validVoices.has(new_voice_id)) {
    return res.status(400).json({
      detail: `Invalid voice ID. Available: ${Array.from(validVoices).join(', ')}`,
    });
  }

  const effectiveVoiceId = VOICE_PALETTE[new_voice_id] || new_voice_id;
  voiceProfiler.assignVoice(character_id, effectiveVoiceId);

  // If chapter_id is provided, update segments in MongoDB
  if (chapter_id) {
    try {
      const { Chapter } = require('../models');
      await Chapter.updateOne(
        {
          pg_chapter_id: chapter_id,
          $or: [
            { 'segments.character_id': character_id },
            { 'segments.speaker_id': character_id },
          ],
        },
        {
          $set: {
            'segments.$[elem].voice_id': effectiveVoiceId,
            'segments.$[elem].assigned_voice_id': effectiveVoiceId,
          },
        },
        {
          arrayFilters: [
            {
              $or: [
                { 'elem.character_id': character_id },
                { 'elem.speaker_id': character_id },
              ],
            },
          ],
        }
      );
    } catch (err) {
      console.warn('[Voices] Could not update chapter doc in Mongo:', err.message);
    }
  }

  // Update PostgreSQL characters if connected (scoped by UUID or novel_id to prevent cross-novel corruption)
  try {
    const { pool } = require('../db');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(character_id));
    let targetNovelId = novel_id || null;
    if (!targetNovelId && chapter_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(chapter_id))) {
      const chRow = await pool.query('SELECT novel_id FROM chapters WHERE id = $1', [chapter_id]);
      if (chRow.rows.length > 0) {
        targetNovelId = chRow.rows[0].novel_id;
      }
    }

    const runPgUpdate = async (voiceToSet) => {
      if (isUuid) {
        await pool.query(
          'UPDATE characters SET voice_id = $1, updated_at = now() WHERE id = $2::uuid',
          [voiceToSet, character_id]
        );
      } else if (targetNovelId) {
        await pool.query(
          "UPDATE characters SET voice_id = $1, updated_at = now() WHERE novel_id = $3 AND (canonical_name = $2 OR LOWER(REPLACE(canonical_name, ' ', '_')) = LOWER($2))",
          [voiceToSet, character_id, targetNovelId]
        );
      } else {
        await pool.query(
          "UPDATE characters SET voice_id = $1, updated_at = now() WHERE canonical_name = $2 OR LOWER(REPLACE(canonical_name, ' ', '_')) = LOWER($2)",
          [voiceToSet, character_id]
        );
      }
    };

    try {
      await runPgUpdate(effectiveVoiceId);
    } catch (pgErr) {
      if (pgErr.code === '23503') {
        try {
          const { ensureVoiceCatalog } = require('../scripts/seedDemos');
          await ensureVoiceCatalog(pool);
          await runPgUpdate(effectiveVoiceId);
        } catch (_retryErr) {
          const kokoroFallback = EDGE_TO_KOKORO_MAP[effectiveVoiceId] || 'am_adam';
          await runPgUpdate(kokoroFallback);
        }
      } else {
        throw pgErr;
      }
    }
  } catch (_err) {
    // Non-fatal if DB not running or character not in PG
  }

  return res.json({
    message: `Voice for '${character_id}' set to '${effectiveVoiceId}'`,
  });
});

module.exports = router;
