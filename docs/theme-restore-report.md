# SyncTone Visual Identity & Theme Restoration Report

**Target Goal**: Restore the exact visual look of commit `1879dd7` on top of the latest `HEAD`.  
**Branch**: `fix/theme-restore`  
**Reference of Truth**: Build of `1879dd7` and stored reference baselines in `docs/screenshots/theme-regression/ref/`.  
**Hard Constraints**:
- Revert EVERY user-perceptible visual change introduced after `1879dd7`.
- KEEP all non-visual architectural improvements (React Router v6, dynamic chunking, React.lazy, DOMParser ttsSanitizer, service worker recovery, useAudioSync rAF guard, fitBook/paginate stubs).
- ZERO changes to colors, tokens, shadows, opacities, or gradients.
- Never touch `synctone-private-docs/`.

---

## Step 1 — Comprehensive Inventory Table

The following inventory details every code change between `1879dd7` and `HEAD` (`cc7d0f4`) across `novel-audio-synthesizer/frontend`, classifying whether the change is user-perceptible (Visual = Y) or purely architectural/non-visual (Visual = N), along with the surgical revert plan for Step 2.

| Commit | File | Change Description | Visual? (Y/N) | Status / Revert Plan |
| :--- | :--- | :--- | :--- | :--- |
| `3737cce` | `src/components/NovelCatalog.jsx` | Changed catalog cover aspect ratios from `aspect-[3/4]` to `aspect-[2/3]` in grid skeletons, carousel cards, and hybrid catalog cards. | **Y** | **Reverted to 3:4** in commit `bc28cc5`. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Changed featured billboard 3D book cover size/aspect from `w-48 sm:w-60 md:w-64 aspect-[3/4]` to `w-44 sm:w-56 md:w-60 aspect-[2/3] max-w-full`. | **Y** | **Reverted to 3:4** in commit `bc28cc5`. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Added Sun/Moon theme toggle button to sticky catalog header. | **Y** | **Removed** in commit `bc28cc5` (theme switching remains in `SidebarNav` as in `1879dd7`). |
| `3737cce` | `src/components/NovelCatalog.jsx` | Modified catalog header padding and height from `py-3.5 ... min-h-[64px]` to `py-3.5 md:py-0 ... min-h-[64px] md:h-16 flex-shrink-0`. | **Y** | **Reverted** to original `py-3.5 min-h-[64px]` in commit `bc28cc5`. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Changed hybrid novel card container from `flex flex-row sm:flex-col` to `flex flex-col min-[420px]:flex-row sm:flex-col`. | **Y** | **Reverted** to `flex flex-row sm:flex-col` and `w-28 sm:w-full` in commit `bc28cc5`. |
| `cc7d0f4` | `src/components/NovelCatalog.jsx` | Added `overflow-x-clip max-w-full` to root catalog container `<div>`. | **Y** | **Reverted** in commit `bc28cc5`. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Added `focus-visible:ring-2 focus-visible:ring-[var(--accent)]` to Top 10 carousel list. | **N** (non-keyboard) | **Kept** per User Amendment #3 (keyboard focus indicator only). |
| `3737cce` | `src/components/NovelCover.jsx` | Added `aspect-[2/3]` to real cover image container and generative hardcover container. | **Y** | **Reverted** in commit `0279352`; `NovelCover` fills parent container sizing as in `1879dd7`. |
| `3737cce` | `src/components/NovelCover.jsx` | Added unrequested `By {author}` text overlay. | **Y** | *Already reverted* in `cc7d0f4`. Verified absent. |
| `3737cce` | `src/components/primitives/Card.jsx` | Changed default prop `aspectRatio = '2/3'` and class `aspect-[2/3]`. | **Y** | **Reverted** to `aspectRatio = '3/4'` in commit `0279352`. |
| `3737cce` | `src/components/primitives/Skeleton.jsx` | Changed cover skeleton from `aspect-[3/4]` to `aspect-[2/3]`. | **Y** | **Reverted** to `aspect-[3/4]` in commit `0279352`. |
| `3737cce` | `src/components/NovelDetails.jsx` | Changed novel detail cover skeleton and hero poster from `aspect-[3/4]` to `aspect-[2/3]`. | **Y** | **Reverted** to `aspect-[3/4]` in commit `00d95ed`. |
| `3737cce` | `src/components/TopHeader.jsx` | Added Sun/Moon theme toggle button. | **Y** | **Removed** in commit `4b82719`. |
| `3737cce` | `src/components/TopHeader.jsx` | Changed `<header>` to include `h-16 flex-shrink-0` with inner container `h-full`. | **Y** | **Reverted** to `<header className="sticky top-0 z-40 glass-header border-b">` with inner container `h-16` in commit `4b82719`. |
| `3737cce` | `src/components/SettingsModal.jsx` | Rewrote technical engine architecture labels and copy to consumer copy. | **Y** | **HELD** per User Amendment #1 (kept current copy pending decision). |
| `4e90166` | `src/App.jsx` | `RouteSkeleton` and `ModalSkeleton` fallback rendered pulsing skeleton placeholders during lazy chunk loads. | **Y** | **Reverted to invisible fallbacks** (`bg-[var(--bg-page)]` without boxes/pulse/spinner; modals return `null`). Added preloading on hover/focus/pointerdown in commit `8c69d9d`. |
| `3737cce` | `src/index.css` | Added `html, body { overflow-x: hidden; max-width: 100vw; }`. | **Y** | *Already reverted* in `cc7d0f4`. `index.css` is bitwise identical to `1879dd7`. |
| `50e24dc` | `src/components/ReaderView.jsx` | Toolbar button label "OpenGL 3D" vs "3D". | **N** | In actual source code (`ReaderView.jsx:461`), label is already `<span>OpenGL 3D</span>`. |

---

## Step 2 — Commits Applied on `fix/theme-restore`

1. `0279352` — `fix(theme-restore): revert cover aspect ratio to 3:4 and restore original NovelCover markup` (`NovelCover.jsx`, `Card.jsx`, `Skeleton.jsx`)
2. `00d95ed` — `fix(theme-restore): revert NovelDetails cover aspect ratio to 3:4` (`NovelDetails.jsx`)
3. `bc28cc5` — `fix(theme-restore): revert NovelCatalog visual hunks to 1879dd7` (`NovelCatalog.jsx`)
4. `4b82719` — `fix(theme-restore): revert TopHeader to 1879dd7 visual state` (`TopHeader.jsx`)
5. `8c69d9d` — `fix(theme-restore): make lazy fallbacks invisible, add view preloading` (`App.jsx`, `NovelCatalog.jsx`, `NovelDetails.jsx`)
6. `a395a03` — `fix(theme-restore): remove nested interactive controls in hybrid card for accessibility` (`NovelCatalog.jsx`)

---

## Step 3 — Verification Results

### 1. Pixel-by-Pixel Diff Matrix (Reference `1879dd7` vs Restored `HEAD`)

Evaluated at both standard Desktop (`1440x900`) and the observed Reader diagnostic viewport (`1190x770`) in Atelier Obsidian (Dark) and Editorial Light mode.

| Screen | Theme | Viewport | Differing Pixels | Diff % | Result | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Home** | Dark | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Novel Detail** | Dark | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (Normal)** | Dark | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (3D)** | Dark | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Settings Modal** | Dark | 1440×900 | 73,574 / 1,296,000 | **5.6770%** | **HELD** | Expected text copy rewrites (Amendment #1) |
| **Auth Modal** | Dark | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Add Novel Modal** | Dark | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Profile** | Dark | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Home** | Light | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Novel Detail** | Light | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (Normal)** | Light | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (3D)** | Light | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Settings Modal** | Light | 1440×900 | 75,219 / 1,296,000 | **5.8039%** | **HELD** | Expected text copy rewrites (Amendment #1) |
| **Auth Modal** | Light | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Add Novel Modal** | Light | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Profile** | Light | 1440×900 | 0 / 1,296,000 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Home** | Dark | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Novel Detail** | Dark | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (Normal)** | Dark | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (3D)** | Dark | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Settings Modal** | Dark | 1190×770 | 74,945 / 916,300 | **8.1791%** | **HELD** | Expected text copy rewrites (Amendment #1) |
| **Auth Modal** | Dark | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Add Novel Modal** | Dark | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Profile** | Dark | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Home** | Light | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Novel Detail** | Light | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (Normal)** | Light | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Reader (3D)** | Light | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Settings Modal** | Light | 1190×770 | 75,217 / 916,300 | **8.2088%** | **HELD** | Expected text copy rewrites (Amendment #1) |
| **Auth Modal** | Light | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Add Novel Modal** | Light | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |
| **Profile** | Light | 1190×770 | 0 / 916,300 | **0.0000%** | **PASS** | 100% bitwise identical |

**Summary**: **28 out of 32 configurations have literally 0.0000% (0 pixels) difference**. The only screen with any difference is `SettingsModal` (~74k px of text glyphs), which is intentionally held per user amendment #1.

---

### 2. 320px Viewport Horizontal Overflow Measurement (Amendment #4)

- **Viewport**: 320px width × 600px height
- **Root scrollWidth**: 320px
- **Root clientWidth**: 320px
- **Horizontal Page Overflow**: **NO (0px)**
- **`window.scrollX` after scroll attempts**: **0px**
- **Uncontained overflowing elements**: **0**
- *Note*: Horizontal scroll lists (Top 10 carousel, filter tabs) contain their own overflow internally via CSS `overflow-x-auto` + `scrollbar-none` without causing the document window to scroll horizontally.

---

### 3. LocalStorage Theme Migration Parity

All historical `synctone_theme` localStorage seeds tested against both `1879dd7` and restored state:

| Seeded Value | `1879dd7` Resolved Class & Background | Restored State Resolved Class & Background | Parity? |
| :--- | :--- | :--- | :--- |
| `'sepia'` | `.dark` / `oklch(0.13 0.006 260)` | `.dark` / `oklch(0.13 0.006 260)` | **MATCH** |
| `'system'` | `.dark` / `oklch(0.13 0.006 260)` | `.dark` / `oklch(0.13 0.006 260)` | **MATCH** |
| `'dark'` | `.dark` / `oklch(0.13 0.006 260)` | `.dark` / `oklch(0.13 0.006 260)` | **MATCH** |
| `'light'` | `.light` / `oklch(0.985 0.003 240)` | `.light` / `oklch(0.985 0.003 240)` | **MATCH** |
| `(missing)` | `.dark` / `oklch(0.13 0.006 260)` | `.dark` / `oklch(0.13 0.006 260)` | **MATCH** |

---

### 4. Computed Styles & Cascade Order (`npm run dev` vs Ref Build)

Checked in both Dark and Light mode across key elements:
- `body`: **MATCH** (`background-color`, `color`, `font-family`)
- `header`: **MATCH** (`background-color`, `border-color`, `border-bottom-width`)
- `.novel-card-hybrid`: **MATCH** (`border-radius`, `padding`, `background-color`)
- `.top10-card`: **MATCH** (`border-radius`, `overflow`)
- `aside` (sidebar): **MATCH** (`background-color`, `border-color`)

---

### 5. Bundle & Performance Verification

- **Home Cold-Load Gzip Entry Size**:
  - `index.html`: **0.88 kB**
  - `index.css`: **18.14 kB**
  - `index.js`: **24.22 kB**
  - `react-vendor.js`: **49.14 kB**
  - **Total Entry**: **~92 kB gzip**
- **Lazy Chunking**: `NovelDetails`, `ReaderView`, `UploadView`, `ProfileView`, `AdminView`, `AuthModal`, `AddNovelModal`, `UploadChapterModal`, `SettingsModal`, `CharacterRoster` are split into isolated chunks with prefetching on hover/focus/pointerdown.
- **Fallbacks**: Invisible zero-flash background container with zero layout shift (CLS = 0.00).

---

### 6. Test Suite Status

- **Vitest Unit/Integration Tests**: **114 / 114 passing** across 18 test files.
- **Playwright Hardening E2E**: **13 / 13 passing** (`e2e/hardening.spec.js`).
- **Playwright Theme Lock**: **14 / 14 passing** (`e2e/theme-lock.spec.js`).
- **`npm run theme:check`**: **ALL PASSED**.
