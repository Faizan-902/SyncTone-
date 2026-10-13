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
router.post('/voices/assign', (req, res) => {
  const { character_id, new_voice_id } = req.body;
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
  return res.json({
    message: `Voice for '${character_id}' set to '${new_voice_id}'`,
  });
});

module.exports = router;
