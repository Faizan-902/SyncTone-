const { Router } = require('express');
const { voiceProfiler, VOICE_PALETTE } = require('../engine/voiceProfiler');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

// GET /api/voices
router.get('/voices', (_req, res) => {
  return res.json({
    available_voices: voiceProfiler.getAvailableVoices(),
    current_assignments: voiceProfiler.getAllAssignments(),
  });
});

// POST /api/voices/assign
router.post('/voices/assign', optionalAuth, async (req, res) => {
  if (req.user && req.user.role === 'reader') {
    return res.status(403).json({
      error: "Forbidden: role 'reader' cannot reassign voices. Only writers and admins may reassign voices.",
    });
  }

  const { character_id, new_voice_id, chapter_id } = req.body;
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

  // Update PostgreSQL characters if connected (Prisma ORM + pg pool expression match)
  try {
    const { pool, prisma } = require('../db');
    try {
      if (prisma.character) {
        await prisma.character.updateMany({
          where: { canonical_name: character_id },
          data: { voice_id: effectiveVoiceId, updated_at: new Date() },
        }).catch(() => {});
      }
      await pool.query(
        'UPDATE characters SET voice_id = $1, updated_at = now() WHERE id::text = $2 OR canonical_name = $2 OR LOWER(REPLACE(canonical_name, \' \', \'_\')) = LOWER($2)',
        [effectiveVoiceId, character_id]
      );
    } catch (pgErr) {
      if (pgErr.code === '23503') {
        const kokoroFallback = EDGE_TO_KOKORO_MAP[effectiveVoiceId] || 'am_adam';
        await pool.query(
          'UPDATE characters SET voice_id = $1, updated_at = now() WHERE id::text = $2 OR canonical_name = $2 OR LOWER(REPLACE(canonical_name, \' \', \'_\')) = LOWER($2)',
          [kokoroFallback, character_id]
        );
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
