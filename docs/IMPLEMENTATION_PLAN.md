# SyncTone — Implementation Plan (Express + Polyglot Persistence)

SyncTone is an enterprise-grade multi-voice novel audiobook synthesis platform. This document defines the architectural components, production contracts, and the 4-phase implementation roadmap.

---

## 1. System Components & Architecture Overview

The platform uses a polyglot microservice/container architecture orchestrated via Docker Compose:

* **API Gateway & Primary Synthesis**: Node.js 20+ & Express.js (CommonJS, zero build step) in `novel-audio-synthesizer/backend/`:
  - Auth: `httpOnly` secure JWT cookie with `pgcrypto` bcrypt password hashing.
  - Role-Based Access Control (RBAC: `reader`, `writer`, `admin`).
  - Novel Library Catalog and chapter ingestion endpoints.
  - Microsoft Edge Neural TTS (`msedge-tts`, 24kHz 48kbps MP3) as primary multi-voice engine with local harmonic/Kokoro fallback.
  - Sample-accurate audio stitcher (`audioStitcher.js`) with 250ms inter-speaker silence frames.
  - Dialogue extraction (`textParser.js`) and speaker attribution (`attribution.js`).
  - OpenStack Swift Range Streaming Proxy (`GET /api/chapters/:id/audio` and `GET /api/stream/:chapter_id`) with RFC 7233 HTTP 206 Partial Content, automatic 401 token refresh, and local filesystem fallback.
* **Relational Database (Core Authority)**: **PostgreSQL 16 (`synctone-postgres`)**:
  - Strict 3NF/BCNF relational model with 9 tables (`users`, `voices`, `novels`, `chapters`, `characters`, `character_aliases`, `synthesis_jobs`, `segment_audio_cache`, `playback_history`).
  - Authoritative source for identity, RBAC, catalog metadata, character rosters, aliases, and 20 seeded voices (12 Kokoro + 8 Edge Neural).
  - Row-locked task queue using `SELECT ... FOR UPDATE SKIP LOCKED`.
  - Atomic playback seek persistence via `playback_history` (`reading_progress` SQL compatibility view).
* **Document Database (Chapter Prose & Timelines)**: **MongoDB 7.0 (`synctone-mongo`)**:
  - `chapters` collection via Mongoose `Chapter` model linked strictly to PostgreSQL via `pg_chapter_id` (UUID unique index).
  - High-throughput storage for full raw prose (`raw_text`), ordered dialogue/narration segment arrays (`segments[]`), and pre-calculated playback manifest timelines (`manifest`).
  - Segments store `voice_id` and `speaker_name` directly alongside `character_id`, `start_ms`, and `end_ms` for zero-join client playback.
* **Distributed Object Storage**: **OpenStack Swift (`synctone-swift`)**:
  - Binary storage for synthesized audio files in `novel-chapters` and book cover art in `novel-covers`.
* **Offline Worker Daemon & Migrations**: **Python 3.11 (`kokoro-tts-backend`)**:
  - Authoritative Alembic migration runner (`alembic/versions/0001_initial_schema.py`).
  - Background worker claiming jobs via `SELECT ... FOR UPDATE SKIP LOCKED`.
  - SpaCy NLP (`en_core_web_sm`) dependency parsing and Kokoro-82M ONNX / PyTorch TTS fallback.
* **Frontend Client**: **React 18 + Vite 5 + Tailwind CSS 3**:
  - Pure JavaScript (ES2022+, `.jsx` / `.js`) webnovel reading application (WTR-Lab style).
  - 60fps `requestAnimationFrame` polling loop driving `useAudioSync` binary-search timeline highlighter.
  - Live WebSocket / SSE consumer for synthesis progress tracking.

---

## 2. 4-Phase Implementation Roadmap

```mermaid
flowchart LR
    P1["Phase 1: Polyglot Infrastructure &\nSchema Authority\n[DONE]"]
    P2["Phase 2: Express Gateway &\nMulti-Voice Engine\n[DONE]"]
    P3["Phase 3: Frontend Library &\nSynced Reader Polish\n[NEXT]"]
    P4["Phase 4: End-to-End Testing &\nAssessment Defense\n[UPCOMING]"]

    P1 --> P2
    P2 --> P3
    P3 --> P4
```

### Phase 1: Polyglot Infrastructure, 9-Table PG Schema & Mongoose Contract `[DONE]`
- [x] **6-Service Docker Compose Setup**: Configured and tested `synctone-postgres` (PostgreSQL 16), `synctone-mongo` (MongoDB 7.0), `synctone-swift` (OpenStack Swift `bouncestorage/swift-aio`), `synctone-api` (Express Gateway), `synctone-worker` (Python Daemon), and `synctone-frontend` (React + Vite).
- [x] **Authoritative PostgreSQL 16 Relational Schema**: Implemented Alembic migration `0001_initial_schema.py` and reference `0001_initial_schema.sql` defining 9 tables in strict 3NF/BCNF:
  1. `users`: UUID primary key, unique constraints on `username` and `email`, check constraint on `role IN ('reader', 'writer', 'admin')`.
  2. `voices`: Master catalog with 20 seeded voices (12 Kokoro + 8 Microsoft Edge Neural).
  3. `novels`: Catalog metadata with `channel IN ('verified', 'community')` and status workflow.
  4. `chapters`: Relational metadata storing `total_duration_ms`, `swift_audio_object`, and monotonic `audio_version`.
  5. `characters`: Character portfolio with partial unique index ensuring at most one narrator per novel.
  6. `character_aliases`: Multi-valued alias normalization enforcing `UNIQUE(novel_id, alias)`.
  7. `synthesis_jobs`: Transactional job queue supporting `SELECT ... FOR UPDATE SKIP LOCKED` and exponential backoff retry.
  8. `segment_audio_cache`: LRU-indexed lookup table keyed by `(text_hash, voice_hash)` for 24kHz raw PCM buffers.
  9. `playback_history`: High-speed atomic seek table with `UNIQUE(user_id, novel_id)` and compatibility view `reading_progress`.
- [x] **MongoDB 7.0 Document Model Contract**: Implemented Mongoose `Chapter` model in `novel-audio-synthesizer/backend/src/models/Chapter.js` keyed by `pg_chapter_id` UUID index, encapsulating `raw_text`, ordered `segments[]`, and playback `manifest`.
- [x] **Data Engineering Automated Test Suite**: Built `npm run test:de` verifying check constraints, partial unique indexes, foreign key cascading, and BCNF normalization compliance.

### Phase 2: Express Gateway, Auth/RBAC, Polyglot Ingestion, Multi-Voice Engine & Swift Range Proxy `[DONE]`
- [x] **Express.js API Gateway**: Implemented pure JavaScript (CommonJS, Node.js 20+) REST API in `novel-audio-synthesizer/backend/`.
- [x] **Authentication & Role Authorization**: Built `httpOnly` secure JWT cookie authentication with `pgcrypto` bcrypt password hashing and granular role authorization (`reader`, `writer`, `admin`).
- [x] **Polyglot Chapter Ingestion with Compensating Rollback**: Implemented atomic multi-database chapter creation in `POST /api/novels/:id/chapters`. Wraps PostgreSQL in an explicit transaction (`BEGIN...COMMIT`) and compensates on failure by deleting the MongoDB document (`Chapter.deleteOne({ pg_chapter_id })`), preventing orphan records.
- [x] **Dual-TTS Multi-Voice Synthesis Engine**:
  - Primary Engine: Microsoft Edge Neural TTS (`msedge-tts`, 24kHz 48kbps MP3) streaming authentic British character voices (Harry, Hermione, Ron, Dumbledore, Snape, McGonagall, Ryan Narrator).
  - Fallback Engine: Python Kokoro-82M ONNX daemon in `kokoro-tts-backend/` providing local offline synthesis.
- [x] **Audio Stitcher (`audioStitcher.js`)**: Implemented sample-accurate MP3/WAV segment stitching that inserts 250ms inter-speaker silence frames and computes exact start/end millisecond timeline offsets.
- [x] **OpenStack Swift Range Streaming Proxy (`swift.js`)**: Developed RFC 7233 compliant proxy (`GET /api/chapters/:id/audio` and `GET /api/stream/:chapter_id`) with single in-flight token refresh mutex, 401 automatic re-authentication retry, 416 range validation, HTTP 206 Partial Content delivery, and local filesystem fallback.
- [x] **Attribution & Profiling Subsystem**: Created `textParser.js`, `attribution.js`, and `voiceProfiler.js` for quote-boundary segmentation, regex candidate extraction, and alias-to-character resolution.

### Phase 3: Frontend Novel Library, Synced Reader Polyglot Wiring & Character Roster Polish `[NEXT]`
- [ ] **Novel Library Catalog Interface**: Complete responsive React 18 + Tailwind CSS 3 novel browsing grid featuring Verified and Community channel tabs, genre filtering, cover art rendering, and chapter lists.
- [ ] **Webnovel Reader Experience**: Build ergonomic reader interface (WTR-Lab style) with font customization, dark/sepia/light themes, and sticky audio playback dock.
- [ ] **60fps `useAudioSync` Highlighting Hook**: Finalize zero-latency audio clock synchronization utilizing binary-search lookup over the MongoDB `manifest.timeline[]` within a `requestAnimationFrame` loop.
- [ ] **Character Roster Drawer**: Deliver an interactive character drawer displaying canonical names, detected aliases, assigned voices, sample quote audio previews, and admin voice reassignment dropdowns.
- [ ] **Real-Time Progress Consumer**: Wire frontend WebSocket/SSE client to display live progress bars for queued and actively synthesizing chapters.
- [ ] **Atomic Playback Resume**: Connect reader playback ticks to `POST /api/progress` for seamless reading resumption across browser sessions.

### Phase 4: End-to-End Integration Testing, Queue Reaper & Assessment Defense `[UPCOMING]`
- [ ] **Benchmark Demonstration Packaging**:
  - Local Harry Potter Demo: Pre-tuned multi-voice demo of Chapter 1 of *Harry Potter and the Philosopher's Stone* with verified British character casting.
  - Public Gutenberg Demo: Public-domain evaluation on *The Adventures of Sherlock Holmes* (Chapter 1 & 2) demonstrating end-to-end automated profiling.
- [ ] **Transactional Worker Reaper & Crash Recovery**: Test automated cleanup and exponential backoff retry for stalled synthesis jobs using `locked_at` heartbeat timeouts.
- [ ] **Performance Benchmarks**: Document read latency, document size, and throughput metrics comparing MongoDB document retrieval vs PostgreSQL JSONB.
- [ ] **Academic Viva & Project Defense**: Assemble finalized technical report, architecture diagrams, and slide deck for university examination.

---

## 3. Core Architectural Implementation Contracts

### 3.1 MongoDB Chapter Mongoose Contract (`novel-audio-synthesizer/backend/src/models/Chapter.js`)

```javascript
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const SegmentSchema = new Schema({
  order: { type: Number, required: true, min: 1 },
  segment_id: { type: String },
  type: { type: String, required: true, enum: ['narration', 'dialogue'] },
  text: { type: String, required: true, trim: true, alias: 'text_content' },
  character_id: { type: String, default: null },
  speaker_id: { type: String, default: null },
  speaker_name: { type: String, default: null },
  voice_id: { type: String, required: true },
  start_ms: { type: Number, required: true, min: 0 },
  end_ms: { type: Number, required: true, min: 0 },
  confidence: { type: Number, min: 0.0, max: 1.0, alias: 'confidence_score' },
  source: { type: String, alias: 'attribution_source' },
  needs_review: { type: Boolean, default: false },
}, { _id: false });

const PlaybackManifestSchema = new Schema({
  total_duration_ms: { type: Number, required: true, min: 0 },
  audio_url: { type: String },
  timeline: [{
    order: Number,
    start_ms: Number,
    end_ms: Number,
    character_id: String,
    speaker_name: String,
    voice_id: String,
    text: String,
  }],
}, { _id: false });

const ChapterSchema = new Schema({
  pg_chapter_id: { type: String, required: true, unique: true, index: true },
  novel_id: { type: String, required: true, index: true },
  chapter_number: { type: Number, required: true, min: 1 },
  title: { type: String, default: '' },
  raw_text: { type: String, required: true },
  audio_version: { type: Number, default: 1 },
  manifest: { type: PlaybackManifestSchema },
  segments: { type: [SegmentSchema], default: [] },
}, { timestamps: true, collection: 'chapters' });

ChapterSchema.index({ novel_id: 1, chapter_number: 1 }, { unique: true });
const Chapter = mongoose.models.Chapter || model('Chapter', ChapterSchema);
module.exports = { Chapter };
```

---

### 3.2 Express.js Swift Range Proxy (`novel-audio-synthesizer/backend/src/routes/swift.js`)

```javascript
const axios = require('axios');
const { pool } = require('../db');
const { config } = require('../config');

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
        tokenExpiresAt = Date.now() + 3600000;
        return { token: cachedSwiftToken, storageUrl: cachedStorageUrl };
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// Handler supporting RFC 7233 HTTP 206 Partial Content and 401 token refresh retry
```

---

### 3.3 Atomic Playback Progress Upsert (`playback_history` / `reading_progress`)

```sql
INSERT INTO playback_history (user_id, novel_id, chapter_id, segment_order, position_ms, updated_at)
VALUES ($1, $2, $3, $4, $5, now())
ON CONFLICT (user_id, novel_id) DO UPDATE SET
  chapter_id = EXCLUDED.chapter_id,
  segment_order = EXCLUDED.segment_order,
  position_ms = EXCLUDED.position_ms,
  updated_at = now()
RETURNING id, user_id, novel_id, chapter_id, segment_order, position_ms, updated_at;
```
