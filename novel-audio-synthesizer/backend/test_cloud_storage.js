const assert = require('assert');
const http = require('http');

async function runCloudAdapterTests() {
  console.log('🧪 Running SyncTone Free Cloud Hosting & Storage Tests...');

  // 1. Verify default config state
  {
    const { config } = require('./src/config');
    assert.strictEqual(config.lowMemoryMode, false, 'lowMemoryMode defaults to false');
    assert.strictEqual(config.cookieSameSite, 'lax', 'cookieSameSite defaults to lax');
    assert(Array.isArray(config.corsOrigins) && config.corsOrigins.includes('http://localhost:5173'));
    console.log('  ✔ [1/4] Default cloud config flags verified');
  }

  // 2. Verify cloud env parsing & LOW_MEMORY_MODE worker behavior
  const origEnv = { ...process.env };
  try {
    process.env.STORAGE_PROVIDER = 's3';
    process.env.S3_ENDPOINT = 'https://proj.supabase.co/storage/v1/s3';
    process.env.S3_REGION = 'ap-south-1';
    process.env.S3_ACCESS_KEY_ID = 'test-access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.S3_BUCKET_AUDIO = 'synctone-audio';
    process.env.S3_BUCKET_COVERS = 'synctone-covers';
    process.env.STORAGE_PUBLIC_COVERS_URL = 'https://proj.supabase.co/storage/v1/object/public/synctone-covers';
    process.env.CORS_ORIGINS = 'https://synctone.app,https://custom.domain';
    process.env.COOKIE_SAMESITE = 'none';
    process.env.LOW_MEMORY_MODE = 'true';
    process.env.DATABASE_URL = 'postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require';

    delete require.cache[require.resolve('./src/config')];
    delete require.cache[require.resolve('./src/services/storageService')];
    delete require.cache[require.resolve('./src/engine/ttsWorkerPool')];

    const { config } = require('./src/config');
    const { storageService } = require('./src/services/storageService');
    const { TTSWorkerPool } = require('./src/engine/ttsWorkerPool');

    assert.strictEqual(config.pgSsl, true, 'pgSsl auto-detected from ?sslmode=require');
    assert.strictEqual(config.lowMemoryMode, true, 'LOW_MEMORY_MODE parsed as boolean');
    assert.strictEqual(config.cookieSameSite, 'none', 'COOKIE_SAMESITE=none honored');
    assert(config.corsOrigins.includes('https://synctone.app'), 'CORS_ORIGINS parsed');
    assert.strictEqual(storageService.isS3Configured(), true, 'S3 configuration active');

    const coverUrl = storageService.getPublicUrl({ bucketType: 'covers', key: 'cover_123.jpg' });
    assert.strictEqual(
      coverUrl,
      'https://proj.supabase.co/storage/v1/object/public/synctone-covers/cover_123.jpg'
    );
    assert(coverUrl.length <= 255, 'Cover URL fits PostgreSQL VARCHAR(255)');

    const poolInstance = new TTSWorkerPool();
    assert.strictEqual(poolInstance.isKokoroAvailable(), false, 'LOW_MEMORY_MODE disables Kokoro daemon');
    console.log('  ✔ [2/4] Cloud env parsing, Supabase S3 URL & LOW_MEMORY_MODE verified');
  } finally {
    process.env = origEnv;
    delete require.cache[require.resolve('./src/config')];
    delete require.cache[require.resolve('./src/services/storageService')];
    delete require.cache[require.resolve('./src/engine/ttsWorkerPool')];
  }

  // 3. Verify Vercel / HF Spaces dynamic CORS handling on Express app
  {
    const { createApp } = require('./src/app');
    const app = createApp();
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const vercelRes = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://synctone-git-dev-team.vercel.app' },
      });
      assert.strictEqual(vercelRes.status, 200);
      assert.strictEqual(
        vercelRes.headers.get('access-control-allow-origin'),
        'https://synctone-git-dev-team.vercel.app',
        'Vercel preview origin allowed'
      );

      const hfRes = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://namah-synctone-api.hf.space' },
      });
      assert.strictEqual(
        hfRes.headers.get('access-control-allow-origin'),
        'https://namah-synctone-api.hf.space',
        'HF Space origin allowed'
      );

      const blockedRes = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://untrusted-origin.example.org' },
      });
      assert.strictEqual(
        blockedRes.headers.get('access-control-allow-origin'),
        null,
        'Untrusted origin excluded from CORS allow header'
      );
      console.log('  ✔ [3/4] Dynamic Vercel & HF Spaces CORS policy verified');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  // 4. Verify storageService S3 put/stream round-trip with stubbed S3Client
  {
    const { Readable } = require('stream');
    const { S3Client } = require('@aws-sdk/client-s3');
    const origSend = S3Client.prototype.send;
    const sentCommands = [];
    S3Client.prototype.send = async function mockSend(cmd) {
      sentCommands.push(cmd.constructor.name);
      if (cmd.constructor.name === 'PutObjectCommand') {
        return { ETag: '"mock-etag"' };
      }
      if (cmd.constructor.name === 'HeadObjectCommand') {
        return { ContentLength: 5 };
      }
      if (cmd.constructor.name === 'GetObjectCommand') {
        return {
          ContentRange: 'bytes 0-3/5',
          ContentLength: 4,
          ContentType: 'audio/mpeg',
          Body: Readable.from([Buffer.from('sync')]),
        };
      }
      return {};
    };

    const envBackup = { ...process.env };
    try {
      process.env.STORAGE_PROVIDER = 's3';
      process.env.S3_ACCESS_KEY_ID = 'k';
      process.env.S3_SECRET_ACCESS_KEY = 's';
      process.env.S3_BUCKET_AUDIO = 'synctone-audio';
      delete require.cache[require.resolve('./src/config')];
      delete require.cache[require.resolve('./src/services/storageService')];

      const { storageService } = require('./src/services/storageService');
      const putRes = await storageService.putObject({
        bucketType: 'audio',
        key: 'test-cloud-track.mp3',
        body: Buffer.from('synct'),
        contentType: 'audio/mpeg',
      });
      assert.strictEqual(putRes.provider, 's3');

      const exists = await storageService.objectExists({
        bucketType: 'audio',
        key: 'test-cloud-track.mp3',
      });
      assert.strictEqual(exists, true);

      const streamRes = await storageService.getObjectStream({
        bucketType: 'audio',
        key: 'test-cloud-track.mp3',
        range: 'bytes=0-3',
      });
      assert.strictEqual(streamRes.status, 206);
      assert.strictEqual(streamRes.headers['Content-Range'], 'bytes 0-3/5');
      assert(sentCommands.includes('PutObjectCommand'));
      assert(sentCommands.includes('GetObjectCommand'));
      console.log('  ✔ [4/4] storageService PutObject / 206 Range GetObjectStream verified');
    } finally {
      S3Client.prototype.send = origSend;
      process.env = envBackup;
      delete require.cache[require.resolve('./src/config')];
      delete require.cache[require.resolve('./src/services/storageService')];
      try {
        const fs = require('fs');
        const path = require('path');
        const { config } = require('./src/config');
        const tmpAudio = path.join(config.paths.outputDir, 'test-cloud-track.mp3');
        if (fs.existsSync(tmpAudio)) fs.unlinkSync(tmpAudio);
      } catch (_) {}
    }
  }

  console.log('\n🎉 All 4 Free Cloud Hosting & Storage unit checks passed!');
}

runCloudAdapterTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Cloud adapter test failed:', err);
    process.exit(1);
  });
