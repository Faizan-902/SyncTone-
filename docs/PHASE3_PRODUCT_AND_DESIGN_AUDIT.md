# SyncTone — Phase 3 Product & Design Audit

> **Document Status**: Canonical Project & Design Audit  
> **Repository Source**: `NamahOmprakash/synctone-private-docs`  
> **Source Default Branch**: `main`  
> **Retrieved Commit SHA**: `9977c807b7328ad524ac8934b05fbdb17320ee2f`  
> **Commit Author & Timestamp**: `NamahOmprakash` on `2026-10-21T11:44:03Z`  
> **Key Blob References**:  
> - `demo/index.html` — Blob SHA: `c189b6fe90b07664c59494313ac5f6cd07bc667e` (60,708 bytes)  
> - `FRONTEND_REDESIGN_PLAN.md` — Blob SHA: `91349651709ae7d43d088db3131ad149a0327572` (15,813 bytes)  
> - `PARTNER_AGENT.md` — Blob SHA: `b95895d10db898ecb7f250c028c4215c4b1fd275` (11,678 bytes)  
> - `PARTNER_MEMORY.md` — Blob SHA: `d507d3cb521f39189166f9dc6b277fcb49f2c874` (37,671 bytes)  
> **Local Read-Only Reference**: `.synctone_private_ref/index.html` (outside application source directory, excluded in `.git/info/exclude`)

---

## 1. Executive Summary & Product Vision

SyncTone is an **automated multi-voice webnovel library and neural audiobook synthesis platform** with real-time 60fps synchronized text highlighting. 

While the initial Phase 3 implementation verified the core data-flow contracts (Express REST API, Mongoose schemas, 60fps binary-search timeline sync, and Vitest test suites), the presentation resembled an internal administrative dashboard (`references/02_current_localhost_5173.png`).

Namah's private documentation specifies elevating SyncTone into an **OTT-grade (Over-The-Top) Webnovel & Neural Audiobook Experience** inspired by:
- **Netflix & JioHotstar**: Cinematic billboard hero, "Top 10 Synthesized Today" outline typography, expandable hover preview cards, and micro-rail navigation.
- **Apple Books & WeLib**: Distraction-free typography, tri-theme engine (Dark Slate OLED, Warm Sepia Paper, Editorial Light), and continuous audio clock synchronization.
- **Unity Hub**: 50/50 split authentication with a clean credentials form on the left and an ambient dark fantasy audiobook showcase on the right.

---

## 2. Target Audience & Core Use Cases

1. **The Immersive Reader (Consumer)**:
   - Discovers webnovels and literary classics through a rich visual catalog.
   - Listens to authentic, multi-voice character acting (differentiating narrator, male/female dialogues, age brackets) rather than monotone single-speaker TTS.
   - Reads along with zero-jitter, 60fps highlighted dialogue turns with auto-scroll.
   - Resumes seamlessly across reading sessions using 4NF-backed bookmarks (`playback_history` and `playback_positions`).
2. **The Author / Webnovel Creator (Writer/Admin)**:
   - Ingests raw chapter prose through the authoring interface.
   - Reviews automatic SpaCy character attribution and voice assignments.
   - Customizes cast assignments via the Character Roster drawer with real-time Kokoro/Edge Neural voice previews.
   - Monitors live background synthesis progress over WebSocket `/api/ws/progress/:chapter_id`.

---

## 3. Expected Pages & Navigation Architecture

| Page / View | Layout Blueprint | Key Interactive Components |
| :--- | :--- | :--- |
| **Global App Shell** | Fixed left micro-navigation rail (`w-16 sm:w-20`) + top glassmorphic search header | Sidebar nav icons (Home, Search, Details, Reader, Profile), theme switcher, search modal |
| **Split Auth Modal / Page** | 50/50 Desktop split (Unity Hub style) | Left: Clean auth form, role selector (`Reader` vs `Writer`), One-Click Guest access. Right: Ambient dark radial book showcase with live audio badge |
| **OTT Home & Catalog** | Cinematic Billboard + Carousel Rows | - **Hero Billboard**: Panoramic backdrop, verified badge, quick-play CTA, and info CTA.<br>- **Top 10 Carousel**: Styled outline numbers (`1`–`10`) overlapping vertical 2:3 posters.<br>- **Hover Preview Cards**: 200ms ease, expands $1.16\times$ revealing match %, synopsis snippet, voice chips, quick play, and details. |
| **Cinematic Novel Details** | The Mentalist-style 2-column portfolio | - **Backdrop Banner**: Blurred backdrop derived from book cover tones.<br>- **Metadata Ribbon**: 98% Voice Match, 2026, Dual-TTS 4NF, Star Rating.<br>- **Left Column**: Complete novel synopsis.<br>- **Right Column**: Cast & Genre credits box.<br>- **Chapter Directory**: Numbered episode rows with durations and play triggers. |
| **60fps Synced Reader** | Reading-first layout with docked player | - **Header Bar**: Chapter navigation, typography controls (Inter Sans vs Merriweather Serif, `A-`/`A+` font size, reading width).<br>- **Prose Article**: Ambient cards with subtle glowing borders for active turn; distinct speaker identity tags.<br>- **Floating Audio Dock**: Glassmorphism dock with waveform scrubber, time codes, play/pause, prev/next turn, and playback speed cycle (0.75x–2.0x). |
| **Authoring Modals** | Modal dialogs for Writers/Admins | Add Novel modal, Upload Chapter modal with real-time synthesis progress bar |
| **Character Roster Drawer** | Slide-out side drawer | Aggregated character dialogue counts, sample quotes, and voice override dropdowns |

---

## 4. Brand Identity & Design System Tokens

From `demo/index.html` and `FRONTEND_REDESIGN_PLAN.md`, the design tokens are established as CSS custom variables to guarantee contrast across all three themes:

### Color System (Tri-Theme Engine)
```css
/* Dark Slate OLED (Default) */
--bg-page: #0B0F17;
--bg-surface: #131926;
--bg-card: #182232;
--bg-hover: #222F46;
--text-main: #F8FAFC;
--text-sub: #CBD5E1;
--text-muted: #94A3B8;
--border-subtle: rgba(255, 255, 255, 0.08);
--glass-bg: rgba(11, 15, 23, 0.82);
--glass-dock: rgba(15, 23, 42, 0.88);
--top10-fill: #0B0F17;
--top10-stroke: #64748B;

/* Warm Sepia Paper (Long-Form Reading) */
--bg-page: #FBF0D9;
--bg-surface: #F4E4C1;
--bg-card: #EAD8B0;
--bg-hover: #DFCC9F;
--text-main: #2C2216;
--text-sub: #4A3B2C;
--text-muted: #7A6B56;
--border-subtle: rgba(44, 34, 22, 0.14);
--top10-fill: #FBF0D9;
--top10-stroke: #B45309;

/* Editorial Light (Clean Daylight) */
--bg-page: #F8FAFC;
--bg-surface: #FFFFFF;
--bg-card: #F1F5F9;
--bg-hover: #E2E8F0;
--text-main: #0F172A;
--text-sub: #334155;
--text-muted: #64748B;
--border-subtle: rgba(15, 23, 42, 0.08);
--top10-fill: #F8FAFC;
--top10-stroke: #475569;
```

### Typography Hierarchy
- **Display Headlines**: `Montserrat`, sans-serif (Weights: 700, 800, 900) — used for brand logo, Top 10 numbers, billboard titles, section headers.
- **Prose & Reading**: `Merriweather`, serif (Weights: 300, 400, 700, Italic) — used for dialogue text, novel synopses, and literary reading view.
- **UI & Controls**: `Inter`, sans-serif (Weights: 400, 500, 600, 700) — used for navigation, metadata badges, buttons, form controls, and timecodes.

---

## 5. Critical Visual Bug Fixes Implemented in Prototype

The private documentation documents five specific visual fixes in `demo/index.html` that must be preserved:

1. **Top 10 Number Overlap Isolation (Fix 1)**:
   - Outer container uses `pl-10 sm:pl-14 relative`.
   - The outline SVG number glyph sits at `absolute left-0 bottom-0 text-8xl sm:text-9xl z-0`, while the 2:3 book card sits at `z-10` with title container pinned inside with `backdrop-blur-md` and `bg-black/75`. Book titles never collide with number glyphs.
2. **Bulletproof CSS Variable Theming (Fix 2)**:
   - Eliminates hardcoded `text-white` or `bg-slate-900` utility classes, using `--bg-page`, `--bg-surface`, `--bg-card`, `--text-main`, etc.
3. **Netflix Quick-Preview Hover Popovers (Fix 3)**:
   - Hover reveals `.preview-card-popover` (200ms easing, $1.16\times$ scale, `z-50`) displaying match score, synopsis teaser, voice cast chips, quick-play, and info actions.
4. **Two-Column Metadata for Novel Details (Fix 4 — The Mentalist Style)**:
   - Left 2 columns host the full narrative synopsis; Right column hosts a dedicated credits panel (`Character Voices` and `Genres / Tags`).
5. **Minimal Authentication (Fix 5 — Unity Hub Style)**:
   - 50/50 split with streamlined login, guest bypass, and high-impact right artwork showcase.

---

## 6. Architectural & Security Constraints to Preserve

1. **Strict 4NF Relational Integrity & Polyglot Database**:
   - PostgreSQL 16 schema with 12 tables and Alembic migrations.
   - Reading progress writes must use `playback_history` and `playback_positions` (or `v_playback_history` view).
   - Chapter segments and timing manifests live in MongoDB Mongoose `Chapter` model.
2. **RBAC & Security**:
   - Public registration defaults to `reader` and strictly forbids self-assigning `admin` (403 Forbidden).
   - Voice assignment (`POST /api/voices/assign`) strictly requires authenticated writer/admin.
   - Chapter uploads and novel creation require writer/admin privileges.
3. **Voice Engine Integration**:
   - 20 pre-seeded voices (8 Microsoft Edge Neural British cast + 12 Kokoro-82M fallbacks).
4. **Existing Test Suites**:
   - Frontend Vitest suite (`npm test`) must pass 100%.
   - Backend `npm test` and `npm run test:de` must pass 100%.
   - Production Vite bundle (`npm run build`) must compile cleanly.
