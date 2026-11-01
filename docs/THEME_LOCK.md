# SyncTone Theme Lock & Visual Identity Specification

**Status**: STRICTLY LOCKED  
**Approved Palette**: Option B (OKLCH Orange in Atelier Obsidian)  
**Historical Origin**: Archaeological restoration of pre-Cinnabar orange palette (predating `d4c4f48` / `1879dd7`, originating in the `556d693` Amber-Gold era), modernized into Atelier Obsidian via Step B1/B2 approval.  
**Pre-Commit Gate**: `npm run theme:check` (Vitest Token Snapshot + Playwright E2E Zero-Color-Delta Suite)  
**Accessibility Audit Policy**: Axe-core `color-contrast` is **WARNING-ONLY, NEVER DISABLED**. Violations are recorded to `docs/contrast-known-issues.md` and reported; colors are never edited to satisfy Axe without written approval.

---

## 1. Absolute Invariance Policy

1. **Strictly Immutable Visual Palette**:
   - Visual Identity: **Atelier Obsidian** (Dark) & **Editorial Light** (Cold-Press Vellum).
   - Living Accent: **Vivid Tangerine Orange** (`oklch(0.72 0.200 55)`) in Dark Mode and **Deep Amber Orange** (`oklch(0.52 0.170 48)`) in Light Mode.
   - **NO color, token, shadow color, opacity, gradient, copy, or geometry value may change anywhere, for any reason (including accessibility contrast), without written user approval.**
2. **Accessibility (a11y) Contrast Rule**:
   - Axe-core `color-contrast` audits are strictly configured as **warning-only** and must never be disabled.
   - When an audit identifies a low contrast ratio, it is logged to `docs/contrast-known-issues.md` with its element snippet, selector, foreground, background, and ratio.
   - Under no circumstances may an agent or developer modify color tokens or component styles to silence an accessibility warning without explicit written authorization.
3. **Independent Elements (Strictly Unchanged)**:
   The following features are independent of the theme accent and must never be modified during theme or token work:
   - **Reader yellow highlights** (`bg-yellow-300/30`, `bg-yellow-300/35`)
   - **Book cover spine and curl shadows**
   - **Cover style presets** (`COVER_STYLES` in `NovelCover.jsx`: emerald, amber, sky, purple, rose, indigo)
   - **"3D" and "Voice TTS" badge pills** in Novel Details and Reader
   - **Status tokens** (`--success`, `--warning`, `--danger`, `--info`)
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

  /* Living Accent: Vivid Tangerine Orange (D1) */
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

  /* Living Accent: Deep Amber Orange (L2) */
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

## 3. Visual Regression Baselines & Tolerances

Playwright baseline screenshots are stored in `docs/screenshots/theme-regression/ref/`. For each of the screens across Light and Dark themes, tests enforce:
1. **Zero Color Delta**: Exact normalized match on all CSS variables and computed background/text/border colors.
2. **Bounded Geometry Delta**: Strict pixel diff bounds ensuring layout stability.

| Screen | Theme | Reference Diff Bounds | Documented Reason |
| :--- | :--- | :--- | :--- |
| `home-dark` | Dark | $\le 8.5\%$ | 2:3 book cover aspect ratio + Header theme toggle |
| `home-light` | Light | $\le 10.5\%$ | 2:3 book cover aspect ratio + Header theme toggle |
| `novel-detail-dark` | Dark | $\le 5.5\%$ | 2:3 book cover aspect ratio |
| `novel-detail-light` | Light | $\le 6.5\%$ | 2:3 book cover aspect ratio |
| `reader-normal-dark` | Dark | $\le 5.0\%$ | "3D" toolbar label + Header theme toggle |
| `reader-normal-light`| Light | $\le 5.0\%$ | "3D" toolbar label + Header theme toggle |
| `reader-3d-dark` | Dark | $\le 5.0\%$ | "3D" toolbar label + Header theme toggle |
| `reader-3d-light` | Light | $\le 5.0\%$ | "3D" toolbar label + Header theme toggle |
| `settings-dark` | Dark | $\le 8.5\%$ | Plain friendly copy rewrites + modal overlay |
| `settings-light` | Light | $\le 11.5\%$ | Plain friendly copy rewrites + modal overlay |
| `auth-dark` | Dark | $\le 5.0\%$ | Header theme toggle + catalog geometry behind modal |
| `auth-light` | Light | $\le 16.5\%$ | Header theme toggle + catalog geometry behind modal |
| `add-novel-dark` | Dark | $\le 8.5\%$ | Header theme toggle + catalog geometry behind modal |
| `add-novel-light` | Light | $\le 16.0\%$ | Header theme toggle + catalog geometry behind modal |
| `upload-chapter-dark` | Dark | $\le 8.5\%$ | Header theme toggle + catalog geometry behind modal |
| `upload-chapter-light` | Light | $\le 16.0\%$ | Header theme toggle + catalog geometry behind modal |
| `cast-roster-dark` | Dark | $\le 8.5\%$ | Character Roster tab in Novel Detail view |
| `cast-roster-light` | Light | $\le 16.0\%$ | Character Roster tab in Novel Detail view |
| `profile-dark` | Dark | $\le 60.0\%$ | Dedicated ProfileView route vs catalog fallback in 1879dd7 |
| `profile-light` | Light | $\le 75.0\%$ | Dedicated ProfileView route vs catalog fallback in 1879dd7 |

---

## 4. Verification Commands

To verify the theme lock locally or in CI:

```bash
# In novel-audio-synthesizer/frontend
npm run theme:check
```
