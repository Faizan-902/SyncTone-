const { Router } = require('express');
const { pool } = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/playback/progress
router.post('/playback/progress', optionalAuth, async (req, res) => {
  const { novel_id, chapter_id, segment_order = 0, position_ms = 0 } = req.body;
  const user_id = req.body.user_id || req.user?.id;

  if (!user_id || !novel_id || !chapter_id) {
    return res.status(400).json({ error: 'user_id, novel_id, and chapter_id are required' });
  }

  if (!UUID_REGEX.test(user_id) || !UUID_REGEX.test(novel_id) || !UUID_REGEX.test(chapter_id)) {
    return res.status(400).json({ error: 'Invalid UUID format for user_id, novel_id, or chapter_id' });
  }

  try {
    const query = `
      INSERT INTO playback_history (user_id, novel_id, chapter_id, segment_order, position_ms, updated_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (user_id, novel_id) DO UPDATE SET
        chapter_id = EXCLUDED.chapter_id,
        segment_order = EXCLUDED.segment_order,
        position_ms = EXCLUDED.position_ms,
        updated_at = now()
      RETURNING *;
    `;
    const result = await pool.query(query, [
      user_id,
      novel_id,
      chapter_id,
      segment_order,
      position_ms,
    ]);

    return res.json({ progress: result.rows[0] });
  } catch (err) {
    console.error('[Playback] Error updating progress:', err.message);
    return res.status(500).json({ error: 'Failed to update playback progress' });
  }
});

// GET /api/playback/progress
router.get('/playback/progress', optionalAuth, async (req, res) => {
  const novel_id = req.query.novel_id;
  const user_id = req.query.user_id || req.user?.id;

  if (!user_id || !novel_id) {
    return res.status(400).json({ error: 'user_id and novel_id query parameters are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM playback_history WHERE user_id = $1 AND novel_id = $2',
      [user_id, novel_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No playback history found' });
    }

    return res.json({ progress: result.rows[0] });
  } catch (err) {
    console.error('[Playback] Error retrieving progress:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve playback progress' });
  }
});

module.exports = router;
