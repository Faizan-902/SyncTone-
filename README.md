<div align="center">

# 🎙️ VoxNovel
### Automated Multi-Voice Audiobook Synthesis & Synchronized Web Reader

[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-red.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248.svg)](https://www.mongodb.com/)
[![OpenStack Swift](https://img.shields.io/badge/Storage-OpenStack%20Swift-EB1B24.svg)](https://wiki.openstack.org/wiki/Swift)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](https://react.dev/)

*An intelligent, multi-character digital library and neural audiobook synthesis platform that parses literary novels, extracts grounded character personas, synthesizes distinct neural character voices, and delivers 60fps synchronized text-audio reading.*

</div>

---

## 📖 Executive Summary & Motivation

Traditional digital audiobooks rely on single-narrator voice acting, which flattens multi-character dialogue into monotonous narration and lacks visual synchronization. Modern web novel readers (e.g., WTR-Lab, Webnovel) offer extensive text libraries but lack expressive, automated voice immersion. 

**VoxNovel** solves this problem by introducing an end-to-end, multi-agent audiobook generation pipeline paired with an interactive web reader. When a novel or chapter is ingested, VoxNovel strips web scraping artifacts using the client-side [`tts-dom-cleaner`](https://www.npmjs.com/package/tts-dom-cleaner) engine. The system then analyzes character interactions using deterministic grammatical dependency parsing (`nsubj` $\to$ speech verb) combined with a strictly grounded 3-stage Character Profiler. Unlike unconstrained LLM generators, VoxNovel enforces regex substring checks, pronoun distribution validation, and quote verification—guaranteeing **zero hallucinated character names**.

Dialogue and narration segments are synthesized in parallel using **Kokoro-ONNX** (82M parameters), stitched with sample-level accuracy (`round(cursor * 1000 / sample_rate)`) to prevent timing drift, and encoded into low-latency Opus audio streamed from **OpenStack Swift**. In the frontend, an optimized `requestAnimationFrame` loop synchronizes playback at 60fps, highlighting words and sentences in real time as each distinct character speaks.

---

## ✨ Core Features

- 🎭 **Automated Multi-Voice Synthesis**: Distinct neural voices assigned dynamically to dialogue lines and narrators based on character gender, age, and archetype.
- 🛡️ **Zero-Hallucination Character Profiling**: 3-stage candidate extraction combining SpaCy NER, whole-novel context analysis, and strict substring/pronoun grounding.
- 🎯 **Verbatim Recounted Dialogue Switching**: Seamless voice switches when narrators quote or recount a character's dialogue without modifying the original text.
- ⚡ **60fps Synchronized Highlighting**: Sub-millisecond text-audio tracking via continuous `requestAnimationFrame` polling of the audio clock.
- 📦 **Polyglot Database Architecture**: 
  - **PostgreSQL 16**: Relational core for users, auth (RBAC), novel metadata, character portfolios, and `FOR UPDATE SKIP LOCKED` task queues.
  - **MongoDB 7**: High-throughput document store for raw chapter texts, segmented dialogue arrays, and read-optimized timeline manifests.
  - **OpenStack Swift**: Distributed object storage for final `.opus` audio and novel cover art, accessed via an authenticated Express token proxy.
- 👥 **Role-Based Access Control (RBAC)**: Fine-grained permissions for **Readers** (browse, listen, bookmark), **Authors** (create novels, submit chapters), and **Admins** (moderation, catalog verification).
- 📚 **Verified vs. Community Channels**: Dedicated catalog sections for verified classics and user-submitted community web novels.
- 🧹 **Client-Side DOM Sanitization**: Pre-ingestion cleaning using `tts-dom-cleaner` to strip web ads, author notes, and ruby annotations.

---

## 🏗️ Polyglot Architecture & Data Flow

VoxNovel separates concerns across a high-concurrency API gateway, dedicated document/relational databases, an object storage cluster, and a decoupled CPU-efficient neural synthesis daemon.

```
┌────────────────────────────────────────────────────────────────────────┐
│                             USER BROWSER                               │
│  React 18 + Vite SPA | tts-dom-cleaner | 60fps requestAnimationFrame   │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │ Audio Stream (Range: bytes)    │ REST / Chapter Upload
                    │ SSE Progress Events            │ 
┌───────────────────┴────────────────────────────────▼───────────────────┐
│                     EXPRESS.JS API GATEWAY (Node.js/TS)                │
│  - JWT Auth & RBAC (Reader / Author / Admin)                           │
│  - Swift Streaming Proxy (Token Refresh & 206 Partial Content)         │
│  - SSE Synthesis Progress Broadcasts                                   │
└───────────────▲─────────────────────▲─────────────────────▲────────────┘
                │                     │                     │
                ▼                     ▼                     ▼
      ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
      │  PostgreSQL 16   │  │    MongoDB 7     │  │ OpenStack Swift  │
      │  - Users & Roles │  │  - Raw Chapters  │  │  - Final .opus   │
      │  - Characters    │  │  - Segments []   │  │  - Novel Covers  │
      │  - Task Queue    │  │  - Manifests     │  │  - Multi-tenant  │
      └────────▲─────────┘  └────────▲─────────┘  └────────▲─────────┘
               │ Claim Task          │ Read/Write          │ Upload
               │ (SKIP LOCKED)       │ Segments            │ .opus
┌──────────────┴─────────────────────┴─────────────────────┴────────────┐
│                    PYTHON TTS WORKER DAEMON (Python 3.11)              │
│  - SpaCy NER & Grounded Character Profiler (No Hallucinations)         │
│  - Grammatical Dependency Speaker Attribution                          │
│  - Kokoro-ONNX Neural TTS (82M params, CPU-optimized)                  │
│  - Zero-Drift Sample Accumulator & FFmpeg Single-Pass Opus Stitcher    │
└────────────────────────────────────────────────────────────────────────┘
```

### Architectural Storage Justification
| Storage Engine | Stored Entities | Justification |
|---|---|---|
| **PostgreSQL 16** | Users, RBAC, Novels, Characters, Aliases, Jobs Queue, Playback State | Enforces relational constraints (unique usernames, character ownership, narrator uniqueness), ACID transactions, and atomic job claims via `FOR UPDATE SKIP LOCKED`. |
| **MongoDB 7** | Chapter raw text, Segment arrays (text, timing, voice key), Timeline Manifests | Stores large, variable-length text corpora and nested segment timelines without relational joins; provides rapid sub-millisecond document retrieval for reader clients. |
| **OpenStack Swift** | Final stitched `.opus` audio objects, Novel cover images | Distributed, scalable object storage with multi-tenant isolation, eliminating local disk dependencies and supporting HTTP `Range` streaming. |

---

## 📂 Project Directory Structure

```text
Multi-voice-synthesizer/
├── LICENSE                        # VoxNovel Non-Commercial Source-Available License
├── README.md                      # Comprehensive project documentation
├── .gitignore                     # Production Git ignore rules
│
├── novel-audio-synthesizer/       # Core Application Stack
│   ├── backend/                   # Python TTS Worker & NLP Engine
│   │   ├── app/                   # Worker daemon, NLP attribution, Kokoro pipeline
│   │   ├── tests/                 # Unit & integration tests
│   │   └── requirements.txt       # Python dependencies (spaCy, kokoro-onnx, etc.)
│   │
│   ├── frontend/                  # React 18 + Vite + Tailwind CSS SPA
│   │   ├── src/                   # Reader UI, 60fps audio synchronization hooks
│   │   ├── package.json           # Frontend dependencies
│   │   └── vite.config.ts         # Vite build configuration
│   │
│   └── api/                       # Express.js (TypeScript) Backend API [In Progress]
│       ├── src/controllers/       # Auth, Novel, Chapter, Playback controllers
│       ├── src/services/          # Swift proxy, Postgres queue, Mongo models
│       └── package.json           # Express dependencies
│
└── scratch/                       # Test suites & verification scripts
    └── verify/
        ├── test_grounding.py      # Grounded character extraction verification
        └── test_audio_and_swift.py# Sample clock drift & Swift proxy tests
```

---

## 👥 2-Person Team Workload Division

This project is engineered as a collaborative 2-person Capstone effort with strict separation of concerns:

### 👤 Project Owner (Systems & Audio Architecture Lead)
- **NLP & Parsing Engine**: Quote extraction regex, SpaCy dependency parsing (`nsubj` $\to$ verb attribution), dialogue turn reconstruction.
- **Grounded Character Profiler**: 3-stage candidate extraction, pronoun verification, and whole-novel context aggregation.
- **Neural TTS Synthesis Daemon**: Kokoro-ONNX worker loop, ONNX Runtime CPU inference, model management.
- **Audio Stitching & Alignment**: Cumulative sample-accurate audio clock math (`round(cursor * 1000 / sample_rate)`), FFmpeg Opus pipeline.
- **Document & Object Integration**: MongoDB chapter/segment persistence and OpenStack Swift audio uploads.

### 👤 Project Partner (Full-Stack Web & Platform Lead)
- **Express.js API Gateway**: REST routing, JWT authentication, and Role-Based Access Control (Reader / Author / Admin).
- **Relational Data Layer**: PostgreSQL 16 schema definitions, migrations, and playback history upsert logic.
- **OpenStack Swift Streaming Proxy**: Express HTTP Range header streaming (`206 Partial Content`) with dynamic token refreshing.
- **Frontend Web Reader**: React 18 SPA, novel library catalog (Verified vs. Community), and author upload workflows.
- **Real-Time Playback Sync**: `requestAnimationFrame` audio clock polling for smooth 60fps text and line highlighting.

---

## 🚀 Fast-Track 20-Day Roadmap

| Sprint Phase | Timeline | Core Deliverables | Ownership |
|---|---|---|---|
| **Phase 1: Foundation & Schemas** | **Days 1 – 7** | PostgreSQL DDL & migrations; MongoDB schemas; Swift container setup; SpaCy & Kokoro worker scaffold; Docker Compose multi-service orchestrator. | Partner (API/DB) & Owner (Worker/Audio) |
| **Phase 2: Core Pipeline & Streaming** | **Days 8 – 14** | Grounded character profiling; dialogue attribution; Kokoro multi-voice batch synthesis; sample-accurate audio stitching; Swift proxy with Range streaming. | Owner (Audio/NLP) & Partner (Swift/Proxy) |
| **Phase 3: Reader UI & Verification** | **Days 15 – 20** | React 60fps synchronized reader; Verified/Community catalog; character voice override UI; end-to-end integration with demo novels (Harry Potter & web novels). | Partner (UI) & Owner (End-to-End Tests) |

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
- **Node.js** v20+ and **npm**
- **Python** 3.11+
- **Docker** & **Docker Compose**
- **FFmpeg** installed and accessible in `$PATH`

### 1. Clone the Repository
```bash
git clone https://github.com/NamahOmprakash/Multi-voice-synthesizer.git
cd Multi-voice-synthesizer
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```ini
# PostgreSQL
DATABASE_URL=postgresql://voxuser:voxpass@localhost:5432/voxnovel

# MongoDB
MONGO_URI=mongodb://localhost:27017/voxnovel

# OpenStack Swift
SWIFT_AUTH_URL=http://localhost:5000/v3
SWIFT_USERNAME=swift_user
SWIFT_PASSWORD=swift_secret
SWIFT_PROJECT_NAME=voxnovel_audio
SWIFT_CONTAINER_AUDIO=novel-chapters
SWIFT_CONTAINER_COVERS=novel-covers

# JWT & API Secrets
JWT_SECRET=super_secret_jwt_key_voxnovel_2026
PORT=4000
```

### 3. Install Dependencies
```bash
# Frontend
cd novel-audio-synthesizer/frontend
npm install

# Backend TTS Worker
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 4. Run Unit & Verification Tests
Verify character grounding and zero-drift audio sample math:
```bash
python3 scratch/verify/test_grounding.py
python3 scratch/verify/test_audio_and_swift.py
```

---

## 📜 Acknowledgements & Academic Citations

- **[`tts-dom-cleaner`](https://www.npmjs.com/package/tts-dom-cleaner)**: Client-side web novel DOM sanitization package authored by the project initiator.
- **[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)**: Ultra-efficient, high-fidelity neural text-to-speech model.
- **[SpaCy](https://spacy.io/)**: Industrial-strength Natural Language Processing in Python.
- **[OpenStack Swift](https://wiki.openstack.org/wiki/Swift)**: Distributed object storage system.

---

## ⚖️ License & Liability Disclaimer

This software is released under the **VoxNovel Non-Commercial Source-Available License**. 

> **NOTICE**: Commercial use, monetization, and commercial hosting are strictly prohibited without prior written permission. The Software is provided strictly for academic research and personal study.
> 
> **DISCLAIMER OF LIABILITY**: The author exercises no editorial control over user actions and is **not responsible or liable** for any content, text, or novel uploaded, processed, or synthesized using this software, nor for any copyright violations or legal disputes arising from user-supplied materials. See [LICENSE](LICENSE) for complete terms.
