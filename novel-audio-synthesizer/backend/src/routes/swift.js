const { Router } = require('express');
const axios = require('axios');
const { pool } = require('../db');
const { config } = require('../config');

const router = Router();

let cachedSwiftToken = null;
let cachedStorageUrl = null;
let tokenExpiresAt = 0;
let refreshPromise = null;

async function getSwiftAuth(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedSwiftToken && cachedStorageUrl && now < tokenExpiresAt - 300000) {
    return { token: cachedSwiftToken, storageUrl: cachedStorageUrl };
  }
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await axios.get(config.swift.authUrl, {
          headers: {
            'X-Storage-User': config.swift.username,
            'X-Storage-Pass': config.swift.key,
          },
          timeout: 5000,
        });
        cachedSwiftToken = res.headers['x-auth-token'];
        cachedStorageUrl = res.headers['x-storage-url'] || 'http://localhost:8080/v1/AUTH_test';
        const ttlSec = parseInt(
          res.headers['x-auth-token-expires'] || res.headers['x-token-expires'] || '3600',
          10
        );
        tokenExpiresAt = Date.now() + ttlSec * 1000;
        return { token: cachedSwiftToken, storageUrl: cachedStorageUrl };
      } finally {
        refreshPromise = null;
      }
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

    const fetchSwiftStream = async (forceTokenRefresh = false) => {
      const { token, storageUrl } = await getSwiftAuth(forceTokenRefresh);
      const swiftUrl = `${storageUrl}/${config.swift.containerAudio}/${swift_audio_object}`;

      const rangeHeader = req.headers.range;
      const swiftHeaders = { 'X-Auth-Token': token };
      if (rangeHeader) swiftHeaders['Range'] = rangeHeader;

      return axios.get(swiftUrl, {
        headers: swiftHeaders,
        responseType: 'stream',
        validateStatus: (s) => s === 200 || s === 206 || s === 416,
      });
    };

    let swiftRes;
    try {
      swiftRes = await fetchSwiftStream(false);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        cachedSwiftToken = null;
        swiftRes = await fetchSwiftStream(true);
      } else {
        throw err;
      }
    }

    // If Swift returns 401 directly without throwing
    if (swiftRes.status === 401) {
      cachedSwiftToken = null;
      swiftRes = await fetchSwiftStream(true);
    }

    res.status(swiftRes.status);
    if (swiftRes.status === 416) {
      if (swiftRes.headers['content-range']) {
        res.setHeader('Content-Range', String(swiftRes.headers['content-range']));
      }
      return res.end();
    }

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
