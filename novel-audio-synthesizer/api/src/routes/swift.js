const { Router } = require('express');
const axios = require('axios');
const { pool } = require('../db');
const { config } = require('../config');

const router = Router();

let cachedSwiftToken = null;
let cachedStorageUrl = null;
let tokenExpiresAt = 0;
let refreshPromise = null;

async function getSwiftAuth() {
  const now = Date.now();
  if (cachedSwiftToken && cachedStorageUrl && now < tokenExpiresAt - 300000) {
    return { token: cachedSwiftToken, storageUrl: cachedStorageUrl };
  }
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await axios.get(config.swift.authUrl, {
        headers: {
          'X-Storage-User': config.swift.username,
          'X-Storage-Pass': config.swift.key,
        },
      });
      cachedSwiftToken = res.headers['x-auth-token'];
      cachedStorageUrl = res.headers['x-storage-url'] || 'http://localhost:8080/v1/AUTH_test';
      tokenExpiresAt = Date.now() + 3600000;
      refreshPromise = null;
      return { token: cachedSwiftToken, storageUrl: cachedStorageUrl };
    })();
  }
  return refreshPromise;
}

// GET /api/chapters/:id/audio (Swift audio streaming proxy)
router.get('/chapters/:id/audio', async (req, res) => {
  const { id } = req.params;

  try {
    const dbRes = await pool.query(
      'SELECT swift_audio_object, total_duration_ms, status FROM chapters WHERE id = $1',
      [id]
    );

    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const { swift_audio_object } = dbRes.rows[0];
    if (!swift_audio_object) {
      return res.status(400).json({ error: 'Audio not synthesized yet' });
    }

    const { token, storageUrl } = await getSwiftAuth();
    const swiftUrl = `${storageUrl}/${config.swift.containerAudio}/${swift_audio_object}`;

    const rangeHeader = req.headers.range;
    const swiftHeaders = { 'X-Auth-Token': token };
    if (rangeHeader) swiftHeaders['Range'] = rangeHeader;

    const swiftRes = await axios.get(swiftUrl, {
      headers: swiftHeaders,
      responseType: 'stream',
      validateStatus: (s) => s === 200 || s === 206,
    });

    res.status(swiftRes.status);
    if (swiftRes.headers['content-range']) {
      res.setHeader('Content-Range', String(swiftRes.headers['content-range']));
    }
    if (swiftRes.headers['content-length']) {
      res.setHeader('Content-Length', String(swiftRes.headers['content-length']));
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'audio/opus');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    swiftRes.data.pipe(res);
  } catch (err) {
    if (err.response && err.response.status === 401) {
      cachedSwiftToken = null;
    }
    console.error('[SwiftProxy] Error streaming chapter audio:', err.message);
    return res.status(500).json({ error: 'Failed to stream audio from object storage' });
  }
});

module.exports = router;
