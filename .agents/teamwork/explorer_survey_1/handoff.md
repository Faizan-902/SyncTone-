# Color Palette & Styling Guardrails Survey Report

**Explorer**: `teamwork_explorer`  
**Working Directory**: `/Users/mohdfaizankhan/SyncTone-/.agents/teamwork/explorer_survey_1/`  
**Target Project**: SyncTone (`novel-audio-synthesizer/frontend`)  
**Date**: 2026-11-02  

---

## 1. Observation

### O1. Styling Architecture & Theme System
* **Tailwind Configuration** (`novel-audio-synthesizer/frontend/tailwind.config.js:19-82`):
  * Colors bound to CSS variables:
    ```javascript
    colors: {
      page: 'var(--bg-page)',
      surface: 'var(--bg-surface)',
      card: 'var(--bg-card)',
      hover: 'var(--bg-hover)',
      elevated: 'var(--bg-elevated)',
      'text-main': 'var(--text-main)',
      'text-sub': 'var(--text-sub)',
      'text-muted': 'var(--text-muted)',
      border: {
        subtle: 'var(--border-subtle)',
        strong: 'var(--border-strong)',
        hover: 'var(--border-hover)',
        focus: 'var(--border-focus)',
      },
      accent: {
        DEFAULT: 'var(--accent)',
        hover: 'var(--accent-hover)',
        surface: 'var(--accent-surface)',
        strong: 'var(--accent-strong)',
        text: 'var(--accent-text)',
      },
      'on-accent': 'var(--on-accent)',
      status: {
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      speaker: {
        narrator: 'var(--speaker-narrator)',
        a: 'var(--speaker-a)',
        b: 'var(--speaker-b)',
        c: 'var(--speaker-c)',
        d: 'var(--speaker-d)',
      },
      brand: {
        espresso: '#1A120E',
        chocolate: '#3A2418',
        walnut: '#6B4A2E',
        bronze: '#A88462',
        sand: '#D5C4AE',
        charcoal: '#4A4A46',
        gold: '#E5A93C',
        crimson: '#E50914',
      },
      espresso: '#1A120E',
      chocolate: '#3A2418',
      walnut: '#6B4A2E',
      bronze: '#A88462',
      sand: '#D5C4AE',
      charcoal: '#4A4A46',
      cta: {
        primary: 'var(--cta-primary-bg)',
        'primary-text': 'var(--cta-primary-text)',
      },
    }
    ```
* **CSS Variable Tokens** (`novel-audio-synthesizer/frontend/src/index.css:45-229`):
  * **Dark Mode (`:root, html.dark`)**:
    * `--brand-espresso: #1A120E`, `--brand-chocolate: #3A2418`, `--brand-walnut: #6B4A2E`, `--brand-bronze: #A88462`, `--brand-sand: #D5C4AE`, `--brand-charcoal: #4A4A46`
    * `--bg-page: #1A120E`, `--bg-surface: #3A2418`, `--bg-card: #3A2418`, `--bg-hover: #4A4A46`, `--bg-elevated: #4A4A46`
    * `--text-main: #D5C4AE`, `--text-sub: #A88462`, `--text-muted: #8A7A68`
    * `--border-subtle: #40362E`, `--border-strong: #5A4D42`, `--border-hover: #71665D`, `--border-focus: #A88462`
    * `--accent: #A88462`, `--accent-hover: #BCA082`, `--accent-surface: rgba(168, 132, 98, 0.15)`, `--accent-strong: #6B4A2E`, `--accent-text: #A88462`, `--on-accent: #1A120E`
    * `--cta-primary-bg: #6B4A2E`, `--cta-primary-hover: #7D5737`, `--cta-primary-text: #D5C4AE`
    * `--success: #5FA052`, `--warning: #C68A3C`, `--danger: #BA4E3D`, `--info: #A88462`
    * `--speaker-narrator: #D5C4AE`, `--speaker-a: #A88462`, `--speaker-b: #5FA052`, `--speaker-c: #6B4A2E`, `--speaker-d: #BA4E3D`
    * `--top10-fill: #1A120E`, `--top10-stroke: rgba(213, 196, 174, 0.25)`, `--top10-active: #A88462`
    * `--card-accent: #A88462`
  * **Light Mode (`html.light`)**:
    * `--bg-page: #D5C4AE`, `--bg-surface: #FAF6F0`, `--bg-card: #F5EFE6`, `--bg-hover: #E8DDD0`, `--bg-elevated: #FFFFFF`
    * `--text-main: #1A120E`, `--text-sub: #4A4A46`, `--text-muted: #6B5B4E`
    * `--border-subtle: #C8B9A6`, `--border-strong: #A89885`, `--border-hover: #8C7E6F`, `--border-focus: #6B4A2E`
    * `--accent: #6B4A2E`, `--accent-hover: #3A2418`, `--accent-surface: rgba(107, 74, 46, 0.12)`, `--accent-strong: #3A2418`, `--accent-text: #6B4A2E`, `--on-accent: #FAF6F0`
    * `--cta-primary-bg: #6B4A2E`, `--cta-primary-hover: #3A2418`, `--cta-primary-text: #D5C4AE`
    * `--success: #386B2F`, `--warning: #87571B`, `--danger: #962F22`, `--info: #6B4A2E`
    * `--speaker-narrator: #1A120E`, `--speaker-a: #6B4A2E`, `--speaker-b: #386B2F`, `--speaker-c: #4A4A46`, `--speaker-d: #962F22`
    * `--top10-fill: #D5C4AE`, `--top10-stroke: rgba(26, 18, 14, 0.25)`, `--top10-active: #6B4A2E`
    * `--card-accent: #6B4A2E`
* **Theme Management** (`src/context/ThemeContext.jsx:13-70`):
  * Dual-mode cycle: `['dark', 'light']`. Legacy `sepia` silently migrated to `dark`.
  * Persisted in `localStorage.getItem('synctone_theme')`.
  * Synchronizes `#meta-theme-color` (`#1A120E` for dark, `#D5C4AE` for light).
  * Executes theme switching inside View Transitions via `executeViewTransition()`.
* **HTML Anti-Flash Script** (`index.html:11-23`):
  * Immediately checks `localStorage` and applies `.dark` or `.light` class to `<html>` and updates `meta[name="theme-color"]`.

---

### O2. Existing Earthy Luxury Palette Mapping & Role Inventory
| Color Name | Hex Code | Primary Roles in Dark Mode | Primary Roles in Light Mode |
| :--- | :--- | :--- | :--- |
| **Deep Espresso** | `#1A120E` | Page background (`--bg-page`), on-accent text (`--on-accent`), Top 10 fill (`--top10-fill`), meta theme | Primary text (`--text-main`), Narrator text (`--speaker-narrator`) |
| **Dark Chocolate** | `#3A2418` | Surface & card backgrounds (`--bg-surface`, `--bg-card`), glass dock base | Button hover (`--cta-primary-hover`), Accent hover (`--accent-hover`, `--accent-strong`) |
| **Walnut Brown** | `#6B4A2E` | Primary CTA background (`--cta-primary-bg`), Accent strong (`--accent-strong`), Speaker C | Living accent (`--accent`), Focus ring border (`--border-focus`), Primary CTA background, Speaker A |
| **Warm Bronze** | `#A88462` | Living accent (`--accent`), Sub-heading text (`--text-sub`), Border focus, Top 10 active, Speaker A | Secondary brand accents, subtle card highlights |
| **Soft Sand** | `#D5C4AE` | Primary text (`--text-main`), CTA text (`--cta-primary-text`), Narrator text, Top 10 stroke | Page background (`--bg-page`), Top 10 fill (`--top10-fill`), CTA text |
| **Charcoal** | `#4A4A46` | Hover & elevated backgrounds (`--bg-hover`, `--bg-elevated`) | Secondary body text (`--text-sub`), Speaker C |

---

### O3. The 3 New Major Colors Analysis
1. **Sage Green (`#87A96B`)**:
   * RGB: `(135, 169, 107)`. Relative Luminance: `0.345`.
   * Contrast ratio against Deep Espresso (`#1A120E`): **6.81:1** (AAA contrast for UI components & large text; AA for normal text).
   * Visual character: Warm, organic, botanical sage.
   * Complementary relation: Directly complements Warm Bronze (`#A88462`) and Walnut Brown (`#5A3E2B`/`#6B4A2E`). Replaces harsher emerald greens.
2. **Walnut Brown (`#5A3E2B`)**:
   * RGB: `(90, 62, 43)`. Relative Luminance: `0.052`.
   * Contrast check: Deeper, roast-espresso walnut compared to existing `#6B4A2E` (L=0.076).
   * Visual character: Grounded, dense archival leather binding.
   * Complementary relation: Acts as the deep anchor between Espresso (`#1A120E`) and Walnut (`#6B4A2E`).
3. **Amber Glow (`#D5851F`)**:
   * RGB: `(213, 133, 31)`. Relative Luminance: `0.311`.
   * Contrast ratio against Deep Espresso (`#1A120E`): **6.22:1** (AA body text, AAA large text).
   * Visual character: Radiant candlelight, honey amber, gilded foil stamping.
   * Complementary relation: Provides vibrant golden warmth without the starkness of standard yellow highlights or neon orange.

---

### O4. Zero-Blue Audit Findings (Violations & Risks)
Across the entire repository:
* **Direct Violation 1**: `novel-audio-synthesizer/frontend/src/components/OpenGLPageReader.jsx:501, 536`:
  * Line 501: `className={isFocusMode ? 'fixed inset-0 z-50 bg-[#fcfaf6] dark:bg-[#050507] ...' : '...'}`
  * Line 536: `className="... dark:bg-[#050507] dark:text-[#e5e5ea] ..."`
  * Analysis:
    * `#050507`: RGB(5, 5, 7) has HSL(240°, 17%, 2%) — a cold blue-tinted black!
    * `#e5e5ea`: RGB(229, 229, 234) has HSL(240°, 11%, 91%) — a cold blue-tinted gray (standard Apple iOS system gray)!
    * **Impact**: Violates strict zero-blue rule and breaks the warm Earthy Luxury palette in OpenGL 3D Reader Focus Mode.
* **Direct Violation 2**: `novel-audio-synthesizer/frontend/public/vite.svg:2`:
  * `<circle cx="16" cy="16" r="14" fill="#4f46e5"/>`
  * Analysis: `#4f46e5` is Tailwind `indigo-600` (HSL 244°, 77%, 59% — pure blue/indigo).
  * **Impact**: Unreferenced asset in `public/` that contains an overt blue hex.
* **Verified Clean Areas**:
  * `src/index.css`: 0 blue tokens, 0 blue utility classes.
  * `tailwind.config.js`: 0 blue tokens (explicitly cleaned in previous restoration).
  * `src/components/NovelCover.jsx`: `COVER_STYLES` contains only `espresso`, `chocolate`, `walnut`, `charcoal`.
  * `src/components/AudioPlayer.jsx:285`: Scrubber bar uses `from-[var(--brand-walnut,#6B4A2E)] to-[var(--brand-bronze,#A88462)]` (old `to-indigo-400` stop was already removed).
  * `src/components/primitives/StatusBadge.jsx:32`: `info` token defaults to Warm Bronze `var(--info, #A88462)` instead of standard UI blue.
  * `public/icon-192.svg` & `icon-512.svg`: Clean (`#1A120E`, `#3A2418`, `#A88462`, `#5FA052`).
  * `public/offline.html`: Clean (`--bg: #1A120E`, `--surface: #3A2418`, `--border: #40362E`, `--text: #D5C4AE`, `--accent: #6B4A2E`).

---

### O5. Playwright & Vitest Theme-Lock Suite Architecture
1. **Vitest Unit Theme Lock** (`src/__tests__/theme_lock.test.js`):
   * Asserts token counts:
     * Line 38: `expect(Object.keys(darkVars).length).toBe(85);`
     * Line 118: `expect(Object.keys(lightVars).length).toBe(43);`
   * Asserts exact dictionary matching for dark and light custom properties.
   * Negative assertion against Cinnabar vermilion (oklch hue 34-38, `#e0533c`, `#c83d27`).
   * Asserts `tailwind.config.js` does NOT contain `cyan: '#06B6D4'`, `indigo: '#6366F1'`, or `violet: '#8B5CF6'`.
   * **Verification Command**: `npm test --prefix novel-audio-synthesizer/frontend` -> **115 / 115 tests PASSING**.
2. **Playwright Zero-Color-Delta E2E Suite** (`e2e/theme-lock.spec.js`):
   * 18 tests across 9 core application views in both Dark and Light mode:
     1. Home screen (`home-dark`, `home-light`)
     2. Settings modal (`settings-dark`, `settings-light`)
     3. Auth modal (`auth-dark`, `auth-light`)
     4. Novel Detail (`novel-detail-dark`, `novel-detail-light`)
     5. Reader Normal & 3D (`reader-normal-dark`, `reader-normal-light`, `reader-3d-dark`, `reader-3d-light`)
     6. Add Novel modal (`add-novel-dark`, `add-novel-light`)
     7. Profile page (`profile-dark`, `profile-light`)
     8. Upload Chapter modal (`upload-chapter-dark`, `upload-chapter-light`)
     9. Cast Roster (`cast-roster-dark`, `cast-roster-light`)
   * Enforces:
     * `verifyColorParity(styles, screenKey)`: Computes CSS custom properties and computed styles for `body`, `header`, `card`. Compares against `docs/screenshots/theme-regression/computed-ref.json` with **0 color drift tolerance**.
     * Screenshot visual diff thresholding against reference baselines in `docs/screenshots/theme-regression/ref/`.
   * **Verification Command**: `npm run test:e2e -- e2e/theme-lock.spec.js` -> **18 / 18 tests PASSING** (Duration: 30.7s).
3. **Playwright Hardening E2E Suite** (`e2e/hardening.spec.js`):
   * 13 tests covering navigation, roving tabindex, search debounce, modal traps, fast 3G throttling, PWA offline resilience, real Chromium DOMParser ttsSanitizer parity, and Axe-core accessibility audits on Home, Settings, and Profile (critical + serious = 0).
   * **Verification Command**: `npm run test:e2e -- e2e/hardening.spec.js` -> **13 / 13 tests PASSING** (Duration: 21.9s).
4. **Bundle Budget Measurement**:
   * Build command: `npm run build --prefix novel-audio-synthesizer/frontend`.
   * Initial Home JS assets:
     * `index-SwJd2WGe.js`: 24.55 kB gzip
     * `react-vendor-DeMnUtHS.js`: 49.14 kB gzip
     * **Total initial cold load JS**: **73.69 kB gzip** (Budget: <= 75.0 kB gzip; **Headroom remaining: 1.31 kB**).

---

## 2. Logic Chain

1. **Premise 1 (Token Discipline)**: Any changes to `:root, html.dark` or `html.light` custom properties directly affect `src/__tests__/theme_lock.test.js` because lines 38 and 118 assert strict property count lengths (`toBe(85)` and `toBe(43)`).
2. **Premise 2 (Zero Color Delta Lock)**: `e2e/theme-lock.spec.js` checks computed styles of `body`, `header`, and `card` across 18 screen-theme combinations against `computed-ref.json`.
3. **Premise 3 (Safe Incorporation Strategy)**: Incorporating Sage Green (`#87A96B`), Walnut Brown (`#5A3E2B`), and Amber Glow (`#D5851F`) must be done in a way that does NOT regress existing computed colors of `body`, `header`, and `card`, while enhancing component accents, buttons, badges, book covers, and playback highlights.
4. **Premise 4 (Zero-Blue Compliance)**: The presence of `#050507` and `#e5e5ea` in `OpenGLPageReader.jsx` constitutes an active blue undertone violation in the 3D reader focus mode. Replacing them with `--bg-page` (`#1A120E`) and `--text-main` (`#D5C4AE`) eliminates the blue hue, aligns with Earthy Luxury, and enhances consistency without causing layout shifts or test failures.
5. **Premise 5 (Performance Budget Guardrail)**: With only 1.31 kB gzip headroom remaining under the 75 kB budget, all visual polish, tactile micro-animations, and glass/depth enhancements MUST be achieved using CSS variables, Tailwind classes, and existing CSS keyframes/transitions already in `index.css` rather than introducing new heavy JS animation libraries or runtime polyfills.

---

## 3. Caveats

1. **Theme Lock Test Property Count**: Adding CSS custom properties to `:root, html.dark` (e.g. `--brand-sage`, `--brand-amber`) will increment `Object.keys(darkVars).length` beyond 85. If tokens are added to `:root`, `src/__tests__/theme_lock.test.js` line 38 must be incremented to match the exact count. Alternatively, they can be defined in Tailwind's `theme.extend.colors` and component utilities.
2. **`computed-ref.json` Invariance**: The Playwright theme-lock suite specifically checks that `body.background`, `body.color`, `header.background`, and `card.background` do not drift. Any visual polish to card backgrounds or headers must preserve the underlying base color coordinates or rely on pseudo-elements (`::after` overlays with opacity transitions) which are already calibrated to pass zero-color-delta checks.
3. **Axe-core Contrast Policy**: As stated in `docs/THEME_LOCK.md`, Axe-core `color-contrast` checks in `e2e/hardening.spec.js` are configured to log to `docs/contrast-known-issues.md` rather than fail tests for minor low-contrast edge cases. However, all new token combinations (e.g. Sage Green on Espresso: 6.81:1, Amber Glow on Espresso: 6.22:1) exceed the 4.5:1 AA threshold.

---

## 4. Conclusion & Actionable Recommendations

### Recommendation 1: Fix Zero-Blue Violations
1. **`OpenGLPageReader.jsx:501, 536`**:
   * Replace `dark:bg-[#050507]` with `dark:bg-[var(--bg-page,#1A120E)]` (or `dark:bg-page`).
   * Replace `dark:text-[#e5e5ea]` with `dark:text-[var(--text-main,#D5C4AE)]` (or `dark:text-text-main`).
2. **`public/vite.svg:2`**:
   * Replace `fill="#4f46e5"` with `fill="#A88462"` or remove the unused file.

### Recommendation 2: Incorporate the 3 Major Colors
1. **Add Tokens to `tailwind.config.js`**:
   ```javascript
   brand: {
     espresso: '#1A120E',
     chocolate: '#3A2418',
     walnut: '#6B4A2E',
     'walnut-deep': '#5A3E2B', // New Major Color
     bronze: '#A88462',
     sand: '#D5C4AE',
     charcoal: '#4A4A46',
     sage: '#87A96B',         // New Major Color
     amber: '#D5851F',        // New Major Color
     gold: '#E5A93C',
     crimson: '#E50914',
   },
   'walnut-deep': '#5A3E2B',
   sage: '#87A96B',
   amber: '#D5851F',
   ```
2. **Apply Sage Green (`#87A96B`)**:
   * **`NovelCover.jsx`**: Add a 5th cover preset `sage` to `COVER_STYLES` ("Botanical Antiquarian Edition" with emerald/sage foil emblem).
   * **`StatusBadge.jsx`**: Use for `verified` and `success` badges (`colorVar: 'var(--brand-sage, #87A96B)'`).
   * **`NovelCatalog.jsx`**: Verified Originals tab pill active border & ambient badge accent.
3. **Apply Walnut Brown (`#5A3E2B`)**:
   * **`Button.jsx` / Primary CTAs**: Use as the rich leather base for primary button hover/active transitions (`bg-[#6B4A2E] hover:bg-[#5A3E2B]`).
   * **`AudioPlayer.jsx:285`**: Progress bar gradient from `from-[#5A3E2B] via-[#6B4A2E] to-[#A88462]`.
   * **`NovelCover.jsx`**: Deep walnut binding spine gradient `from-[#5A3E2B] via-[#4A3324] to-[#3A2418]`.
4. **Apply Amber Glow (`#D5851F`)**:
   * **`AudioPlayer.jsx` & `TopHeader.jsx`**: Live playing soundwave equalizer bars and glowing audio aura (`rgba(213, 133, 31, 0.35)`).
   * **`ReaderView.jsx` & `OpenGLPageReader.jsx`**: Active spoken word pulse ring and turn indicator highlight ring (`ring-[var(--brand-amber,#D5851F)]/60`).
   * **`NovelCatalog.jsx`**: Top 10 rank active hover outline (`--top10-active: #D5851F`).
   * **`NovelCover.jsx`**: Add gilded foil edition preset with glowing amber accents.

### Recommendation 3: Guardrail Invariance
* If CSS variables are added to `:root` in `index.css`, synchronize the test count assertion in `src/__tests__/theme_lock.test.js` (e.g. 85 -> 88).
* Maintain initial bundle size below 75 kB gzip by using CSS-only micro-animations and zero-layout-shift transforms.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify All 115 Vitest Tests**:
   ```bash
   npm test --prefix novel-audio-synthesizer/frontend
   # Expected: 18 passed (18), 115 passed (115)
   ```
2. **Verify Playwright Theme-Lock E2E Suite**:
   ```bash
   cd novel-audio-synthesizer/frontend && npm run test:e2e -- e2e/theme-lock.spec.js
   # Expected: 18 passed (18)
   ```
3. **Verify Playwright Hardening E2E Suite**:
   ```bash
   cd novel-audio-synthesizer/frontend && npm run test:e2e -- e2e/hardening.spec.js
   # Expected: 13 passed (13)
   ```
4. **Verify Production Bundle Size**:
   ```bash
   npm run build --prefix novel-audio-synthesizer/frontend
   # Check dist/assets/index-*.js and react-vendor-*.js combined gzip size <= 75 kB
   ```
5. **Inspect Zero-Blue Audit Points**:
   * `novel-audio-synthesizer/frontend/src/components/OpenGLPageReader.jsx:501, 536`
   * `novel-audio-synthesizer/frontend/public/vite.svg:2`
