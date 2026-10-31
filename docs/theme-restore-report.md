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

| Commit | File | Change Description | Visual? (Y/N) | Revert Plan (Step 2) |
| :--- | :--- | :--- | :--- | :--- |
| `3737cce` | `src/components/NovelCatalog.jsx` | Changed catalog cover aspect ratios from `aspect-[3/4]` to `aspect-[2/3]` in grid skeletons (`line 353`), top 10 carousel cards (`line 630`), and hybrid catalog cards (`line 717`). | **Y** | Restore `aspect-[3/4]` across grid skeletons, carousel cards, and hybrid catalog cards. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Changed featured billboard 3D book cover size/aspect from `w-48 sm:w-60 md:w-64 aspect-[3/4]` to `w-44 sm:w-56 md:w-60 aspect-[2/3] max-w-full` (`line 490`). | **Y** | Restore `w-48 sm:w-60 md:w-64 aspect-[3/4]` and remove `max-w-full`. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Added Sun/Moon theme toggle button to sticky catalog header (`lines 292–305`). | **Y** | Remove theme toggle button from `NovelCatalog.jsx` header (theme switching remains in `SidebarNav` as in `1879dd7`). |
| `3737cce` | `src/components/NovelCatalog.jsx` | Modified catalog header padding and height from `py-3.5 ... min-h-[64px]` to `py-3.5 md:py-0 ... min-h-[64px] md:h-16 flex-shrink-0` (`line 207`). | **Y** | Restore original `py-3.5 min-h-[64px]` and remove `md:py-0 md:h-16 flex-shrink-0`. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Changed hybrid novel card container from `flex flex-row sm:flex-col` to `flex flex-col min-[420px]:flex-row sm:flex-col` (`line 715`). | **Y** | Restore `flex flex-row sm:flex-col` and card cover width `w-28 sm:w-full`. |
| `cc7d0f4` | `src/components/NovelCatalog.jsx` | Added `overflow-x-clip max-w-full` to root catalog container `<div>` (`line 199`). | **Y** | Restore `<div className="space-y-10 pb-20">` without `overflow-x-clip max-w-full`. |
| `3737cce` | `src/components/NovelCatalog.jsx` | Added `focus-visible:ring-2 focus-visible:ring-[var(--accent)]` to Top 10 carousel list (`line 608`). | **Y** | Restore `<ol ref={carouselRef} className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 list-none scrollbar-none snap-x">`. |
| `3737cce` | `src/components/NovelCover.jsx` | Added `aspect-[2/3]` to real cover image container (`line 89`) and generative hardcover container (`line 109`). | **Y** | Remove `aspect-[2/3]` from both containers; let `NovelCover` fill parent container sizing as in `1879dd7`. |
| `3737cce` | `src/components/NovelCover.jsx` | Added unrequested `By {author}` text overlay. | **Y** | *Already reverted* in `cc7d0f4`. Keep verified without author overlay. |
| `3737cce` | `src/components/NovelCover.jsx` | Added `role="img" aria-label={`${title} cover`}` replacing `aria-hidden="true"`. | **N** | Keep non-visual accessibility attribute (produces zero visual difference). |
| `3737cce` | `src/components/primitives/Card.jsx` | Changed default prop `aspectRatio = '2/3'` and class `aspect-[2/3]` (`lines 23, 32`). | **Y** | Restore `aspectRatio = '3/4'` and `aspect-[3/4]`. |
| `3737cce` | `src/components/primitives/Skeleton.jsx` | Changed cover skeleton from `aspect-[3/4]` to `aspect-[2/3]` (`line 31`). | **Y** | Restore `aspect-[3/4]` on cover skeleton. |
| `3737cce` | `src/components/NovelDetails.jsx` | Changed novel detail cover skeleton (`line 78`) and hero poster (`line 153`) from `aspect-[3/4]` to `aspect-[2/3]`. | **Y** | Restore `aspect-[3/4]` on both skeleton and hero cover poster. |
| `4e90166` | `src/components/NovelDetails.jsx` | Added preload hooks `onMouseEnter={preloadUploadChapterModal}` and `onFocus`. | **N** | Keep non-visual prefetch trigger (produces zero visual difference). |
| `3737cce` | `src/components/TopHeader.jsx` | Added Sun/Moon theme toggle button (`lines 111–123`). | **Y** | Remove theme toggle button from `TopHeader.jsx`. |
| `3737cce` | `src/components/TopHeader.jsx` | Changed `<header className="sticky top-0 z-40 glass-header border-b">` to include `h-16 flex-shrink-0` with inner container `h-full` (`lines 29–30`). | **Y** | Restore `<header className="sticky top-0 z-40 glass-header border-b">` with inner container `h-16`. |
| `4e90166` | `src/components/TopHeader.jsx` | Added preload hooks `preloadAuthModal`, `preloadSettingsModal`, `preloadCharacterRoster` on hover/focus. | **N** | Keep non-visual prefetch triggers. |
| `3737cce` | `src/components/SettingsModal.jsx` | Rewrote technical engine architecture labels and copy to non-technical consumer copy (e.g. "Voice Cast & Narration", "1. Studio Cast Voices", "2. Expressive Offline Voices", "3. Device Speech"). | **Y** | Restore exact `1879dd7` technical labels ("TTS Synthesis Architecture", "3-Engine Fallback Chain & Live Status", "1. Microsoft Edge Neural TTS", "2. Kokoro-TTS ONNX Fallback", "3. Machine Local Speech Synthesis", "ONNX Ready", "Local Ready"). |
| `3737cce` | `src/index.css` | Added `html, body { overflow-x: hidden; max-width: 100vw; }`. | **Y** | *Already reverted* in `cc7d0f4`. `index.css` is currently 100% bitwise identical to `1879dd7`. |
| `50e24dc` | `src/components/ReaderView.jsx` | Toolbar button label: Checked for "OpenGL 3D" vs "3D". | **N** | In actual source code (`ReaderView.jsx:461`), the label is ALREADY `<span>OpenGL 3D</span>`. No revert needed. |
| `4e90166` | `src/App.jsx` | `ModalSkeleton` fallback renders pulsing skeleton placeholders with borders and boxes during lazy modal load (`lines 55–83`). | **Y** | Replace `ModalSkeleton` with zero-flash invisible fallback (e.g. `fallback={null}` or transparent backdrop) so modals open instantaneously without skeleton flashes. |
| `4e90166` | `src/App.jsx` | React Router v6 migration (`BrowserRouter`, `useNavigate`, `useLocation`) and lazy views (`RouteSkeleton`). | **N** (on core views) | Keep React Router v6, lazy routes, and deep links intact. |
| `4e90166` | `src/components/AuthModal.jsx`<br>`src/components/AddNovelModal.jsx`<br>`src/components/UploadChapterModal.jsx` | Migrated from monolithic `motion.*` to `LazyMotion` + `domAnimation` + `m.*`. | **N** | Keep `LazyMotion` and `domAnimation` (durations: `0.2s`, easings: `easeOut` are 100% identical to `1879dd7`). |
| `3737cce` | `src/components/SidebarNav.jsx` | Memoized `<Icon>` component, hover preload triggers, `aria-pressed`. | **N** | Keep memoized `<Icon>` and preloaders (zero visual delta). |
| `50e24dc` | `src/components/OpenGLPageReader.jsx`<br>`src/reader/*` | Extracted pure helpers into `paginate.js`, `PageNavButtons.jsx`, and `SpineShadowCanvas.jsx`. | **N** | Keep modular reader components (markup, canvas shaders, SVG chevrons are 100% identical to `1879dd7`). |
| `3737cce` | `src/hooks/useAudioSync.js` | Added rAF guard to prevent unnecessary synchronization renders. | **N** | Keep rAF guard (pure performance fix). |
| `4e90166` | `src/utils/ttsSanitizer.js` | Migrated from cheerio to browser-native `DOMParser`. | **N** | Keep `DOMParser` sanitizer (eliminates cheerio and reduces bundle size). |
| `4e90166` | `vite.config.js` | Split `react-vendor` chunk, dynamic chunking, visualizer exclusion. | **N** | Keep chunking configuration. |
| `d494882` | `public/offline.html`, `index.html` | Added auto-recovery from offline fallback upon connection reconnect. | **N** | Keep auto-recovery logic. |

---

## Architectural Work to Keep (Zero Visual Delta)

1. **Routing & Code Splitting**:
   - `react-router-dom` v6 routing, deep linking, browser back/forward history.
   - Dynamic `React.lazy` imports for non-Home routes and modals.
   - Separate `react-vendor` bundle (`react`, `react-dom`, `scheduler`, `react-router-dom`).
2. **Text & TTS Processing**:
   - DOMParser-based `ttsSanitizer.js` passing 100% of the golden test fixtures without cheerio.
   - 60fps rAF audio sync guard in `useAudioSync.js`.
3. **Reader Stubs & Modular Files**:
   - Extracted `paginate.js`, `PageNavButtons.jsx`, `SpineShadowCanvas.jsx`, and `fitBook.js` contracts.
4. **Resilience & Testing**:
   - PWA service worker with auto-recovery on network reconnect.
   - Full Vitest suite (114 unit tests) and Playwright E2E suites.

---

## Step 1 Status

Inventory is complete. Per the instructions, I have **STOPPED** after Step 1. Awaiting confirmation before proceeding to **Step 2 — Surgical Reverts**.
