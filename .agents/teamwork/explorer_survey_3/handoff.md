# Comprehensive Build System, Test Suite & Performance Budget Survey Report

## 1. Observation

### 1.1 Project Structure & Build Tooling
- **Root Configuration (`/Users/mohdfaizankhan/SyncTone-/package.json`)**:
  Monorepo root delegating frontend and backend scripts:
  ```json
  "scripts": {
    "build": "npm run build --prefix novel-audio-synthesizer/frontend",
    "build:frontend": "npm run build --prefix novel-audio-synthesizer/frontend",
    "dev:frontend": "npm run dev --prefix novel-audio-synthesizer/frontend",
    "dev:backend": "npm run dev --prefix novel-audio-synthesizer/backend",
    "start:backend": "npm start --prefix novel-audio-synthesizer/backend",
    "test": "npm test --prefix novel-audio-synthesizer/backend",
    "test:de": "npm run test:de --prefix novel-audio-synthesizer/backend"
  }
  ```
- **Frontend Configuration (`novel-audio-synthesizer/frontend/package.json`)**:
  - `dev`: `vite` (runs Vite dev server on port `5174`)
  - `build`: `vite build`
  - `preview`: `vite preview`
  - `test`: `vitest run`
  - `test:e2e`: `playwright test`
  - `theme:check`: `vitest run src/__tests__/theme_lock.test.js && playwright test e2e/theme-lock.spec.js`
  - Core dependencies: `react` (`^18.2.0`), `react-dom` (`^18.2.0`), `react-router-dom` (`^6.28.0`), `framer-motion` (`^14.9.0`), `pdfjs-dist` (`^6.4.299`), `foliate-js` (`^1.0.1`), `@fontsource-variable/{inter,jetbrains-mono,newsreader}` (`^5.3.0`).
  - Dev dependencies: `vite` (`^5.0.8`), `@vitejs/plugin-react` (`^4.2.1`), `vite-plugin-pwa` (`^2.0.0`), `tailwindcss` (`^3.4.0`), `postcss` (`^8.4.32`), `rollup-plugin-visualizer` (`^7.1.1`), `vitest` (`^1.6.1`), `@playwright/test` (`^1.64.1`), `@axe-core/playwright` (`^4.14.0`), `jsdom` (`^24.1.3`).
  - No external icon package (e.g. `lucide-react`) is installed. Icons are implemented as pure SVG components in `src/components/icons.jsx`.

- **Vite Rollup Chunk Configuration (`novel-audio-synthesizer/frontend/vite.config.js:98-115`)**:
  ```javascript
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) return 'pdf';
          if (id.includes('foliate-js')) return 'foliate';
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'react-vendor';
          }
        },
      },
    },
  }
  ```

### 1.2 Vitest Unit & Integration Test Suite Status
- **Test File Location**: `novel-audio-synthesizer/frontend/src/__tests__/` (specified by `src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}` in `vite.config.js:121`).
- **Execution Command**: `npm test --prefix novel-audio-synthesizer/frontend` or `npx vitest run` in `novel-audio-synthesizer/frontend`.
- **Test Run Execution Results (Observed code 0)**:
  - Total test files: **18 passed (18 total)**
  - Total tests: **115 passed (115 total)**
  - Total duration: **1.53s**
  - Test inventory breakdown:
    1. `src/__tests__/tts_sanitizer_golden.test.jsx`: 14 passed
    2. `src/__tests__/primitives.test.jsx`: 21 passed
    3. `src/__tests__/opengl_tts_focus.test.jsx`: 9 passed
    4. `src/__tests__/fit_book.test.js`: 8 passed
    5. `src/__tests__/ebook_sanitizer.test.jsx`: 7 passed
    6. `src/__tests__/auth.test.jsx`: 6 passed
    7. `src/__tests__/frontend_fixes.test.jsx`: 6 passed
    8. `src/__tests__/addnovel.test.jsx`: 6 passed
    9. `src/__tests__/catalog.test.jsx`: 5 passed
    10. `src/__tests__/chapters.test.jsx`: 5 passed
    11. `src/__tests__/reader.test.jsx`: 5 passed
    12. `src/__tests__/theme_lock.test.js`: 4 passed
    13. `src/__tests__/synthesis.test.jsx`: 4 passed
    14. `src/__tests__/playback.test.jsx`: 4 passed
    15. `src/__tests__/roster.test.jsx`: 4 passed
    16. `src/__tests__/delete_novel.test.jsx`: 3 passed
    17. `src/__tests__/tts_engines.test.jsx`: 3 passed
    18. `src/__tests__/integration.test.jsx`: 1 passed

- **Theme Lock Vitest Assertions (`src/__tests__/theme_lock.test.js`)**:
  - Asserts Dark Mode has exactly **85** CSS custom properties defined (`:root, html.dark`).
  - Asserts Light Mode has exactly **43** CSS custom properties defined (`html.light`).
  - Enforces exact Earthy Luxury palette token bindings (`#1A120E`, `#3A2418`, `#6B4A2E`, `#A88462`, `#D5C4AE`, `#4A4A46`).
  - Enforces zero Cinnabar values (regex matches against `#e0533c`, `#c83d27`, rgb(224, 83, 60), and OKLCH hue 34-38).
  - Asserts Tailwind color mapping integrity in `tailwind.config.js`.

### 1.3 Playwright E2E Suite Status
- **Test File Location**: `novel-audio-synthesizer/frontend/e2e/`
- **Configuration (`playwright.config.js`)**:
  - `baseURL: 'http://localhost:5174'`, `timeout: 30000`, `workers: 1`, `projects: [{ name: 'chromium' }]`.
  - **Prerequisites**: Vite dev server must be running on port 5174, and Express API server must be running on port 4000.
- **Suite 1: `e2e/theme-lock.spec.js` (18 tests)**:
  - Command: `npx playwright test e2e/theme-lock.spec.js`
  - Tests 9 screens in both `dark` and `light` modes:
    1. Home screen (dark & light)
    2. Settings modal (dark & light)
    3. Auth modal (dark & light)
    4. Novel Detail (dark & light)
    5. Reader Normal & 3D (dark & light)
    6. Add Novel modal (dark & light)
    7. Profile page (dark & light)
    8. Upload Chapter modal (dark & light)
    9. Cast Roster (dark & light)
  - Checks computed element styles (`verifyColorParity`) for zero color delta against `docs/screenshots/theme-regression/computed-ref.json`.
  - Compares screenshots in-browser canvas against baseline images in `docs/screenshots/theme-regression/ref/` bounded by `GEOMETRY_THRESHOLDS` (e.g. Home dark <= 8.5%, Home light <= 10.5%).
  - Execution Result: **18 passed in 30.9s (0 failures)**.
- **Suite 2: `e2e/hardening.spec.js` (13 tests)**:
  - Command: `npx playwright test e2e/hardening.spec.js`
  - Tests catalog navigation, search debounce, keyboard tab navigation, theme persistence, network error toast, modal focus trap & Esc, Axe accessibility audit (wcag2a/wcag2aa with critical=0), deep links, role guards (/admin, /profile, /upload), Fast 3G throttling modal skeleton fallback, ttsSanitizer DOMParser parity in real Chromium, PWA offline boot and /api/* rejection, Axe audit on Home/Settings/Profile in light/dark.
  - Execution Result: **13 passed in 23.5s (0 failures)**.
- **Combined Command**: `npm run theme:check --prefix novel-audio-synthesizer/frontend`:
  - Runs `vitest run src/__tests__/theme_lock.test.js && playwright test e2e/theme-lock.spec.js`
  - Execution Result: **4 unit tests passed, 18 E2E tests passed in 31.3s**.

### 1.4 Home Cold-Load JavaScript Bundle Size Budget (< 75 kB gzip)
- **Production Build Command**: `npm run build --prefix novel-audio-synthesizer/frontend` (`vite build`).
- **Entry Scripts Referenced by `dist/index.html`**:
  ```html
  <script type="module" crossorigin src="/assets/index-SwJd2WGe.js"></script>
  <link rel="modulepreload" crossorigin href="/assets/react-vendor-DeMnUtHS.js">
  ```
- **Byte Measurements of Cold-Load JS (Computed via zlib gzip level 9)**:
  - `index-SwJd2WGe.js`:
    - Raw uncompressed: **93,401 bytes** (91.21 KiB)
    - Gzip compressed: **24,448 bytes** (23.88 KiB / 24.45 kB)
  - `react-vendor-DeMnUtHS.js`:
    - Raw uncompressed: **151,870 bytes** (148.31 KiB)
    - Gzip compressed: **49,054 bytes** (47.90 KiB / 49.05 kB)
  - **Total Cold-Load JavaScript Bundle**:
    - Raw uncompressed: **245,271 bytes** (239.52 KiB)
    - **Total Gzip: 73,502 bytes (71.78 KiB / 73.50 kB)**
- **Budget Threshold & Headroom**:
  - Target Budget: **<= 75 kB gzip**
  - If interpreted as decimal `75,000 bytes`: **73,502 bytes <= 75,000 bytes** -> **PASS** with **1,498 bytes (1.46 KiB) headroom**.
  - If interpreted as binary `75 KiB (76,800 bytes)`: **73,502 bytes <= 76,800 bytes** -> **PASS** with **3,298 bytes (3.22 KiB) headroom**.
- **Code Splitting & Lazy-Loading Inventory**:
  All routes and heavy modals in `src/App.jsx` are dynamically loaded via `React.lazy()`:
  - `NovelDetails` (`dist/assets/NovelDetails-*.js`: 15.54 kB raw / 4.16 kB gzip)
  - `ReaderView` (`dist/assets/ReaderView-*.js`: 43.81 kB raw / 11.24 kB gzip)
  - `UploadView` (`dist/assets/UploadView-*.js`: 2.09 kB raw / 0.84 kB gzip)
  - `ProfileView` (`dist/assets/ProfileView-*.js`: 4.27 kB raw / 1.27 kB gzip)
  - `AdminView` (`dist/assets/AdminView-*.js`: 3.53 kB raw / 1.02 kB gzip)
  - `AudioPlayer` (`dist/assets/AudioPlayer-*.js`: 11.26 kB raw / 3.68 kB gzip)
  - `SynthesisProgressBar` (`dist/assets/SynthesisProgressBar-*.js`: 2.67 kB raw / 1.10 kB gzip)
  - `SettingsModal` (`dist/assets/SettingsModal-*.js`: 7.37 kB raw / 1.64 kB gzip)
  - `CharacterRoster` (`dist/assets/CharacterRoster-*.js`: 5.19 kB raw / 2.03 kB gzip)
  - `foliate-js` (`dist/assets/foliate-*.js`: 121.02 kB raw / 43.90 kB gzip)
  - `pdfjs-dist` (`dist/assets/pdf-*.js`: 1,026.47 kB raw / 308.64 kB gzip)
  - `framer-motion` (`dist/assets/use-reduced-motion-*.js`: 86.89 kB raw / 31.17 kB gzip)

---

## 2. Logic Chain

1. **Premise 1 (Current Bundle Composition)**:
   On initial cold visit to `/`, the browser only loads `dist/index.html`, which requests `index-SwJd2WGe.js` and `react-vendor-DeMnUtHS.js`. No lazy chunks are requested on initial render.
2. **Premise 2 (Headroom Margin)**:
   The sum of `index-SwJd2WGe.js` (24,448 B gzip) and `react-vendor-DeMnUtHS.js` (49,054 B gzip) equals 73,502 B gzip. The distance to the 75,000 byte ceiling is only **1,498 bytes**.
3. **Premise 3 (Bundle Bloat Risk from Animation Libraries)**:
   `framer-motion` is currently imported *only* in `AuthModal.jsx`, `UploadChapterModal.jsx`, and `AddNovelModal.jsx`. Because those three modals are lazy-loaded, Vite isolates `framer-motion` into `use-reduced-motion-*.js` (31.17 kB gzip).
   - If any developer imports `framer-motion`, `m`, `motion`, or hooks from `framer-motion` into `App.jsx`, `NovelCatalog.jsx`, `TopHeader.jsx`, `SidebarNav.jsx`, or `NovelCover.jsx`, `framer-motion` will become a static dependency of the entry chunk.
   - Adding ~31.17 kB gzip to the entry chunk would push the cold-load size to ~104.7 kB gzip, immediately and severely violating the 75 kB budget.
4. **Premise 4 (Safe Animation Vector)**:
   `src/tokens/motion.js` and `src/index.css` define pure CSS micro-animations (`transform`, `opacity`, `scale`, CSS `linear()` springs, `@keyframes`, and `document.startViewTransition`). These add zero JavaScript payload.
5. **Premise 5 (Theme Lock Guardrail Sensitivity)**:
   `src/__tests__/theme_lock.test.js` enforces strict checks on CSS custom property counts (85 dark, 43 light). Adding or modifying color tokens without updating this contract or adding prohibited hues (OKLCH hue 34-38 cinnabar or blue tokens) will immediately fail Vitest.
   Furthermore, `e2e/theme-lock.spec.js` performs pixel-level canvas diffs against `docs/screenshots/theme-regression/ref/` with low thresholds (8.5% for home-dark, 10.5% for home-light). Visual changes that alter layout or computed background/header/card colors will trigger Playwright regression failures.

---

## 3. Caveats

1. **Pre-requisite Daemon Dependency for Playwright**:
   Playwright does not start the dev server automatically because `playwright.config.js` does not declare a `webServer` property. Both `http://localhost:5174` (frontend dev) and `http://localhost:4000` (backend API) must be running in the background for Playwright tests to execute successfully.
2. **Gzip Measurement Differences Across Tools**:
   Node.js `zlib.gzipSync(buf, { level: 9 })` produces 73,502 bytes (73.50 kB). Vite's internal rollup reporter prints uncompressed 93.37 kB + 151.87 kB and compressed 24.55 kB + 49.14 kB = 73.69 kB. Both measurements are below 75 kB, but the remaining margin is thin (~1.3 - 1.5 kB).
3. **Backend Service Health**:
   Backend tests (`test_sprint1.js` and `test_de_integrity.js`) require active local PostgreSQL 16 and MongoDB 7.0 instances. During survey, both databases were active and all backend tests passed 100%.

---

## 4. Conclusion

1. **Test Suite Baseline**:
   - Vitest: **115 / 115 passing tests** across 18 test files.
   - Playwright: **31 / 31 passing tests** (18 theme-lock + 13 hardening).
   - Backend: All sprint and data engineering integrity tests passing.
2. **Current Performance Budget Baseline**:
   - Home cold-load JavaScript bundle size is **73.50 kB gzip (73,502 bytes)**.
   - Budget `<= 75 kB gzip` is currently **MET** with **1,498 bytes headroom** (under decimal 75,000 B) or **3,298 bytes headroom** (under binary 76,800 B).
3. **Actionable Implementation Guardrails for Team**:
   - **DO NOT IMPORT `framer-motion` in Home components**: Any interaction polish or micro-animations on `NovelCatalog`, `NovelCover`, `SidebarNav`, `TopHeader`, or `App` must be implemented exclusively using pure CSS in `src/index.css` (e.g. using `transform`, `opacity`, `will-change`, and CSS springs) or `src/tokens/motion.js`.
   - **Zero Blue Rule & Theme Guardrails**: All colors must strictly conform to Sage Green (`#87A96B`), Walnut Brown (`#5A3E2B`), Amber Glow (`#D5851F`), and the Earthy Luxury palette. Any changes to `index.css` must maintain parity with `src/__tests__/theme_lock.test.js` and `e2e/theme-lock.spec.js`.
   - **Preserve SVG Icon Strategy**: Continue using pure SVG components in `src/components/icons.jsx` rather than importing icon libraries like `lucide-react`.

---

## 5. Verification Method

To independently reproduce and verify this entire survey:

1. **Verify Vitest Test Suite (115 passing tests)**:
   ```bash
   cd /Users/mohdfaizankhan/SyncTone-/novel-audio-synthesizer/frontend
   npm test
   # Expected: 18 passed (18), 115 passed (115)
   ```

2. **Verify Playwright Theme Lock & Hardening Suites**:
   ```bash
   cd /Users/mohdfaizankhan/SyncTone-/novel-audio-synthesizer/frontend
   # Ensure servers on 5174 and 4000 are running
   npx playwright test e2e/theme-lock.spec.js
   # Expected: 18 passed (18)
   npx playwright test e2e/hardening.spec.js
   # Expected: 13 passed (13)
   ```

3. **Verify Production Build and Measure Cold-Load JS Bundle Size**:
   ```bash
   cd /Users/mohdfaizankhan/SyncTone-/novel-audio-synthesizer/frontend
   npm run build
   node /Users/mohdfaizankhan/SyncTone-/.agents/teamwork/explorer_survey_3/measure_bundle.mjs
   # Expected: Total Home cold-load JS gzip <= 75,000 bytes (currently ~73,502 bytes)
   ```

4. **Invalidation Conditions**:
   - Any Vitest test fails or count drops below 115.
   - Total Home cold-load JS gzip exceeds 75,000 bytes (or 76,800 bytes).
   - Any Playwright theme lock color parity assertion fails or screenshot diff exceeds GEOMETRY_THRESHOLDS.
