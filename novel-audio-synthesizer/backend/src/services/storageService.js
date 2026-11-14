/**
 * Unified Object Storage Service for SyncTone.
 *
 * Supports 100% free S3-compatible bucket providers (Supabase Storage S3,
 * Backblaze B2, Cloudflare R2, MinIO), legacy OpenStack Swift, and local disk cache.
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { config } = require('../config');

const S3_PROVIDERS = new Set(['s3', 'r2', 'supabase', 'b2']);

let cachedS3Client = null;

function isS3Configured() {
  const s = config.storage || {};
  return Boolean(
    S3_PROVIDERS.has(s.provider) &&
    s.s3AccessKeyId &&
    s.s3SecretAccessKey
  );
}

function getS3Client() {
  if (!isS3Configured()) return null;
  if (!cachedS3Client) {
    const s = config.storage;
    cachedS3Client = new S3Client({
      region: s.s3Region || 'auto',
      ...(s.s3Endpoint ? { endpoint: s.s3Endpoint } : {}),
      forcePathStyle: s.s3ForcePathStyle !== false,
      credentials: {
        accessKeyId: s.s3AccessKeyId,
        secretAccessKey: s.s3SecretAccessKey,
      },
    });
  }
  return cachedS3Client;
}

function resolveBucket(bucketType) {
  const s = config.storage || {};
  return bucketType === 'covers'
    ? (s.bucketCovers || 'synctone-covers')
    : (s.bucketAudio || 'synctone-audio');
}

function resolveLocalPaths(bucketType, key) {
  const safeKey = path.basename(String(key || ''));
  if (!safeKey) return [];
  if (bucketType === 'covers') {
    return [
      path.join(config.paths.outputDir, 'covers', safeKey),
      path.resolve(__dirname, '../../output/covers', safeKey),
      path.resolve(__dirname, '../../../output/covers', safeKey),
    ];
  }
  return [path.join(config.paths.outputDir, safeKey)];
}

function getPublicUrl({ bucketType = 'covers', key }) {
  const safeKey = path.basename(String(key || ''));
  const s = config.storage || {};
  if (bucketType === 'covers') {
    if (s.publicCoversUrl) {
      const candidate = `${s.publicCoversUrl}/${encodeURIComponent(safeKey)}`;
      // Preserve PostgreSQL novels.cover_object VARCHAR(255) safety
      if (candidate.length <= 255) return candidate;
    }
    return `/static/covers/${safeKey}`;
  }
  if (s.publicAudioUrl) {
    return `${s.publicAudioUrl}/${encodeURIComponent(safeKey)}`;
  }
  return `/api/stream/${safeKey.replace(/\.(mp3|wav|opus)$/i, '')}`;
}

function toNodeStream(body) {
  if (!body) return null;
  if (typeof body.pipe === 'function') return body;
  if (typeof Readable.fromWeb === 'function') {
    return Readable.fromWeb(body);
  }
  return null;
}

async function putObject({ bucketType = 'audio', key, body, contentType, cacheControl }) {
  const safeKey = path.basename(String(key || ''));
  if (!safeKey || !body) {
    throw new Error('Storage putObject requires non-empty key and body.');
  }

  const localTargets = resolveLocalPaths(bucketType, safeKey);
  for (const targetPath of localTargets) {
    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, body);
    } catch (_) {}
  }

  const client = getS3Client();
  if (client) {
    await client.send(
      new PutObjectCommand({
        Bucket: resolveBucket(bucketType),
        Key: safeKey,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
        CacheControl: cacheControl || 'public, max-age=31536000, immutable',
      })
    );
    return {
      provider: config.storage.provider,
      key: safeKey,
      url: getPublicUrl({ bucketType, key: safeKey }),
    };
  }

  return {
    provider: 'local',
    key: safeKey,
    url: getPublicUrl({ bucketType, key: safeKey }),
  };
}

async function objectExists({ bucketType = 'audio', key }) {
  const safeKey = path.basename(String(key || ''));
  if (!safeKey) return false;

  for (const localPath of resolveLocalPaths(bucketType, safeKey)) {
    try {
      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
        return true;
      }
    } catch (_) {}
  }

  const client = getS3Client();
  if (!client) return false;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: resolveBucket(bucketType),
        Key: safeKey,
      })
    );
    return true;
  } catch (err) {
    const code = err?.$metadata?.httpStatusCode;
    if (code === 404 || err?.name === 'NotFound') {
      return false;
    }
    console.warn(`[Storage] HeadObject warning for ${safeKey}:`, err.message);
    return false;
  }
}

async function getObjectStream({ bucketType = 'audio', key, range }) {
  const safeKey = path.basename(String(key || ''));
  if (!safeKey) return null;

  const client = getS3Client();
  if (!client) return null;

  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: resolveBucket(bucketType),
        Key: safeKey,
        ...(range ? { Range: range } : {}),
      })
    );
    const stream = toNodeStream(res.Body);
    if (!stream) return null;

    const headers = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    };
    if (res.ContentRange) headers['Content-Range'] = String(res.ContentRange);
    if (res.ContentLength !== undefined) headers['Content-Length'] = String(res.ContentLength);
    if (res.ContentType) headers['Content-Type'] = String(res.ContentType);

    return {
      status: res.ContentRange ? 206 : 200,
      headers,
      stream,
    };
  } catch (err) {
    const statusCode = err?.$metadata?.httpStatusCode;
    if (statusCode === 416 || err?.name === 'InvalidRange') {
      return {
        status: 416,
        headers: {
          'Accept-Ranges': 'bytes',
        },
        stream: null,
      };
    }
    if (statusCode === 404 || err?.name === 'NoSuchKey' || err?.name === 'NotFound') {
      return null;
    }
    throw err;
  }
}

const storageService = {
  isS3Configured,
  putObject,
  objectExists,
  getObjectStream,
  getPublicUrl,
};

module.exports = {
  storageService,
};
