# SyncTone — Capstone Architecture Plan (Rev. 8)

> Rev. 8 applies verified polyglot persistence alignment across PostgreSQL 16, MongoDB 7.0, and OpenStack Swift. All database schemas, entity relationships, tech stack definitions, and data flow diagrams are synchronized with `0001_initial_schema.sql`, Mongoose `Chapter` contracts, and the 6-service Docker Compose architecture.

---

## 0. Finalized Decisions & Timeframe

* **Recounted Speech (P.S. Feature)**: **Voice switch only.** The book's exact words are preserved verbatim to maintain 1:1 text-audio alignment for `requestAnimationFrame` text highlighting with zero generative text hallucination. The voice switches to the character during the recounted clause and immediately reverts to the narrator.
* **Target Delivery Timeline**: **20-Day Fast-Track Sprint** (Total submission deadline: 41 days). The project is engineered to achieve a complete, feature-frozen MVP by **Day 20**, leaving the remaining 21 days as an extensive buffer for benchmark evaluation, report writing, and viva presentation rehearsal.

---

## 1. Scope & Content Strategy

| Phase | Contents | Target |
|---|---|---|
| **Phase 1 (Core MVP - Days 1–17)** | Login with roles (`reader`, `writer`, `admin`). **Verified channel only.** Admin adds novels via clean upload form. Multi-pass AI character discovery (Gemini Flash + dual-signal extraction). Line-by-line chapter attribution. Per-chapter on-demand TTS. Opus/MP3 audio stored in OpenStack Swift. Synced React reader with 60fps highlighting. | **Must Ship (Day 17)** |
| **Phase 2 (Hardening & Demos - Days 18–20)** | Pre-tuned *Harry Potter* demo (local evaluation only). Public-domain *Sherlock Holmes* demo. Two-chapter Project Gutenberg benchmark evaluation. Code freeze. | **Feature Freeze (Day 20)** |
| **Phase 3 (Post-MVP Buffer - Days 21–41)** | Writer role and upload portal (with `tts-dom-cleaner`). Community channel with disclaimer. Recounted-speech voice switching. Report & Viva preparation. | Buffer & Expansion |

**Demo content:**
- **Public deployment:** public-domain novels only (Project Gutenberg, e.g. *The Adventures of Sherlock Holmes*).
- **Harry Potter:** runs **on your local machine only.** Its character portfolio is **entered by hand by the admin** (Verified channel), so the book is **never sent to a third-party LLM API.** That also avoids API terms-of-service questions.

---

## 2. Tech Stack & Infrastructure

SyncTone is orchestrated as a 6-service polyglot architecture in Docker Compose:

| Layer | Technology | Role |
|---|---|---|
| **Frontend Web Client** | **React 18 + Vite 5 + Tailwind CSS 3** (Pure JavaScript ES2022+) | Responsive webnovel reader (WTR-Lab style), catalog browsing, and character drawer. A 60fps `requestAnimationFrame` loop drives `useAudioSync` binary-search highlighting; live progress consumed via WebSocket. |
| **Input Cleaning** | **`tts-dom-cleaner`** (npm package) | Client-side DOM/text cleanup before upload to strip web novel artifacts, site navigation, and ruby tags. |
| **API Gateway & Primary Synthesis** | **Express.js (Node.js 20+ / CommonJS)** | Auth (`httpOnly` JWT cookie + `pgcrypto` bcrypt), RBAC (`reader`, `writer`, `admin`), connection-pooled PostgreSQL (`pg`), MongoDB ODM (`mongoose`), novel and chapter routes, text parsing (`textParser.js`), speaker attribution (`attribution.js`), voice profiling (`voiceProfiler.js`), audio stitching (`audioStitcher.js`), and RFC 7233 Swift audio proxy. |
| **Primary TTS Engine** | **Microsoft Edge Neural TTS (`msedge-tts`)** | Primary multi-voice neural synthesis (24kHz 48kbps MP3) streaming authentic British character voices (Harry, Hermione, Ron, Dumbledore, Snape, McGonagall, Ryan Narrator). |
| **Offline Worker Daemon & Migrations** | **Python 3.11 (`kokoro-tts-backend`)** | Background daemon and authoritative schema migration runner (**Alembic** `0001_initial_schema.py`). SpaCy NLP (`en_core_web_sm`) dependency parsing, Kokoro-82M ONNX / PyTorch TTS fallback claiming jobs via `SELECT ... FOR UPDATE SKIP LOCKED`. |
| **Relational DB** | **PostgreSQL 16 (`synctone-postgres`)** (authoritative) | Strict 3NF/BCNF relational DBMS: users, roles, novel metadata, chapter metadata, characters, aliases, voices catalog (20 seeded voices: 12 Kokoro + 8 Edge Neural), transactional job queue (`synthesis_jobs`), LRU segment audio cache (`segment_audio_cache`), and atomic playback resume (`playback_history` + `reading_progress` view). |
| **Document DB** | **MongoDB 7.0 (`synctone-mongo`)** | High-performance document store (`chapters` collection via Mongoose `Chapter` model) linked via `pg_chapter_id` UUID: full raw text, attributed segments array (with `order`, `segment_id`, `type`, `text`, `character_id`, `speaker_id`, `speaker_name`, `voice_id`, `confidence`, `source`, `needs_review`), and playback manifest (`total_duration_ms`, `audio_url`, `timeline[]`). |
| **Object Storage** | **OpenStack Swift (`synctone-swift`)** | Final `.opus`/`.mp3` audio blobs (`novel-chapters`) and cover images (`novel-covers`). Streamed through Express Range Proxy with HTTP 206 Partial Content, automatic 401 token refresh retry, and 416 range validation. |
| **LLM** | Hosted long-context model, **Gemini Flash-class** | Cast reconciliation, tone extraction, and character profiling. Hand-tuned verified portfolios bypass LLM calls entirely. |
| **Hosting & Orchestration** | **6-Service Docker Compose** | Multi-container stack (`synctone-postgres`, `synctone-mongo`, `synctone-swift`, `synctone-api`, `synctone-worker`, `synctone-frontend`). |

---

## 3. Data Placement: Which Store Owns What

Each fact has exactly one authoritative owner. Copies are labelled *derived*.

| Data | Owner | Copy (derived) | Why |
|---|---|---|---|
| Users, roles | Postgres (`users`) | — | Constraints and auth need ACID guarantees. |
| Novel metadata, channel, status | Postgres (`novels`) | — | Relational and filterable catalog. |
| Chapter metadata (`status`, `swift_audio_object`, `total_duration_ms`, `audio_version`) | **Postgres (`chapters`)** | — | Authoritative relational state; kept decoupled from raw text. |
| Chapter raw text | **Mongo (`chapters.raw_text`)** | — | Large text that's read whole. Keeps Postgres small. |
| Attributed segments + `start_ms/end_ms` | **Mongo (`chapters.segments[]`)** | — | Read as one document per chapter. Stores `speaker_name` and `voice_id` directly for fast reader rendering. |
| Characters, aliases, voices | Postgres (`characters`, `character_aliases`, `voices`) | — | Foreign keys, cascading deletes, and uniqueness constraints. |
| Jobs, PCM cache index | Postgres (`synthesis_jobs`, `segment_audio_cache`) | — | `SKIP LOCKED`, row locking, and LRU cache tracking. |
| Playback history / reading progress | **Postgres (`playback_history`)** | — | Atomic upserts via `UNIQUE(user_id, novel_id)`. `reading_progress` is an SQL compatibility view. |
| Opus/MP3 audio, covers | Swift (`novel-chapters`, `novel-covers`) | — | Binary objects streamed via Range proxy. |
| PCM cache files | Local volume on the worker host | — | Temporary synthesis cache; never in Swift. |

**Why MongoDB at all?**
1. The project requires both a relational and a document database.
2. A chapter is document-shaped: raw text plus an ordered array of segments, always read and written together.
3. Postgres JSONB could hold this too. We will **benchmark both** on one real chapter (fetch time, document size) and report the measured numbers in the academic evaluation.

---

## 4. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ NOVELS : "adds (1:N)"
    USERS ||--o{ SYNTHESIS_JOBS : "requests (1:N)"
    USERS ||--o{ PLAYBACK_HISTORY : "maintains (1:N)"

    NOVELS ||--o{ CHAPTERS : "contains (1:N)"
    NOVELS ||--o{ CHARACTERS : "defines cast (1:N)"
    NOVELS ||--o{ SYNTHESIS_JOBS : "profiled by (1:N)"
    NOVELS ||--o{ PLAYBACK_HISTORY : "tracks in (1:N)"

    CHARACTERS ||--o{ CHARACTER_ALIASES : "known as (1:N)"
    VOICES ||--o{ CHARACTERS : "assigned to (1:N)"

    CHAPTERS ||--o{ SYNTHESIS_JOBS : "synthesizes (1:N)"
    CHAPTERS ||--o{ PLAYBACK_HISTORY : "last chapter (1:N)"
    CHAPTERS ||..|| MONGO_CHAPTER_DOC : "content link [pg_chapter_id] (1:1)"

    USERS {
        uuid id PK "gen_random_uuid()"
        varchar username UK "Candidate Key 2"
        varchar email UK "Candidate Key 3"
        varchar password_hash "bcrypt / pgcrypto"
        varchar role "reader, writer, admin"
        timestamptz created_at
        timestamptz updated_at
    }

    VOICES {
        varchar id PK "e.g. en-GB-ThomasNeural, am_adam"
        varchar label "Human-readable voice name"
        varchar gender "male, female"
        varchar age_band "child, young, adult, elder"
        varchar language "en-us, en-gb"
        boolean reserved_narrator "true for default narrator"
        timestamptz created_at
    }

    NOVELS {
        uuid id PK "gen_random_uuid()"
        uuid added_by FK "references users(id)"
        varchar title "Novel title"
        text synopsis "Description / blurb"
        varchar channel "verified, community"
        varchar status "draft, profiling, published, archived"
        varchar global_tone "whimsical, dark, epic, etc."
        varchar portfolio_source "manual, ai"
        varchar cover_object "Swift object key"
        timestamptz created_at
        timestamptz updated_at
    }

    CHAPTERS {
        uuid id PK "gen_random_uuid()"
        uuid novel_id FK "references novels(id)"
        int chapter_number "Composite UK (novel_id, chapter_number)"
        varchar title "Chapter title"
        varchar status "draft, parsed, synthesizing, completed, outdated, failed"
        int audio_version "Monotonic audio version"
        varchar swift_audio_object "Path in Swift novel-chapters"
        int total_duration_ms "Authoritative audio duration"
        timestamptz created_at
        timestamptz updated_at
    }

    CHARACTERS {
        uuid id PK "gen_random_uuid()"
        uuid novel_id FK "references novels(id)"
        varchar canonical_name "Composite UK (novel_id, canonical_name)"
        varchar gender "male, female, unknown"
        varchar age_band "child, young, adult, elder"
        varchar temperament "Character personality"
        text sample_quote "Verbatim grounded quote"
        varchar voice_id FK "references voices(id)"
        real speed_multiplier "0.5 to 2.0"
        boolean is_narrator "Partial UK on novel_id WHERE is_narrator"
        boolean needs_review "Flagged for human inspection"
        varchar source "manual, ai"
        timestamptz created_at
        timestamptz updated_at
    }

    CHARACTER_ALIASES {
        uuid id PK "gen_random_uuid()"
        uuid novel_id FK "references novels(id)"
        uuid character_id FK "references characters(id)"
        varchar alias "Composite UK (novel_id, alias)"
    }

    SYNTHESIS_JOBS {
        uuid id PK "gen_random_uuid()"
        uuid novel_id FK "references novels(id)"
        uuid chapter_id FK "references chapters(id) [nullable]"
        uuid requested_by FK "references users(id) [nullable]"
        varchar job_type "profile_novel, synthesize_chapter"
        varchar status "queued, processing, completed, failed"
        real progress_pct "0.0 to 100.0"
        int attempts "Retry count"
        int max_attempts "Default: 3"
        timestamptz run_after "Exponential backoff timer"
        varchar worker_id "Active worker identifier"
        timestamptz locked_at "Heartbeat timestamp"
        text error_message "Failure diagnostics"
        timestamptz created_at
        timestamptz completed_at
    }

    SEGMENT_AUDIO_CACHE {
        varchar text_hash PK "SHA-256 text fingerprint"
        varchar voice_hash PK "Voice ID + speed multiplier hash"
        varchar local_pcm_path "File path to 24kHz raw PCM"
        int n_samples "Audio sample count"
        int sample_rate "Default: 24000 Hz"
        timestamptz last_used_at "LRU eviction index"
    }

    PLAYBACK_HISTORY {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "references users(id)"
        uuid novel_id FK "references novels(id)"
        uuid chapter_id FK "references chapters(id)"
        int segment_order "Last active segment sequence"
        int position_ms "Playback timestamp offset in ms"
        timestamptz updated_at "Atomic upsert timestamp"
    }

    MONGO_CHAPTER_DOC {
        ObjectId _id PK "MongoDB internal identifier"
        string pg_chapter_id UK "UUID foreign reference to chapters.id"
        string novel_id "Indexed foreign reference to novels.id"
        int chapter_number "Chapter index (1-based)"
        string title "Chapter title"
        string raw_text "Full, unparsed chapter prose"
        int audio_version "Monotonic audio version counter"
        array segments "Subdocuments: order, segment_id, type, character_id, speaker_name, voice_id, text, text_hash, voice_hash, confidence, source, needs_review, start_ms, end_ms"
        object manifest "total_duration_ms, audio_url, timeline[]"
    }
```

### Architectural Notes & Constraints
1. **Attribution Normalization**: `CHARACTER_ALIASES` maps "Harry", "Potter" and "Mr Potter" to one canonical character row. `UNIQUE(novel_id, alias)` guarantees an alias cannot point to multiple characters in the same novel.
2. **Nullable Job Foreign Keys**: `SYNTHESIS_JOBS` features `chapter_id` (nullable FK) enforced by `CHECK ((job_type = 'profile_novel' AND chapter_id IS NULL) OR (job_type = 'synthesize_chapter' AND chapter_id IS NOT NULL))`.
3. **Atomic Playback Upsert**: `PLAYBACK_HISTORY` maintains atomic user resume position with `UNIQUE(user_id, novel_id)`. The SQL view `reading_progress` is provided as an exact compatibility layer (`SELECT * FROM playback_history`).
4. **Voice Catalog Cleanliness**: `VOICES` matches `0001_initial_schema.sql` (no `engine` column in SQL schema; engine resolution is handled cleanly by voice ID prefix/catalog).
5. **Direct Reader Playback Optimization**: Mongo segments store **`voice_id` and `speaker_name` directly** alongside `character_id`, `start_ms`, and `end_ms`. This enables zero-join reader playback and instantaneous highlight synchronization on the client.
6. **Cross-Database Boundary**: The link between `CHAPTERS` and `MONGO_CHAPTER_DOC` is an application-level reference keyed by `pg_chapter_id` (UUID). No foreign keys cross the database boundary.
7. **LRU Audio Caching**: `SEGMENT_AUDIO_CACHE` is a standalone lookup table keyed by `(text_hash, voice_hash)`. `last_used_at` drives LRU cache cleanup on local disk.

---

## 5. Key Design Rules & Idempotency

### 5.1 Relational Constraints
- `UNIQUE(novel_id, chapter_number)` on chapters
- `UNIQUE(novel_id, canonical_name)` on characters
- `UNIQUE(novel_id, alias)` on character_aliases
- `UNIQUE(user_id, novel_id)` on playback_history (atomic upsert)
- Partial unique index: `CREATE UNIQUE INDEX ON characters(novel_id) WHERE is_narrator = true;`
- `voices.reserved_narrator`: the narrator voice is excluded from automatic character assignment
- MongoDB: unique index on `pg_chapter_id`, and compound index on `(novel_id, chapter_number)`

### 5.2 Cross-Database Write Order (Worker, per chapter)
A crash at any step leaves a state that a retry repairs, because each step is idempotent and PostgreSQL is written **last**:
1. Synthesize, then upload the Opus/MP3 file to Swift as `{novel_id}/{chapter_id}/v{audio_version+1}.opus`. This is a new object name, so it never overwrites audio currently being served.
2. **Upsert** the Mongo document keyed on `pg_chapter_id`: segments, timings, and `audio_version = n+1`.
3. In one PostgreSQL transaction: set `chapters.status = 'completed'`, update `swift_audio_object`, `total_duration_ms` and `audio_version = n+1`, and mark the job `completed`.

Readers only see the new audio once step 3 commits. If Mongo already holds `n+1` timings while Postgres still says `n`, the API serves the version Postgres names. Old Swift objects are swept during nightly garbage collection.

### 5.3 Compensating Rollback during Ingestion
During chapter creation (`POST /api/novels/:id/chapters`):
1. Express starts an explicit PostgreSQL transaction: `BEGIN`.
2. Inserts metadata into PostgreSQL `chapters`.
3. Creates the MongoDB document in `chapters` with `raw_text` and `pg_chapter_id`.
4. If either step fails or times out, Express issues `ROLLBACK` to PostgreSQL and calls `Chapter.deleteOne({ pg_chapter_id })` in MongoDB, preventing orphan records in both stores.

### 5.4 Job Queue & Reaper Semantics
- **Claim:** `SELECT ... FOR UPDATE SKIP LOCKED`, filtered by `status='queued' AND run_after <= now() AND attempts < max_attempts`.
- **Heartbeat:** the worker refreshes `locked_at` after every processed segment.
- **Reaper:** executed in a transactional cron:
  - Stale with `attempts >= max_attempts`: mark the job `failed` and its chapter `failed`.
  - Stale with attempts remaining: re-queue with `run_after = now() + 15s * 2^LEAST(attempts,4)` (30s, 60s, 120s, 240s).
- **Progress:** WebSocket / SSE broadcast pushes `synthesis_progress` events to connected frontend clients.

---

## 6. AI & NLP Attribution Pipeline

### 6.1 Character Discovery & Profiling Flow
```mermaid
flowchart TD
    A["Novel text (from Mongo raw_text, all chapters)"] --> B{"Fits model token budget?"}
    B -->|Yes| C["Send FULL text in one call"]
    B -->|No| D["Chunk by chapter groups"]
    D --> E["Per-chunk call: structured schema"]
    E --> F["Merge step: union candidates, merge aliases"]
    C --> G["Candidate pool"]
    F --> G
    H["Local candidates: spaCy PERSON + speech-tag regex (3+ mentions)"] --> G
    G --> V["Verification Filter (deterministic code, not LLM)"]
    V -->|Rejected| R["Dropped & logged"]
    V -->|Accepted| W["Voice selector: gender + age_band to VOICES row"]
    W --> P["Postgres: CHARACTERS + CHARACTER_ALIASES, novel.global_tone"]
```

### 6.2 Deterministic Verification Guard
| Check | Rule | On Failure |
|---|---|---|
| **Name Grounding** | `canonical_name` **or any alias** appears as a **whole word** (`\b{name}\b`) | Reject |
| **Quote Grounding** | `sample_quote` is **required**, and after normalising (NFKC, straight quotes, collapsed whitespace) it appears literally | Reject |
| **Gender Evidence** | Count pronouns in the sentence window after each mention, discounting "told her/him" object pronouns. Needs 3+ pronouns and 2:1 ratio. | Disagreement: use text evidence and flag `needs_review` |
| **Voice Selection** | Assigned deterministically by code from `VOICES` (matching gender, then age band, preferring unused voices). | Foreign-key safe by construction |

---

## 7. Hosting, Swift & Authentication

**Production:** **One VPS** running Docker Compose with 6 containers:
- `synctone-postgres` (PostgreSQL 16)
- `synctone-mongo` (MongoDB 7.0)
- `synctone-swift` (`bouncestorage/swift-aio` OpenStack Swift)
- `synctone-api` (Express.js Gateway)
- `synctone-worker` (Python 3.11 Daemon)
- `synctone-frontend` (React + Vite Web Client)

**Swift Object Storage Integration:**
- **Worker (Python, `python-swiftclient`)** uploads synthesized audio files directly.
- **Express (JavaScript)** reads from Swift with a **single in-flight token refresh mutex**. On `401 Unauthorized`, it re-authenticates and retries once.
- **Range Proxy (`GET /api/chapters/:id/audio` and `GET /api/stream/:chapter_id`)**:
  1. Validates `httpOnly` JWT cookie and checks user authorization.
  2. Resolves `swift_audio_object` from PostgreSQL.
  3. Validates and forwards HTTP `Range` headers, returning `206 Partial Content` with `Content-Range` or `416 Range Not Satisfiable`.

---

## 8. Data Flow Diagrams (DFDs)

### 8.1 Level 0 DFD (Context Diagram)

```mermaid
flowchart LR
    User(["👤 User / Evaluator\n(Reader / Writer / Admin)"])
    System["0.0 SyncTone Multi-Voice Synthesizer System"]

    User -->|"Novel Text Upload & Metadata"| System
    User -->|"Authentication & Credentials"| System
    User -->|"Character Voice Overrides"| System
    User -->|"Playback Seek & Progress Updates"| System

    System -->|"JWT Cookie & RBAC Claims"| User
    System -->|"Novel Library Catalog & Cast Roster"| User
    System -->|"RFC 7233 Range-Streamed Audio (206 Partial)"| User
    System -->|"60fps Highlight Timelines (JSON Manifest)"| User
    System -->|"Live Synthesis Progress (WebSocket / SSE)"| User
```

---

### 8.2 Level 1 DFD (Verified Subsystem Data Flow)

```mermaid
flowchart TD
    User(["👤 User / Reader / Admin"])

    %% Processes
    P1["1.0 Auth & Role Verification\n(Express + JWT + pgcrypto)"]
    P2["2.0 Polyglot Chapter Ingestion & Rollback\n(Express Ingestion Gateway)"]
    P3["3.0 Character Profiling & Verification\n(Grounded NLP & Regex Profiler)"]
    P4["4.0 Dialogue Parsing & Speaker Attribution\n(Regex Quote Engine + SpaCy nsubj)"]
    P5["5.0 Multi-Voice Synthesis & Cache Manager\n(Edge Neural TTS + Kokoro-82M Fallback)"]
    P6["6.0 Audio Stitcher & Manifest Publisher\n(audioStitcher.js / FFmpeg single-pass)"]
    P7["7.0 Range Audio Proxy & 60fps Sync\n(Express Proxy + React useAudioSync)"]
    P8["8.0 Playback Progress Atomic Upsert\n(Express History Controller)"]

    %% Data Stores
    D1[("D1: Users Store\n(PostgreSQL 16)")]
    D2[("D2: Novels & Chapters Meta Store\n(PostgreSQL 16)")]
    D3[("D3: Characters, Aliases & Voices\n(PostgreSQL 16)")]
    D4[("D4: Synthesis Jobs Queue\n(PostgreSQL SKIP LOCKED)")]
    D5[("D5: Chapter Docs & Timelines\n(MongoDB 7.0)")]
    D6[("D6: Audio & Covers Store\n(OpenStack Swift)")]
    D7[("D7: Segment Audio Cache\n(Postgres Index + Local PCM Volume)")]
    D8[("D8: Playback History\n(PostgreSQL 16)")]

    %% 1.0 Auth Flow
    User -->|"Credentials (username, password)"| P1
    P1 <-->|"Validate user & role"| D1
    P1 -->|"Set httpOnly JWT cookie"| User

    %% 2.0 Ingestion Flow
    User -->|"Upload novel prose & chapter text"| P2
    P2 -->|"Insert novel/chapter metadata"| D2
    P2 -->|"Write full raw_text doc"| D5
    P2 -.->|"Compensating rollback on error"| D2
    P2 -->|"Enqueue profile/synthesis job"| D4

    %% 3.0 Profiling Flow
    D4 -->|"Claim profile_novel job"| P3
    D5 -->|"Read raw novel text"| P3
    P3 -->|"Persist grounded characters & aliases"| D3
    P3 -->|"Update novel status & global_tone"| D2

    %% 4.0 Attribution Flow
    D4 -->|"Claim synthesize_chapter job"| P4
    D5 -->|"Read chapter raw_text"| P4
    D3 -->|"Read cast, aliases & assigned voices"| P4
    P4 -->|"Write segments[] with speaker_name & voice_id"| D5
    P4 -->|"Forward attributed segments"| P5

    %% 5.0 Synthesis & Caching
    D3 -->|"Fetch voice pitch, speed & parameters"| P5
    P5 <-->|"Check / store 24kHz PCM by hash"| D7
    P5 -->|"Synthesized audio buffers"| P6
    P5 -->|"Update job progress pct via WebSocket"| D4

    %% 6.0 Stitching & Publishing (Write Order: Swift -> Mongo -> Postgres)
    P6 -->|"1. Upload stitched audio blob"| D6
    P6 -->|"2. Upsert segment timings & manifest"| D5
    P6 -->|"3. Mark chapter completed & set duration"| D2
    P6 -->|"Mark job completed"| D4

    %% 7.0 Playback & 60fps Sync
    User -->|"Open chapter reader"| P7
    D2 -->|"Read chapter audio metadata"| P7
    D5 -->|"Fetch segments[] & timeline manifest"| P7
    D6 -->|"Stream audio via HTTP 206 Partial Content"| P7
    D8 -->|"Fetch last resume position"| P7
    P7 -->|"Synchronized audio stream + 60fps text highlights"| User

    %% 8.0 Progress Tracking
    User -->|"Audio seek / playback position tick"| P8
    P8 -->|"ON CONFLICT (user_id, novel_id) DO UPDATE"| D8
```

---

## 9. 4-Phase Implementation Schedule

| Sprint Phase | Focus Area & Milestone Tasks | Status |
|---|---|:---:|
| **Phase 1: Polyglot Infrastructure & Schema Authority** | • 6-Service Docker Compose setup (`synctone-postgres`, `synctone-mongo`, `synctone-swift`, `synctone-api`, `synctone-worker`, `synctone-frontend`).<br>• Alembic migration `0001_initial_schema.py` & standalone SQL `0001_initial_schema.sql` (9 tables in 3NF/BCNF).<br>• Voice catalog seeding (20 voices: 12 Kokoro + 8 Edge Neural).<br>• Mongoose `Chapter` document schema with unique `pg_chapter_id` link.<br>• Automated data engineering test suite (`npm run test:de`). | **`[DONE]`** |
| **Phase 2: Express Gateway & Multi-Voice Engine** | • Express.js REST API Gateway with `httpOnly` cookie JWT & RBAC.<br>• Polyglot chapter ingestion with compensating rollback.<br>• Dual-TTS multi-voice synthesis (Edge Neural primary + Kokoro-82M fallback).<br>• Audio stitcher (`audioStitcher.js`) with 250ms inter-speaker silence frames.<br>• Swift Range streaming proxy (`Range: bytes=`, 206 Partial Content, 401 token refresh).<br>• Deterministic quote parsing & speaker attribution (`textParser.js`, `attribution.js`).<br>• PostgreSQL `SKIP LOCKED` job queue broker & WebSocket progress broadcast. | **`[DONE]`** |
| **Phase 3: Frontend Novel Library & Synced Reader Polish** | • Responsive React 18 + Tailwind CSS 3 webnovel reader (WTR-Lab style).<br>• 60fps `useAudioSync` binary-search highlighting loop.<br>• Novel library catalog with Verified / Community channel tabs and cover art.<br>• Character Roster Drawer with sample quote preview & voice reassignments.<br>• Live WebSocket progress bars for queued synthesis jobs.<br>• Atomic playback history persistence (`POST /api/progress`). | **`[NEXT]`** |
| **Phase 4: End-to-End Testing & Assessment Defense** | • Full demo walkthroughs: *Harry Potter* (local cast) and *Sherlock Holmes* (Gutenberg).<br>• Zombie worker recovery testing with simulated worker crashes.<br>• MongoDB vs PostgreSQL JSONB read performance benchmark evaluation.<br>• Project report, architecture evidence artifacts, and viva presentation deck. | **`[UPCOMING]`** |
