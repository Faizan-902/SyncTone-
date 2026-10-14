const { Router } = require('express');
const { voiceProfiler, VOICE_PALETTE } = require('../engine/voiceProfiler');

const router = Router();

// GET /api/voices
router.get('/voices', (_req, res) => {
  return res.json({
    available_voices: voiceProfiler.getAvailableVoices(),
    current_assignments: voiceProfiler.getAllAssignments(),
  });
});

// POST /api/voices/assign
router.post('/voices/assign', async (req, res) => {
  const { character_id, new_voice_id, chapter_id } = req.body;
  if (!character_id || !new_voice_id) {
    return res.status(400).json({ detail: 'character_id and new_voice_id are required' });
  }

  const validVoices = Object.values(VOICE_PALETTE);
  if (!validVoices.includes(new_voice_id)) {
    return res.status(400).json({
      detail: `Invalid voice ID. Available: ${validVoices.join(', ')}`,
    });
  }

  voiceProfiler.assignVoice(character_id, new_voice_id);

  // If chapter_id is provided, update segments in MongoDB
  if (chapter_id) {
    try {
      const { Chapter } = require('../models');
      await Chapter.updateOne(
        { pg_chapter_id: chapter_id, 'segments.character_id': character_id },
        { $set: { 'segments.$[elem].voice_id': new_voice_id } },
        { arrayFilters: [{ 'elem.character_id': character_id }] }
      );
    } catch (err) {
      console.warn('[Voices] Could not update chapter doc in Mongo:', err.message);
    }
  }

  // Update PostgreSQL characters if connected
  try {
    const { pool } = require('../db');
    await pool.query(
      'UPDATE characters SET voice_id = $1, updated_at = now() WHERE id::text = $2 OR canonical_name = $2',
      [new_voice_id, character_id]
    );
  } catch (_err) {
    // Non-fatal if DB not running or character not in PG
  }

  return res.json({
    message: `Voice for '${character_id}' set to '${new_voice_id}'`,
  });
});

module.exports = router;
