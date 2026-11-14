const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRouter = require('./routes/auth');
const novelsRouter = require('./routes/novels');
const chaptersRouter = require('./routes/chapters');
const voicesRouter = require('./routes/voices');
const statusRouter = require('./routes/status');
const swiftRouter = require('./routes/swift');
const playbackRouter = require('./routes/playback');
const { config } = require('./config');
const { storageService } = require('./services/storageService');

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  if (Array.isArray(config.corsOrigins) && config.corsOrigins.includes(origin)) {
    return true;
  }
  if (
    config.allowVercelPreviews &&
    (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.hf\.space$/i.test(origin))
  ) {
    return true;
  }
  return false;
}

function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedCorsOrigin(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Range',
        'Cookie',
        'X-Requested-With',
        'Accept',
        'Origin',
      ],
      exposedHeaders: [
        'Content-Range',
        'Accept-Ranges',
        'Content-Length',
        'Content-Type',
      ],
    })
  );
  app.use(express.json({ limit: '250mb' }));
  app.use(express.urlencoded({ extended: true, limit: '250mb' }));
  app.use(cookieParser());

  // Static audio file serving
  app.use('/static/audio', express.static(config.paths.outputDir));
  app.use('/static/covers', express.static(path.join(config.paths.outputDir, 'covers')));
  app.use('/static/covers', express.static(path.resolve(__dirname, '../output/covers')));
  app.get('/static/covers/:fileName', async (req, res, next) => {
    try {
      const safeName = path.basename(req.params.fileName || '');
      if (!safeName || !storageService.isS3Configured()) {
        return next();
      }
      const s3Obj = await storageService.getObjectStream({ bucketType: 'covers', key: safeName });
      if (!s3Obj || !s3Obj.stream) {
        return next();
      }
      res.status(s3Obj.status || 200);
      Object.entries(s3Obj.headers || {}).forEach(([k, v]) => {
        if (v !== undefined) res.setHeader(k, String(v));
      });
      if (!res.getHeader('Content-Type')) {
        const lower = safeName.toLowerCase();
        res.setHeader(
          'Content-Type',
          lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
        );
      }
      return s3Obj.stream.pipe(res);
    } catch (err) {
      console.warn('[StaticCover Fallback Warning]:', err.message);
      return next();
    }
  });

  // Health check endpoint (root & /api alias)
  app.get(['/health', '/api/health'], (_req, res) => {
    return res.json({ status: 'healthy', version: '0.1.0' });
  });

  // API Routes
  app.use('/api', authRouter);
  app.use('/api', novelsRouter);
  app.use('/api', chaptersRouter);
  app.use('/api', voicesRouter);
  app.use('/api', statusRouter);
  app.use('/api', swiftRouter);
  app.use('/api', playbackRouter);

  // 404 Handler
  app.use((_req, res) => {
    return res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use((err, _req, res, _next) => {
    console.error('[API Error]:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

module.exports = {
  createApp,
};
