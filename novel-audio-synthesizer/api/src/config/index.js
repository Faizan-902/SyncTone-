const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '../../..');

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'synctone_super_secret_jwt_key_2026_dev_mode',

  // Database
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://synctone_user:synctone_pass@localhost:5432/synctone',
  mongoUri:
    process.env.MONGO_URI ||
    'mongodb://synctone_user:synctone_pass@localhost:27017/synctone?authSource=admin',

  // OpenStack Swift
  swift: {
    authUrl: process.env.SWIFT_AUTH_URL || 'http://localhost:8080/auth/v1.0',
    username: process.env.SWIFT_USERNAME || 'test:tester',
    key: process.env.SWIFT_KEY || 'testing',
    containerAudio: process.env.SWIFT_CONTAINER_AUDIO || 'novel-chapters',
    containerCovers: process.env.SWIFT_CONTAINER_COVERS || 'novel-covers',
  },

  // LLM / Ollama
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'mistral',
  },

  // Storage Directories
  paths: {
    root: ROOT_DIR,
    outputDir: path.resolve(ROOT_DIR, 'output'),
    chaptersDir: path.resolve(ROOT_DIR, 'chapters'),
    modelsDir: path.resolve(ROOT_DIR, 'backend/models_cache'),
  },

  audio: {
    sampleRate: 24000,
    interSpeakerPauseMs: 300,
  },
};

module.exports = { config };
