const http = require('http');
const { createApp } = require('./app');
const { setupWebSocketServer } = require('./websocket');
const { pool, connectMongo, connectPostgres } = require('./db');
const { config } = require('./config');

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  setupWebSocketServer(server);

  server.listen(config.port, () => {
    console.log(`[SyncTone API] Express server running at http://localhost:${config.port}`);
    console.log(`[SyncTone API] Static audio directory: ${config.paths.outputDir}`);
    console.log(`[SyncTone API] WebSocket available at ws://localhost:${config.port}/api/ws/progress/:id`);
  });

  connectMongo().catch((e) => console.warn('[DB] Mongo connect warning:', e.message));
  connectPostgres()
    .then(async () => {
      try {
        const { ensureVoiceCatalog, seedDemos } = require('./scripts/seedDemos');
        await ensureVoiceCatalog();

        if (process.env.AUTO_SEED_DEMOS !== 'false') {
          const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM novels');
          if ((rows[0]?.cnt || 0) === 0) {
            console.log('[DB] Empty novels catalog detected — running initial demo seeder in background...');
            seedDemos({ closeConnections: false }).catch((err) =>
              console.warn('[DB] Background demo seed warning:', err.message)
            );
          }
        }
      } catch (e) {
        console.warn('[DB] Voice catalog / auto-seed warning:', e.message);
      }
    })
    .catch((e) => console.warn('[DB] Postgres connect warning:', e.message));
}

bootstrap().catch((err) => {
  console.error('[SyncTone API] Bootstrap failed:', err);
  process.exit(1);
});
