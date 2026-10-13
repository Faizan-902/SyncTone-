### Why was the diagram orange and cluttered?

In Mermaid, putting nodes into two separate `subgraph` blocks causes the markdown renderer to paint large colored boxes behind them (many dark themes default to a bright orange/coral fill). More importantly, because the processes in the two boxes communicate back and forth, the layout engine was forced to draw **crisscrossing arrows through and over text**, creating an unreadable "spiderweb."

Below is the clean, professionally restructured set without chaotic overlapping lines, ready for your report and slides.

---

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ NOVELS : "owns"
    USERS ||--o{ SYNTHESIS_JOBS : "triggers"
    USERS ||--o{ PLAYBACK_HISTORY : "maintains"

    NOVELS ||--o{ CHAPTERS : "contains"
    NOVELS ||--o{ CHARACTERS : "defines"

    VOICES ||--o{ CHARACTERS : "assigned to"

    CHAPTERS ||--o{ SEGMENTS : "composed of"
    CHAPTERS ||--o{ SYNTHESIS_JOBS : "processed by"
    CHAPTERS ||--o{ PLAYBACK_HISTORY : "tracked in"

    CHARACTERS |o--o{ SEGMENTS : "speaks"
    SEGMENTS |o--o{ PLAYBACK_HISTORY : "last position"
    SEGMENTS }o..o| SEGMENT_AUDIO_CACHE : "hashes lookup"

    USERS {
        uuid id PK
        string username UK
        string email UK
        string password_hash
        timestamptz created_at
        timestamptz updated_at
    }
    VOICES {
        string id PK
        string engine
        string label
        string gender
        string language
        boolean is_narrator_compatible
    }
    NOVELS {
        uuid id PK
        uuid user_id FK
        string title
        string author
        text description
        timestamptz created_at
        timestamptz updated_at
    }
    CHARACTERS {
        uuid id PK
        uuid novel_id FK
        string name
        string gender
        string archetype
        string assigned_voice_id FK
        float speed_multiplier
        boolean is_narrator
        timestamptz created_at
    }
    CHAPTERS {
        uuid id PK
        uuid novel_id FK
        int chapter_number
        string title
        text raw_text
        enum status
        int total_duration_ms
        string audio_url
        jsonb manifest
        timestamptz created_at
        timestamptz updated_at
    }
    SEGMENTS {
        uuid id PK
        uuid chapter_id FK
        uuid character_id FK "nullable"
        int segment_order
        enum segment_type
        text text_content
        string text_hash
        string voice_hash
        float confidence_score
        enum attribution_source
        boolean needs_review
        int start_ms
        int end_ms
        timestamptz created_at
    }
    SEGMENT_AUDIO_CACHE {
        string text_hash PK
        string voice_hash PK
        string pcm_path
        int n_samples
        int sample_rate
        timestamptz created_at
    }
    SYNTHESIS_JOBS {
        uuid id PK
        uuid chapter_id FK
        uuid user_id FK
        enum job_type
        enum status
        float progress_pct
        int attempts
        int max_attempts
        timestamptz run_after
        string worker_id
        timestamptz locked_at
        text error_message
        timestamptz created_at
        timestamptz completed_at
    }
    PLAYBACK_HISTORY {
        uuid id PK
        uuid user_id FK
        uuid chapter_id FK
        uuid last_segment_id FK
        int last_timestamp_ms
        timestamptz updated_at
    }
```

### Key Database Constraints to Highlight:
* `UNIQUE(novel_id, chapter_number)` — Prevents duplicate chapter indices.
* `UNIQUE(chapter_id, segment_order)` — Guarantees deterministic, linear segment sequencing.
* `UNIQUE(novel_id, name)` — Prevents character name collisions within the same novel.
* `UNIQUE(user_id, chapter_id)` — Enables clean atomic upserts for playback history.
* `CREATE UNIQUE INDEX ON characters(novel_id) WHERE is_narrator;` — Enforces at most one narrator per novel.
* `SEGMENTS.start_ms / end_ms` is the **authoritative relational state**; `CHAPTERS.manifest` is a **derived JSONB read cache**.

---

## 2. Tech Stack & Database Architecture

| Layer | Technology | Role & Academic / Engineering Justification |
|---|---|---|
| **Frontend Framework** | **React 18 + Vite + JavaScript (JSX) + Tailwind CSS** | Fast reactive SPA. Uses a continuous `requestAnimationFrame` loop that polls the HTML `<audio>` clock for smooth 60fps text highlighting without UI stutter. |
| **Input Sanitization** | **`tts-dom-cleaner` (npm)** | Your published npm package. Runs client-side in the browser to strip ads, author notes, site navigation, and ruby tags from pasted web novels/EPUBs before upload. |
| **Backend API Framework**| **Express.js (JavaScript / Node.js 20+)** | High-concurrency async REST API Gateway for auth, chapter ingestion, OpenStack Swift range streaming, and WebSocket / SSE event streaming. |
| **Primary DBMS** | **PostgreSQL 16** | The core relational database (3NF). Also serves as the **task queue broker** using `FOR UPDATE SKIP LOCKED` (eliminating Redis/Celery) and broadcasts real-time progress via `pg_notify`. |
| **ORM & Migrations** | **SQLAlchemy 2.0 Async + Alembic** | Type-safe async queries using `asyncpg`; reproducible, version-controlled database migrations. |
| **Real-Time Stream** | **Server-Sent Events (SSE) & WebSocket** | Express holds persistent connections streaming synthesis progress events from PostgreSQL `pg_notify` / worker event bus. |
| **Background Worker** | **Python Daemon Process** | Decoupled worker container that claims jobs from PostgreSQL, runs NLP parsing, executes Kokoro-ONNX TTS, and stitches audio using FFmpeg. |
| **NLP & Parsing** | **Regex Engine + SpaCy (`en_core_web_sm`)** | Fast deterministic quote boundary extraction and grammatical dependency parsing (`nsubj` $\to$ speech verb) for reliable speaker attribution without LLM hallucinations. |
| **TTS & Audio Engine** | **Microsoft Edge Neural TTS (Primary) + Kokoro-ONNX (Fallback)** | Multi-speaker neural voice synthesis with authentic British voices (Harry, Hermione, Ron, Dumbledore, Snape) streamed via Edge WebSocket API (48kbps MP3), with Kokoro-82M offline daemon fallback. |
| **Storage & Deployment**| **Docker Compose (4 Containers) + Shared Volumes** | Multi-container stack (`frontend`, `api`, `worker`, `db`). Shared volumes store model weights, 16-bit PCM cache files, and final chapter `.opus` files. |

---

## 3. Data Flow Diagrams (DFDs)

### 3.1 Level 0 DFD (Context Diagram)
Defines the boundary between the external user and the system.

```mermaid
flowchart LR
    User(["👤 User / Evaluator"])
    System["0.0 Multi-Voice Novel Synthesizer System"]

    User -->|"Novel Text, Voice Preferences"| System
    User -->|"Seek Requests, Speaker Overrides"| System
    System -->|"Synchronized Opus Audio & Live Highlighting"| User
    System -->|"Synthesis Progress Events (SSE)"| User
```

---

### 3.2 Level 1 DFD (Clean, Linear Subsystem Flow)
*This layout flows cleanly top-to-bottom without crisscrossing lines or distracting orange background boxes. Ownership is clearly stated directly inside the process labels.*

```mermaid
flowchart TD
    User(["👤 User"])

    %% Processes
    P1["1.0 Auth & Chapter Ingestion\n(Partner)"]
    P2["2.0 Text Parsing & Tagging\n(Owner)"]
    P3["3.0 Dialogue Attribution\n(Owner)"]
    P4["4.0 Voice Profiling & Roster\n(Owner)"]
    P5["5.0 Synthesis & Cache Manager\n(Owner)"]
    P6["6.0 Timeline Manifest & Stitcher\n(Owner)"]
    P7["7.0 Playback Sync & SSE Stream\n(Partner)"]

    %% Data Stores
    D1[("D1: Users & Novels Store")]
    D2[("D2: Voices & Characters Store")]
    D3[("D3: Chapters & Segments Store")]
    D4[("D4: Synthesis Jobs Queue")]
    D5[("D5: Playback History Store")]
    D6[("D6: Audio Storage - Volume")]
    D7[("D7: Segment Audio Cache")]

    %% Ingestion Flow
    User -->|"Credentials & Novel Text"| P1
    P1 -->|"Persist User & Novel"| D1
    P1 -->|"Create Chapter (draft)"| D3
    P1 -->|"Enqueue Job (queued)"| D4

    %% Pipeline Execution Flow
    D4 -->|"Claim Job (SKIP LOCKED)"| P2
    D3 -->|"Read Raw Text"| P2
    P2 -->|"Segments & Tags"| D3
    P2 -->|"Ambiguous Lines"| P3
    P3 -->|"Attributed Speaker & needs_review"| D3

    %% Voice Setup & Synthesis
    D3 -->|"Read Segments"| P4
    D2 -->|"Read Voices"| P4
    P4 -->|"Assigned Voices & Speeds"| D2

    D3 -->|"Text & Hashes"| P5
    D2 -->|"Voice & Speed"| P5
    P5 <-->|"Lookup / Save 16-bit PCM"| D7
    P5 -->|"Segment PCM Buffers"| P6

    %% Audio Stitching & Output
    P6 -->|"Single-Pass Opus"| D6
    P6 -->|"start_ms, end_ms, manifest"| D3
    P6 -->|"Job Completed & NOTIFY"| D4

    %% Playback & Sync
    D4 -->|"Progress (LISTEN/NOTIFY)"| P7
    D3 -->|"Derived Manifest JSON"| P7
    D5 -->|"Resume Position"| P7
    D6 -->|"Stream Opus Audio"| P7
    P7 -->|"Synchronized Highlighting & Audio"| User

    User -->|"Seek / Playback Update"| P7
    P7 -->|"Upsert Last Position"| D5
```

---

### Summary of What This Fixes:
1. **No Orange Boxes**: Removed the competing `subgraph` blocks that triggered the aggressive theme background fills.
2. **Zero Spiderweb Routing**: Rearranged data stores ($D_1$ to $D_7$) and processes ($1.0$ to $7.0$) into an orderly downward flow.
3. **Explicit 2-Person Ownership**: Ownership is cleanly indicated directly inside each process box (`(Owner)` vs `(Partner)`).
4. **Presentation Ready**: Renders legibly in light mode, dark mode, Typora, GitHub, and thesis export tools.