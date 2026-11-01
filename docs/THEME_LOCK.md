# SyncTone Theme Lock & Visual Identity Specification

**Status**: STRICTLY LOCKED  
**Approved Palette**: Option B (Modern OKLCH Orange within Atelier Obsidian & Editorial Light)  
**Selection Origin**: The orange accent palette restores the project's pre-Cinnabar visual soul predating commits `d4c4f48` and `1879dd7`. The specific color coordinates were engineered, contrast-tested, and selected through the Step B1/B2 preview process: **Candidate D1** (`oklch(0.72 0.200 55)` with dark on-accent text `oklch(0.12 0.010 260)`) for Dark Mode and **Candidate L2** (`oklch(0.52 0.170 48)` with white on-accent text `#ffffff`) for Light Mode.  
**Pre-Commit Gate**: `npm run theme:check` (Vitest Token Snapshot + Playwright E2E Zero-Color-Delta Suite + Honest Pixel Proof)  
**Accessibility Audit Policy**: Axe-core `color-contrast` is **WARNING-ONLY, NEVER DISABLED**. Violations are recorded to `docs/contrast-known-issues.md` and reported; colors are never edited to satisfy Axe without explicit written approval.

---

## 1. Absolute Invariance Policy

1. **Strictly Immutable Visual Palette**:
   - Visual Identity: **Atelier Obsidian** (Dark) & **Editorial Light** (Cold-Press Vellum).
   - Living Accent: **Vivid Tangerine Orange** (`oklch(0.72 0.200 55)`) in Dark Mode and **Deep Amber Orange** (`oklch(0.52 0.170 48)`) in Light Mode.
   - On-Accent Text: Dark Text (`oklch(0.12 0.010 260)`) on Dark Mode Accent; White Text (`oklch(1.00 0.000 0)`) on Light Mode Accent.
   - **NO color, token, shadow color, opacity, gradient, copy, or geometry value may change anywhere, for any reason (including accessibility contrast), without written user approval.**
2. **Accessibility (a11y) Contrast Rule**:
   - Axe-core `color-contrast` audits are strictly configured as **warning-only** and must never be disabled.
   - All accent-filled surfaces implement `var(--on-accent)`, achieving **7.73:1 AAA contrast** in Dark Mode and **4.58:1 AA contrast** in Light Mode (0 accent contrast violations remain).
   - Independent elements (`amber-400`, `emerald-400`, reader yellow highlight) remain preserved per brand specification; known low ratios are cataloged in `docs/contrast-known-issues.md`.
3. **Independent Elements (Strictly Unchanged)**:
   The following features are independent of the theme accent and must never be modified during theme or token work:
   - **Reader yellow highlights** (`bg-yellow-300/30`, `bg-yellow-300/35`, `#fef08a`)
   - **Book cover spine and curl shadows**
   - **Cover style presets** (`COVER_STYLES` in `NovelCover.jsx`: emerald, amber, sky, purple, rose, indigo)
   - **"3D" and "Voice TTS" badge pills** in Novel Details and Reader
   - **Status tokens** (`--color-status-success`, `--color-status-warning`, `--color-status-danger`, `--color-status-info`)
   - **Audio Scrubber secondary gradient stop** (`to-indigo-400`)
4. **Continuous Verification**:
   - Any commit modifying theme tokens, colors, or visual aesthetics must pass `npm run theme:check`.

---

## 2. Locked Token Specification

### Dark Mode (`:root, html.dark`) — Atelier Obsidian
```css
:root, html.dark {
  --bg-page: oklch(0.13 0.006 260);
  --bg-surface: oklch(0.16 0.008 260);
  --bg-card: oklch(0.19 0.010 260);
  --bg-hover: oklch(0.23 0.012 260);
  --bg-elevated: oklch(0.21 0.010 260);

  --text-main: oklch(0.96 0.005 260);
  --text-sub: oklch(0.85 0.008 260);
  --text-muted: oklch(0.74 0.010 260);

  /* Living Accent: Vivid Tangerine Orange (Candidate D1) */
  --accent: oklch(0.72 0.200 55);
  --accent-hover: oklch(0.76 0.190 58);
  --accent-surface: rgba(255, 121, 0, 0.12);
  --on-accent: oklch(0.12 0.010 260);

  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.20);
  --border-focus: oklch(0.72 0.200 55);

  --speaker-narrator: oklch(0.85 0.008 260);
  --speaker-a: oklch(0.72 0.200 55);
  --speaker-b: oklch(0.77 0.140 155);
  --speaker-c: oklch(0.76 0.140 235);
  --speaker-d: oklch(0.76 0.150 320);

  --top10-fill: oklch(0.13 0.006 260);
  --top10-stroke: rgba(255, 255, 255, 0.24);
  --top10-active: oklch(0.72 0.200 55);

  --card-accent: oklch(0.72 0.200 55);
}
```

### Light Mode (`html.light`) — Editorial Light
```css
html.light {
  --bg-page: oklch(0.985 0.003 240);
  --bg-surface: oklch(1.000 0.000 0);
  --bg-card: oklch(0.955 0.005 240);
  --bg-hover: oklch(0.925 0.008 240);
  --bg-elevated: oklch(1.000 0.000 0);

  --text-main: oklch(0.16 0.010 260);
  --text-sub: oklch(0.29 0.012 260);
  --text-muted: oklch(0.43 0.015 260);

  /* Living Accent: Deep Amber Orange (Candidate L2) */
  --accent: oklch(0.52 0.170 48);
  --accent-hover: oklch(0.46 0.170 46);
  --accent-surface: rgba(178, 62, 0, 0.10);
  --on-accent: oklch(1.00 0.000 0);

  --border-subtle: rgba(20, 25, 35, 0.08);
  --border-strong: rgba(20, 25, 35, 0.20);
  --border-focus: oklch(0.52 0.170 48);

  --speaker-narrator: oklch(0.20 0.010 260);
  --speaker-a: oklch(0.46 0.170 46);
  --speaker-b: oklch(0.38 0.120 155);
  --speaker-c: oklch(0.38 0.130 240);
  --speaker-d: oklch(0.40 0.160 330);

  --top10-fill: oklch(0.985 0.003 240);
  --top10-stroke: rgba(20, 25, 35, 0.26);
  --top10-active: oklch(0.52 0.170 48);

  --card-accent: oklch(0.52 0.170 48);
}
```

### Brand Immutable Accents (`tailwind.config.js`)
- `gold`: `#E5A93C`
- `crimson`: `#E50914`
- `cyan`: `#06B6D4`
- `indigo`: `#6366F1`
- `violet`: `#8B5CF6`

---

## 3. Leak Audit Results

Comprehensive regex search across `src`, `public`, `index.html`, `tailwind.config.js`, `manifest.webmanifest`, SVGs, and `accentClamp.js` for Cinnabar vermilion patterns (`224, 83, 60`, `200, 61, 39`, `#e0533c`, `#c83d27`, `oklch(... 36)`, `oklch(... 34)`):
- **Production Code Leak Count**: **0 hits**
- **Fallback Functions (`accentClamp.js`)**: Updated to approved orange bounds.
- **Lock Coverage**: Dynamically validates all 74 Dark custom properties and all 38 Light custom properties, with strict negative assertion against Cinnabar values in Vitest.

---

## 4. Honest Pixel Proof & Regression Bounds

The complete frontend build was verified against the pre-accent commit `bf12495` (with identical orange overrides injected) using `scripts/verify-honest-pixel-proof.mjs`.

- **Total Configurations Tested**: **40** (10 screens × 2 themes × 2 viewports: `1440x900` and `1190x770`).
- **Outside-Accent Drift**: **EXACTLY 0 px across all 40 configurations**.
- **Inside-Accent Drift**: Confined strictly to subpixel anti-aliasing along vector curves and border radiuses.

| Screen | Theme | 1440x900 Outside Accent | 1190x770 Outside Accent | Status |
| :--- | :--- | :--- | :--- | :--- |
| Home | Dark & Light | 0 px | 0 px | PASS |
| Novel Detail | Dark & Light | 0 px | 0 px | PASS |
| Reader Normal | Dark & Light | 0 px | 0 px | PASS |
| Reader 3D | Dark & Light | 0 px | 0 px | PASS |
| Settings Modal | Dark & Light | 0 px | 0 px | PASS |
| Auth Modal | Dark & Light | 0 px | 0 px | PASS |
| Add Novel Modal | Dark & Light | 0 px | 0 px | PASS |
| Upload Chapter Modal | Dark & Light | 0 px | 0 px | PASS |
| Cast Roster | Dark & Light | 0 px | 0 px | PASS |
| Profile | Dark & Light | 0 px | 0 px | PASS |

---

## 5. Verification Commands

To verify the theme lock locally or in CI:

```bash
# In novel-audio-synthesizer/frontend
npm run theme:check

# Run honest pixel proof across 40 configurations
node scripts/verify-honest-pixel-proof.mjs
```
