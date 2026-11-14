const { createApp } = require('../novel-audio-synthesizer/backend/src/app');
const { connectMongo, connectPostgres, pool } = require('../novel-audio-synthesizer/backend/src/db');

let appInstance = null;
let initPromise = null;

async function ensureInitialized() {
  if (!appInstance) {
    appInstance = createApp();
  }
  if (!initPromise) {
    initPromise = (async () => {
      await Promise.allSettled([
        connectMongo().catch((e) => console.warn('[Vercel DB] Mongo warning:', e.message)),
        connectPostgres()
          .then(async () => {
            try {
              const { ensureVoiceCatalog } = require('../novel-audio-synthesizer/backend/src/scripts/seedDemos');
              await ensureVoiceCatalog(pool);
            } catch (e) {
              console.warn('[Vercel DB] Voice catalog warning:', e.message);
            }
          })
          .catch((e) => console.warn('[Vercel DB] Postgres warning:', e.message)),
      ]);
    })();
  }
  await initPromise;
  return appInstance;
}

module.exports = async (req, res) => {
  const app = await ensureInitialized();
  return app(req, res);
};
