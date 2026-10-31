# SyncTone Frontend Hardening Report — Audit & Honest Re-measurement

**Branch:** `redesign/opencode` (at commit `1879dd7`)  
**Date:** 2026-10-31  
**Status:** In Progress — Step 1 Re-measurement Complete (Step 2 Pending)  
**Visual Identity:** Atelier Obsidian (Dark) & Editorial Light, Cinnabar Accent (`--accent: #e0533c`), 2:3 poster cover format.

---

## 1. Honest Initial Bundle Measurement (Cold Load on Home)

On initial cold load of the Home page (`http://localhost:5174/`), the HTML document (`index.html`) directly requests/preloads the following JavaScript chunks:

| Chunk File | Purpose | Raw Size | Gzip Size |
|---|---|---|---|
| `assets/index-ks3ORg6W.js` | App entry & catalog shell | 171.7 kB | 42.8 kB |
| `assets/vendor-CwRHO-RW.js` | Shared dependencies (`react`, `react-dom`, `framer-motion`, etc.) | 565.6 kB | 188.1 kB |
| `assets/tts-cleaner-L5xwnaB7.js` | Module preload dependency | 3.6 kB | 1.6 kB |
| `registerSW.js` | Service worker registration | 0.1 kB | 0.1 kB |
| **TOTAL Initial JS on Home** | **Cold Load Total** | **741.0 kB** | **232.6 kB** |

### Comparison to Baseline
- **Baseline Initial Bundle:** 629.0 kB raw (194.4 kB gzip)
- **Current Cold Load Initial JS:** 741.0 kB raw (232.6 kB gzip)
- **Difference:** **+112.0 kB raw (+38.2 kB gzip)**

> **Honest Assessment:** The total initial JavaScript downloaded by the browser on Home is **not lower** than baseline; it is currently **19.6% higher gzip**. While `ReaderView` itself was split into a separate 44.6 kB lazy chunk, all vendor libraries (including newly added `framer-motion`) and all modals/panels (`AuthModal`, `AddNovelModal`, `UploadChapterModal`, `SettingsModal`, `CharacterRoster`) are statically imported at the top of `App.jsx`, pulling `vendor` into the critical path on cold load. This will be remediated in Step 2 by lazy-loading non-critical modals and refining vendor code splitting.

---

## 2. Service Worker Precache Analysis

From inspection of the generated service worker manifest (`dist/sw.js`), the following assets are currently registered in `precacheAndRoute`:

| Asset | Size | Flag (>300 kB) | Issue |
|---|---|---|---|
| `assets/pdf-pl3eX39Z.js` | 1,026.5 kB | **FLAGGED (> 1 MB)** | Heavy PDF rendering engine should NOT be precached on Home; should be runtime-cached on demand. |
| `assets/vendor-CwRHO-RW.js` | 565.6 kB | **FLAGGED (> 300 kB)** | Monolithic vendor chunk precached unconditionally. |
| `assets/foliate-QZHYQh3b.js` | 121.3 kB | OK (< 300 kB) | E-reader engine for EPUB reading. |
| `assets/ReaderView-BOpAD0eT.js` | 44.6 kB | OK | Reader view chunk. |
| `assets/index-ks3ORg6W.js` | 171.7 kB | OK | App shell. |
| `assets/index-CmQOio0K.css` | 89.7 kB | OK | Stylesheet. |
| `assets/*.woff2` (15 font files) | 415.8 kB (combined) | OK | UI and reading typography. |
| SVG icons & offline fallback | 4.8 kB | OK | App shell assets. |

> **Precache Remediation Required:** The service worker currently downloads **~2.4 MB** during install, dominated by `pdf-*.js` (1.03 MB). `pdf`, `foliate`, and other non-shell reader chunks must be excluded from precaching and moved to runtime caching on demand.

---

## 3. Complete Per-Item Status Table

| Item | Target File(s) | Status | Details / Reason |
|---|---|---|---|
| **1A. Search Debounce** | `src/hooks/useDebounce.js`, `src/components/NovelCatalog.jsx` | **FIXED** | Added 200ms debounce hook for catalog filter; instant input reflection preserved. |
| **1B. NovelCatalog AbortController** | `src/components/NovelCatalog.jsx` | **FIXED** | Added `AbortController` in `useEffect([channel])` to cancel and ignore stale requests. |
| **1C. useAudioSync rAF Loop** | `src/hooks/useAudioSync.js` | **NOT DONE** | While cleanup exists, `syncLoop` still needs an internal paused guard (`if (!isPlaying) return`) to guarantee zero extraneous ticks. |
| **1D. AudioPlayer Waveform** | `src/components/AudioPlayer.jsx` | **NOT DONE** | Canvas waveform visualizer with memoized peaks and offscreen layer was not implemented; only progress bar exists. |
| **1E. Lazy-load Heavy Libs** | `src/App.jsx`, `vite.config.js` | **NOT DONE** | ReaderView is lazy, but modals/Settings/Upload are statically imported; cold-load JS is 741 kB (higher than baseline). |
| **1F. ErrorBoundary** | `src/components/ErrorBoundary.jsx`, `src/App.jsx` | **FIXED** | Reusable class ErrorBoundary created and placed top-level, around ReaderView, and around AudioPlayer. |
| **1G. SidebarNav Memoized Icon** | `src/components/SidebarNav.jsx` | **NOT DONE** | Icons are imported individually as separate components; single memoized `<Icon name="..." />` dispatcher not built. |
| **2A. API Client Error Mapping & Retries** | `src/services/api.js` | **FIXED** | Replaced raw status codes with plain copy; added bounded backoff retries for idempotent GET requests. |
| **2B. Toast Error Integration** | `src/context/ToastContext.jsx`, `src/main.jsx` | **FIXED** | Created global Toast provider with `aria-live="polite"` and auto-dismiss after 5s. |
| **2C. Settings Copy Sanitization** | `src/components/SettingsModal.jsx` | **NOT DONE** | Engine labels were restored to satisfy unit tests, but missing/uninitialized guidance messaging is still basic. |
| **2D. react-router-dom Migration** | `src/App.jsx` | **NOT DONE** | Skipped in previous pass due to risk of breaking tests; still relies on manual `view` state machine. |
| **2E. JWT & Cookie Storage** | `src/services/api.js`, backend `src/routes/auth.js` | **ALREADY FIXED** | Inspected backend & client: JWT is strictly managed via HttpOnly, Secure, SameSite=Lax cookies with `credentials: 'include'`. |
| **3A. Fixed Header & Padding** | `src/components/NovelCatalog.jsx` | **NOT DONE** | Uses `min-h-[64px]` instead of fixed `h-16`, and lacks a visible theme toggle in the header. |
| **3B. Channel Tabs Keyboard Nav** | `src/components/NovelCatalog.jsx` | **FIXED** | Roving tabindex with `ArrowRight`, `ArrowLeft`, `Home`, and `End` keys implemented. |
| **3C. Billboard Controls & Reduced Motion** | `src/components/NovelCatalog.jsx` | **FIXED** | Explicit Prev/Next buttons added; pauses on hover, focus, and when `prefers-reduced-motion` is active. |
| **3D. Novel Card 2:3 Aspect & 320px Overflow** | `src/components/NovelCatalog.jsx`, `src/components/NovelCover.jsx` | **NOT DONE** | Card cover currently uses `aspect-[3/4]` instead of `aspect-[2/3]`; 320px narrow-screen overflow needs tightening. |
| **3E. Modal ARIA & Motion** | `src/components/AuthModal.jsx`, `src/components/AddNovelModal.jsx`, `src/components/UploadChapterModal.jsx` | **FIXED** | Framer Motion scale/fade animations added; Esc key, `role="dialog"`, `aria-modal="true"`, and focus restoration implemented. |
| **3F. Reader Small-Screen Navigation** | `src/components/ReaderView.jsx` | **NOT DONE** | Fullscreen toggle was added, but small-screen page navigation drawer/bottom bar is not yet implemented. |
| **4. PWA Safe Precaching** | `vite.config.js`, `public/` | **NOT DONE** | Service worker is generated, but precaches `pdf-*.js` (1.03 MB) and `vendor-*.js` (565 kB) instead of excluding them. |
| **5. Playwright E2E & Axe WCAG Audits** | `e2e/hardening.spec.js`, `playwright.config.js` | **FIXED** | 7 tests created and passing, including Axe WCAG 2.2 AA audit on Home with 0 critical violations. |
