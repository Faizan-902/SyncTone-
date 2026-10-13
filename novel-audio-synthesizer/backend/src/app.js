const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const chaptersRouter = require('./routes/chapters');
const voicesRouter = require('./routes/voices');
const statusRouter = require('./routes/status');
const swiftRouter = require('./routes/swift');
const playbackRouter = require('./routes/playback');
const { config } = require('./config');

function createApp() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://10.0.2.2:5173',
      ],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Static audio file serving
  app.use('/static/audio', express.static(config.paths.outputDir));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    return res.json({ status: 'healthy', version: '0.1.0' });
  });

  // API Routes
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
