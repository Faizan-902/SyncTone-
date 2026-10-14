const path = require('path');
const fs = require('fs');

// Robust .env resolution: checks root .env, then backend .env, then current working directory
const ROOT_DIR = path.resolve(__dirname, '../../..');
const BACKEND_DIR = path.resolve(__dirname, '../..');
const ROOT_ENV = path.resolve(ROOT_DIR, '.env');
const BACKEND_ENV = path.resolve(BACKEND_DIR, '.env');

if (fs.existsSync(ROOT_ENV)) {
  require('dotenv').config({ path: ROOT_ENV });
} else if (fs.existsSync(BACKEND_ENV)) {
  require('dotenv').config({ path: BACKEND_ENV });
} else {
  require('dotenv').config();
}

// Storage Directories: safely resolves output, chapters, and models both locally and in Docker container
const outputDir = fs.existsSync(path.resolve(BACKEND_DIR, 'output'))
  ? path.resolve(BACKEND_DIR, 'output')
  : fs.existsSync(path.resolve(ROOT_DIR, 'novel-audio-synthesizer/output'))
  ? path.resolve(ROOT_DIR, 'novel-audio-synthesizer/output')
  : path.resolve(ROOT_DIR, 'output');

const chaptersDir = fs.existsSync(path.resolve(BACKEND_DIR, 'chapters'))
  ? path.resolve(BACKEND_DIR, 'chapters')
  : fs.existsSync(path.resolve(ROOT_DIR, 'novel-audio-synthesizer/chapters'))
  ? path.resolve(ROOT_DIR, 'novel-audio-synthesizer/chapters')
  : path.resolve(ROOT_DIR, 'chapters');

const modelsDir = fs.existsSync(path.resolve(BACKEND_DIR, '../kokoro-tts-backend/models_cache'))
  ? path.resolve(BACKEND_DIR, '../kokoro-tts-backend/models_cache')
  : path.resolve(ROOT_DIR, 'novel-audio-synthesizer/kokoro-tts-backend/models_cache');

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
    outputDir,
    chaptersDir,
    modelsDir,
  },

  audio: {
    sampleRate: 24000,
    interSpeakerPauseMs: 300,
  },
};

module.exports = { config };
