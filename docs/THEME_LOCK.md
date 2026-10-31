# SyncTone Theme Lock & Visual Identity Specification

**Status**: STRICTLY LOCKED  
**Reference Commit**: `1879dd7`  
**Current HEAD**: `redesign/opencode`  
**Enforcement**: Vitest Token Snapshot (`src/__tests__/theme_lock.test.js`) + Playwright E2E Visual Suite (`e2e/theme-lock.spec.js`) via `npm run theme:check`

---

## 1. Absolute Invariance Policy

1. **Strictly Immutable Visual Palette**:
   - Visual Identity: **Atelier Obsidian** (Dark) & **Editorial Light** (Cold-Press Vellum).
   - Living Accent: **Electric Cinnabar Vermilion** (`oklch(0.67 0.220 36)` / `oklch(0.52 0.220 34)`).
   - **NO color, token, shadow color, opacity, gradient, or theme-related value may change anywhere, for any reason (including accessibility contrast).**
2. **Accessibility (a11y) Override Rule**:
   - If an automated accessibility audit (e.g. Axe-core) flags an element or contrast ratio for a color token, developers and agents are strictly forbidden from altering the token or color value.
   - The finding must be reported to the user with the element, selector, and measured ratio. Under no circumstances may color tokens be adjusted.
3. **Continuous Verification**:
   - Any commit modifying theme tokens, colors, or visual aesthetics will fail CI via `npm run theme:check`.

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

  --accent: oklch(0.67 0.220 36);
  --accent-hover: oklch(0.72 0.210 38);
  --accent-surface: rgba(255, 95, 65, 0.12);
  --on-accent: oklch(0.12 0.010 260);

  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.20);
  --border-focus: oklch(0.70 0.220 36);

  --speaker-narrator: oklch(0.85 0.008 260);
  --speaker-a: oklch(0.72 0.200 36);
  --speaker-b: oklch(0.77 0.140 155);
  --speaker-c: oklch(0.76 0.140 235);
  --speaker-d: oklch(0.76 0.150 320);
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

  --accent: oklch(0.52 0.220 34);
  --accent-hover: oklch(0.45 0.220 32);
  --accent-surface: rgba(220, 60, 40, 0.10);
  --on-accent: oklch(1.00 0.000 0);

  --border-subtle: rgba(20, 25, 35, 0.08);
  --border-strong: rgba(20, 25, 35, 0.20);
  --border-focus: oklch(0.52 0.220 34);

  --speaker-narrator: oklch(0.20 0.010 260);
  --speaker-a: oklch(0.46 0.210 34);
  --speaker-b: oklch(0.38 0.120 155);
  --speaker-c: oklch(0.38 0.130 240);
  --speaker-d: oklch(0.40 0.160 330);
}
```

### Brand Immutable Accents (`tailwind.config.js`)
- `gold`: `#E5A93C`
- `crimson`: `#E50914`
- `cyan`: `#06B6D4`
- `indigo`: `#6366F1`
- `violet`: `#8B5CF6`

---

## 3. Approved User-Perceptible Changes (`1879dd7..HEAD`)

The following intentional geometry, copy, and layout improvements were merged between `1879dd7` and `HEAD`. None altered color tokens:

| Component / File | Commit | Nature of Change | Visual Delta / Rationale |
| :--- | :--- | :--- | :--- |
| **`NovelCover.jsx`**, **`NovelCatalog.jsx`**, **`Card.jsx`**, **`Skeleton.jsx`** | `3737cce` (Track B 3D) | Book cover aspect ratio changed from `3:4` (`aspect-[3/4]`) to `2:3` (`aspect-[2/3]`). | Industry-standard 2:3 ratio for hardcover novels. Causes expected vertical card shift on Home and Novel Detail screens. |
| **`TopHeader.jsx`**, **`NovelCatalog.jsx`** | `3737cce` (Track B 3A) | Added fixed `h-16` height and standard Sun/Moon theme toggle button (`aria-label="Switch to light/dark mode"`). | Provides explicit theme switching in the global navigation bar. |
| **`SettingsModal.jsx`** | `3737cce` (Track B 2C) | Plain language copy rewrite replacing technical engine names (e.g. "Voice Engine Status" → "Audio & Voices"). | Plain copy guidance requested by user; no technical jargon exposed in UI. |
| **`ReaderView.jsx`** | `50e24dc` (Track B Toolbar) | Simplified toolbar button label from `"OpenGL 3D"` to `"3D"`. | Eliminates technical terminology from user-facing reader controls. |
| **`App.jsx`**, **`ProfileView.jsx`** | `4e90166` (Track A Routing) | Migrated `/profile` to dedicated `ProfileView.jsx` with role guard. In `1879dd7`, `/profile` was unrouted and fell back to Home catalog. | Clean RESTful routing with React Router v6. |
| **`NovelCatalog.jsx`** | Working tree cleanup | Scoped horizontal containment to `NovelCatalog.jsx` using `overflow-x-clip max-w-full`. | Replaced unrequested global `html, body { overflow-x: hidden; max-width: 100vw; }` to prevent scroll bleed into the Reader stage. |
| **`NovelCover.jsx`** | Working tree cleanup | Reverted unrequested `{author && <p>By {author}</p>}` text overlay. | Preserves pure cover art presentation identical to `1879dd7`. |

---

## 4. Visual Regression Baselines & Tolerances

Playwright baseline screenshots are stored in `docs/screenshots/theme-regression/ref/`. For each of the 16 screens, tests enforce:
1. **Zero Color Delta**: Exact normalized match on all CSS variables and computed background/text/border colors.
2. **Bounded Geometry Delta**: Bounded by the allowed geometry differences resulting from 2:3 aspect ratio, theme toggle icons, and friendly copy.

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
| `profile-dark` | Dark | $\le 60.0\%$ | Dedicated ProfileView route vs catalog fallback in 1879dd7 |
| `profile-light` | Light | $\le 75.0\%$ | Dedicated ProfileView route vs catalog fallback in 1879dd7 |

---

## 5. Verification Commands

To verify the theme lock locally or in CI:

```bash
# In novel-audio-synthesizer/frontend
npm run theme:check
```
