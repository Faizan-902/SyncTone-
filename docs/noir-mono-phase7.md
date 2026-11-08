# Phase 7: Reader Surface & Docked Bottom Audio Bar

**Project**: SyncTone — Noir Monochrome Redesign (Full Visual & UX Overhaul per Section 9 Concept Parity)  
**Phase**: Phase 7 of 10  
**Precedence**: Supersedes `docs/noir-yellow-spec.md` (withdrawn), `docs/editorial-orange-spec.md`, and `THEME_LOCK` v1.  
**Status**: **COMPLETE & VERIFIED**. All 19 test suites (136/136 tests) pass green. Cold-load JS bundle is 26.69 kB gzip (well below the 75 kB budget).

---

## 1. Executive Summary & Deliverables

Phase 7 implements the **Noir Monochrome Reading Surface** (Screen 3) and **Docked Bottom Audio Bar** (Screen 4), matching the approved Phase 2 contact sheets and specifications in `docs/design-preview/reader.html` and `docs/design-preview/audio-player.html`:

### Key Deliverables:

1. **Docked Bottom Audio Bar (`AudioPlayer.jsx`, `index.css`)**:
   - Pinned to base of viewport with exact 72px height (`--dock-safe-bottom: 72px;`), solid opaque `--bg-bar` (`#141416` in dark, `#F7F7F8` in light), and 1px hairline top boundary (`--border-subtle`).
   - Completely eliminated legacy glassmorphism blur and rounded pill docks.
   - Left Zone (Track Info):
     - 48×48px sharp jacket (`rounded-[1px] border border-[var(--border-subtle)] bg-[var(--bg-card)]`).
     - Real-time timecode readout (`text-[10px] font-mono text-[var(--text-muted)] tabular-nums`).
     - Chapter title and author/narrator attribution in clean neutral hierarchy.
   - Center Zone (Transport & Scrubber):
     - Boxed 1px buttons (`[◀◀ 10s]`, inverted primary `[▶ PLAY]` / `[⏸ PAUSE]`, `[10s ▶▶]`).
     - Scrubber track bar with zero layout shift, real-time hover timecode badge, and neutral high-contrast played fill (`bg-[var(--text-main)]`).
   - Right Zone (Audio Status & Controls):
     - Single micro signal dot (`--signal: #FF5A1F` / `#F05010`, $\le 8\text{px}$) active **strictly** when playing or live TTS synthesizing.
     - `FOLLOW ALONG` status indicator.
     - Multi-engine selector dropdown with sharp 1px monochrome border (`Select TTS Engine`).
     - Playback Engine mode toggle (`VOICE TTS` / `STUDIO`).
     - Speed button (`1.0×` boxed mono).
     - Volume control with sharp monochrome popup slider.

2. **Reader Surface (`ReaderView.jsx`, `OpenGLPageReader.jsx`, `PageNavButtons.jsx`, `SpineShadowCanvas.jsx`)**:
   - Flat calm neutral reading stage (no decorative gradients).
   - Preserved **BOTH** modes (Section 9.7):
     - Mode 1: Normal continuous vertical scroll with 60–75ch measure (`max-w-3xl`), Newsreader serif / Inter sans, and high-contrast dialogue highlights.
     - Mode 2: Moon+ Reader Pro 3D two-page spread with page curl engine and spine shadow lighting.
   - Reader Sticky/Floating Toolbar:
     - Back navigation button (`[← Back]`).
     - Chapter selector with sharp boxed previous/next chevron buttons (`[‹]` and `[›]`).
     - Mode switcher (`[NORMAL]` / `[OPENGL 3D]`).
     - Font family switch (`[SERIF]` / `[SANS]`) and font size adjuster (`[A-]` `{fontSize}px` `[A+]`).
     - TTS Clean sanitizer toggle (`[TTS CLEAN]` with `data-testid="reader-tts-sanitizer-toggle"`).
     - Focus mode toggle (`[FOCUS]` / `[EXIT FOCUS]`) with distraction-free spotlight reading.
     - Fullscreen toggle button.
   - Active Dialogue / Narration Highlighting:
     - Neutral high-contrast spoken segment background (`bg-[var(--accent-surface)] border-l-2 border-[var(--text-main)]`).
     - Active equalizer/playing indicator with micro signal dot (`Playing` / `Paused`).
     - Eliminated all legacy warm amber/yellow fills from chrome and text highlights while preserving test contracts.
   - Floating 'Return to Now' button:
     - Inverted sharp boxed CTA (`boxed-btn-primary`) anchored when user scrolls away from active spoken segment.
   - Reading Experience Choice Modal:
     - Monolithic sharp dialog (`rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-strong)]`) with boxed selection cards.

---

## 2. Verification Checklist & Gate Results

| Verification Item | Target Standard | Status | Measured Result |
| :--- | :--- | :--- | :--- |
| **Vitest Test Suite** | 19 test suites passing | **PASS** | 19/19 suites, 136/136 tests passing |
| **Vite Production Build** | Clean production build | **PASS** | Built in 3.45s |
| **Cold-load JS Budget** | $\le 75\text{ kB}$ gzip | **PASS** | 26.69 kB gzip |
| **Audio Bar Height** | Exact 72px (`--dock-safe-bottom`) | **PASS** | Verified 72px pinned bottom bar |
| **Monochrome Chrome** | Neutral greys only, zero chromatic fills | **PASS** | 100% compliant |
| **Micro Signal Dot** | $\le 8\text{px}$, playing/live only | **PASS** | Verified active only when playing |
| **Dual Reader Modes** | Both Normal and 3D OpenGL spread intact | **PASS** | Verified dual modes with fit engine |
