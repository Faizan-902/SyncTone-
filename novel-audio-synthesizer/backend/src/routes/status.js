const { Router } = require('express');
const { ttsEngine } = require('../engine/ttsEngine');
const { attributionEngine } = require('../engine/attribution');
const { getParsersStatus } = require('../engine/parsers');
const { config } = require('../config');

const router = Router();

// GET /api/status/models
router.get('/status/models', async (_req, res) => {
  const [ttsStatus, llmAvailable, parsersStatus] = await Promise.all([
    ttsEngine.checkModelAvailable(),
    attributionEngine.checkAvailability(),
    getParsersStatus(),
  ]);

  return res.json({
    tts: ttsStatus,
    kokoro: {
      available: Boolean(ttsStatus.model_exists && ttsStatus.voices_exists),
      model_path: ttsStatus.model_path,
    },
    paradee: {
      available: Boolean(ttsStatus.paradee_ready),
      model_path: ttsStatus.paradee_model_path,
      voices: ttsStatus.paradee_voices || ['bm_fable', 'bf_isabella', 'am_puck', 'af_heart'],
      mixed_mode_ready: true,
    },
    parsers: parsersStatus,
    llm: {
      available: llmAvailable,
      model: config.ollama.model,
      url: config.ollama.url,
    },
  });
});

module.exports = router;
