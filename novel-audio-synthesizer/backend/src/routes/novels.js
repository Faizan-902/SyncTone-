const { Router } = require('express');
const { pool } = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_CHANNELS = ['verified', 'community'];

/**
 * GET /api/novels
 * Retrieves novels with narrator character & voice information and chapter count.
 * Query params: ?channel=verified|community
 */
router.get('/novels', async (req, res) => {
  try {
    const { channel } = req.query;
    const channelFilter = channel && ALLOWED_CHANNELS.includes(channel) ? channel : null;

    const query = `
      SELECT
        n.id,
        n.title,
        n.synopsis,
        n.channel,
        n.status,
        n.global_tone,
        n.portfolio_source,
        n.cover_object,
        n.added_by,
        u.username AS author_username,
        n.created_at,
        n.updated_at,
        c.id AS narrator_character_id,
        c.canonical_name AS narrator_name,
        c.voice_id AS narrator_voice_id,
        v.label AS narrator_voice_label,
        COUNT(DISTINCT ch.id)::int AS chapter_count
      FROM novels n
      LEFT JOIN users u ON n.added_by = u.id
      LEFT JOIN characters c ON c.novel_id = n.id AND c.is_narrator = true
      LEFT JOIN voices v ON c.voice_id = v.id
      LEFT JOIN chapters ch ON ch.novel_id = n.id
      WHERE ($1::varchar IS NULL OR n.channel = $1)
      GROUP BY n.id, u.username, c.id, c.canonical_name, c.voice_id, v.label
      ORDER BY n.created_at DESC;
    `;

    const result = await pool.query(query, [channelFilter]);
    return res.json({ novels: result.rows });
  } catch (err) {
    console.error('[Novels List Error]:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve novels.' });
  }
});

/**
 * POST /api/novels
 * Inserts a new novel using specified fields: title, synopsis, channel, added_by
 */
router.post('/novels', optionalAuth, async (req, res) => {
  try {
    const {
      title,
      synopsis = '',
      channel = 'verified',
      added_by: requestedAddedBy,
      global_tone = null,
      cover_object = null,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const added_by = requestedAddedBy || req.user?.id;
    if (!added_by || !UUID_REGEX.test(added_by)) {
      return res.status(400).json({
        error: 'A valid added_by user UUID is required (or provide an authenticated session).',
      });
    }

    const normalizedChannel = channel ? channel.toLowerCase().trim() : 'verified';
    if (!ALLOWED_CHANNELS.includes(normalizedChannel)) {
      return res.status(400).json({
        error: `Invalid channel. Allowed values: ${ALLOWED_CHANNELS.join(', ')}.`,
      });
    }

    // Verify added_by user exists in PostgreSQL (via Prisma ORM layered over PG, with pg pool fallback)
    const { prisma } = require('../db');
    let targetUser = null;
    if (prisma.user) {
      targetUser = await prisma.user.findUnique({
        where: { id: added_by },
        select: { id: true, role: true },
      }).catch(() => null);
    }
    if (!targetUser) {
      const userCheck = await pool.query('SELECT id, role FROM users WHERE id = $1', [added_by]);
      targetUser = userCheck.rows[0] || null;
    }
    if (!targetUser) {
      return res.status(400).json({ error: `User with id '${added_by}' does not exist.` });
    }

    // Role check: neither authenticated readers nor target reader users may create novels
    const effectiveRole = req.user?.role || targetUser.role;
    if (effectiveRole === 'reader') {
      return res.status(403).json({
        error: "Forbidden: role 'reader' cannot create novels. Only writers and admins may create novels.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify added_by user exists in PostgreSQL
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [added_by]);
      if (userCheck.rows.length === 0) {
        throw { status: 400, message: `User with id '${added_by}' does not exist.` };
      }

      const query = `
        INSERT INTO novels (title, synopsis, channel, added_by, global_tone, cover_object)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;

      const result = await client.query(query, [
        title.trim(),
        synopsis ? synopsis.trim() : '',
        normalizedChannel,
        added_by,
        global_tone,
        cover_object,
      ]);

      const createdNovel = result.rows[0];

      // Enqueue profile_novel job into synthesis_jobs within the same transaction
      const jobRes = await client.query(
        `
        INSERT INTO synthesis_jobs (novel_id, chapter_id, requested_by, job_type, status, progress_pct)
        VALUES ($1, NULL, $2, 'profile_novel', 'queued', 0.0)
        RETURNING id, status, job_type;
      `,
        [createdNovel.id, added_by]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        message: 'Novel created successfully',
        novel: createdNovel,
        job: jobRes.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[Create Novel Error]:', err.message);
    return res.status(500).json({ error: 'Failed to create novel.' });
  }
});

/**
 * GET /api/novels/:id
 * Retrieves novel details, characters roster, and chapter directory.
 */
router.get('/novels/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({ error: 'Invalid novel UUID format.' });
    }

    // 1. Novel details with narrator info
    const novelQuery = `
      SELECT
        n.*,
        u.username AS author_username,
        c.id AS narrator_character_id,
        c.canonical_name AS narrator_name,
        c.voice_id AS narrator_voice_id,
        v.label AS narrator_voice_label
      FROM novels n
      LEFT JOIN users u ON n.added_by = u.id
      LEFT JOIN characters c ON c.novel_id = n.id AND c.is_narrator = true
      LEFT JOIN voices v ON c.voice_id = v.id
      WHERE n.id = $1;
    `;
    const novelRes = await pool.query(novelQuery, [id]);
    if (novelRes.rows.length === 0) {
      return res.status(404).json({ error: 'Novel not found.' });
    }

    // 2. Character portfolio
    const charactersQuery = `
      SELECT
        c.id, c.novel_id, c.canonical_name, c.gender, c.age_band,
        c.temperament, c.sample_quote, c.voice_id, c.speed_multiplier,
        c.is_narrator, c.needs_review, c.source, c.created_at, c.updated_at,
        v.label AS voice_label
      FROM characters c
      LEFT JOIN voices v ON c.voice_id = v.id
      WHERE c.novel_id = $1
      ORDER BY c.is_narrator DESC, c.canonical_name ASC;
    `;
    const charsRes = await pool.query(charactersQuery, [id]);

    // 3. Chapter directory
    const chaptersQuery = `
      SELECT
        id, novel_id, chapter_number, title, status, audio_version,
        swift_audio_object, total_duration_ms, created_at, updated_at
      FROM chapters
      WHERE novel_id = $1
      ORDER BY chapter_number ASC;
    `;
    const chaptersRes = await pool.query(chaptersQuery, [id]);

    return res.json({
      novel: novelRes.rows[0],
      characters: charsRes.rows,
      chapters: chaptersRes.rows,
    });
  } catch (err) {
    console.error('[Novel Details Error]:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve novel details.' });
  }
});

module.exports = router;
