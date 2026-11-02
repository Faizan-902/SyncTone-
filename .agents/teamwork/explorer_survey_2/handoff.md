# SyncTone UI Component, Route & Interaction Polish Survey

**Explorer**: `teamwork_explorer` (`explorer_survey_2`)  
**Date**: 2026-11-02  
**Target Application**: SyncTone (AI-powered web-novel library and multi-voice audiobook platform)  
**Report Type**: Comprehensive Exploration Survey & Polish Opportunity Blueprint  

---

## 1. Observation

### 1.1 Test Suite & Performance Budget Baseline
- **Vitest Test Suite**: Running `npm test --prefix novel-audio-synthesizer/frontend` executes **18 test files** with **115 passing tests** (0 failures).
- **Theme Lock Validation**: `src/__tests__/theme_lock.test.js` enforces strict token count and exact color coordinates:
  - Dark mode (`:root, html.dark`): exactly **85 custom properties** (`expect(Object.keys(darkVars).length).toBe(85)`).
  - Light mode (`html.light`): exactly **43 custom properties** (`expect(Object.keys(lightVars).length).toBe(43)`).
  - Zero Cinnabar regex test (`#e0533c`, `#c83d27`, hue 34-38 oklch) passing.
  - Zero Blue enforcement: No blue classes (`bg-blue-*`, `text-blue-*`, `cyan`, `sky`, `indigo`) exist in `src/`.
- **Home Cold-Load JavaScript Bundle Size**:
  Running `npm run build --prefix novel-audio-synthesizer/frontend` (Vite v5.4.21):
  - `dist/assets/react-vendor-DeMnUtHS.js`: **151.87 kB** (raw) │ **49.14 kB gzip**
  - `dist/assets/index-SwJd2WGe.js`: **93.37 kB** (raw) │ **24.55 kB gzip**
  - **Total Cold-Load JavaScript**: **73.69 kB gzip** (Budget: `<= 75.00 kB gzip`). Headroom: **1.31 kB gzip**.
  - Note: Heavy dependencies such as `pdfjs-dist` (308.64 kB gzip), `foliate-js` (43.90 kB gzip), and `framer-motion` (`use-reduced-motion-*.js`, 31.17 kB gzip) are cleanly code-split and only loaded lazily on demand.

---

### 1.2 Route & Page View Map
SyncTone routes are mapped in `novel-audio-synthesizer/frontend/src/App.jsx` (lines 108–128) using React Router DOM (`useLocation`, `useNavigate`):

| Route Path | View Component | Status | Key Subviews & Elements |
| :--- | :--- | :--- | :--- |
| `/` | `NovelCatalog.jsx` (Home) | Direct import (critical path) | Master sticky glass header, search input (`/` shortcut), channel tabs (`Verified`, `Community`, `All`), Netflix-style 6s auto-rotating Billboard hero, Top 10 Today ranked carousel (`<ol>` with JetBrains Mono numbers), Hybrid card responsive grid (`novel-card-hybrid`), Author studio publish section, local dev delete confirmation modal. |
| `/novel/:id` | `NovelDetails.jsx` | Lazy-loaded (`React.lazy`) | TopHeader breadcrumbs, 3:4 gilded cover poster, title/author typography, Start Listening CTA, Add to Library toggle, Upload Chapter trigger, 2-column synopsis & cast summary, segmented control tabs (Chapter Directory vs Character Cast), chapter tracklist with play buttons, character portfolio with sample quotes. |
| `/reader/:chapterId` | `ReaderView.jsx` | Lazy-loaded (`React.lazy`) | Sticky reader subheader (novel/chapter breadcrumb, reading mode switcher, Serif/Sans font toggle, A-/A+ font size stepper, TTS clean sanitizer toggle, Focus Mode toggle, Fullscreen toggle), continuous vertical scroll prose reader (WTR-Lab style) with speaker labels, active audio turn aura, floating "Return to now" pill, fallback state when chapters have no audio. |
| `/reader/:chapterId` (3D Mode) | `OpenGLPageReader.jsx` | Sub-view of `ReaderView` | Apple Books / Moon+ Reader Pro 3D book simulator, two-page side-by-side spread stage, hardware-accelerated `SpineShadowCanvas.jsx`, 3D page curl transition (`page-curl-flip-next`, `page-curl-flip-prev`), chapter heraldic crest / opening illustration, floating navigation chevrons (`PageNavButtons.jsx`), ↩ jump-back pill. |
| Sticky Audio Dock | `AudioPlayer.jsx` | Lazy-loaded (`App.jsx:506`) | Pinned bottom dock (`glass-dock`), accessible scrubber slider with `scaleX` fill and hover thumb, Media Session API integration, transport buttons (skip -10s, prev turn, play/pause, next turn, skip +10s), 3-engine selector (Microsoft Edge, Kokoro, Machine TTS), playback mode toggle (Studio vs Voice TTS), speed pill (0.75x–2.0x), hover volume popover slider. |
| Drawer | `CharacterRoster.jsx` | Lazy-loaded (`App.jsx:544`) | Right-hand slide-over drawer (`animate-slideLeft`), character line counters, sample quote cards, voice assignment dropdown with optimistic update and rollback error recovery. |
| `/upload` | `UploadView.jsx` | Lazy-loaded (`App.jsx:472`) | Author publishing studio callout, RBAC gate for writers/admins, launch `AddNovelModal`. |
| `/profile` | `ProfileView.jsx` | Lazy-loaded (`App.jsx:484`) | Member profile view, avatar initials, role badge, session status, library sync metrics. |
| `/admin` | `AdminView.jsx` | Lazy-loaded (`App.jsx:496`) | System administration, voice synthesis engine readiness, library publications overview. |
| Modal | `AuthModal.jsx` | Lazy-loaded (`App.jsx:565`) | Accessible login & registration tabbed modal with Framer Motion spring backdrop and panel. |
| Modal | `AddNovelModal.jsx` | Lazy-loaded (`App.jsx:575`) | Multi-step novel importer (drag-and-drop EPUB, PDF, MOBI, AZW3, TXT), client/server extraction, chapter parsing preview, TTS DOM cleaner toggle, metadata inputs. |
| Modal | `UploadChapterModal.jsx` | Lazy-loaded (`App.jsx:594`) | Chapter title, number, prose textarea, TTS DOM cleaner toggle. |
| Modal | `SettingsModal.jsx` | Lazy-loaded (`App.jsx:606`) | Reading & Audio Preferences modal, 3-tier voice status display, theme switcher, font switcher, text size stepper. |

---

### 1.3 UI Component & Primitives Inventory

SyncTone maintains a dedicated library of UI primitives under `src/components/primitives/`:

| Component | File Path | Lines | WCAG / Touch Target | Implementation Details |
| :--- | :--- | :--- | :--- | :--- |
| `Button` | `src/components/primitives/Button.jsx` | 82 | Min 44px (`min-h-[44px]`) | Variants: `primary`, `secondary`, `ghost`, `outline`, `danger`. Sizes: `sm`, `md`, `lg`, `icon`. Handles `isLoading` with spinning SVG. Has `active:scale-[0.98]`. |
| `Card` | `src/components/primitives/Card.jsx` | 123 | Stretched-link pattern | Fixed 3:4 aspect ratio cover zone, eyebrow, title, narrator pill, reserved 2-line synopsis box (`synopsis-reserved-box`), bottom action row. |
| `Dialog` | `src/components/primitives/Dialog.jsx` | 140 | Focus trap + Escape | React Portal to `document.body`, background scrim backdrop-blur, `role="dialog"`, `aria-modal="true"`, focus restore on close, body scroll lock. |
| `Input` | `src/components/primitives/Input.jsx` | 102 | Linked `<label>` | Accessible input with floating helper text, error state with `aria-invalid="true"`. |
| `Row` | `src/components/primitives/Row.jsx` | 108 | Min 44px hit target | List item primitive for chapter tracks and roster entries. |
| `SegmentedControl` | `src/components/primitives/SegmentedControl.jsx` | 96 | Min 44px hit target | `role="radiogroup"`, `role="radio"`, keyboard roving tabindex (ArrowLeft/Right, Home/End). |
| `Skeleton` | `src/components/primitives/Skeleton.jsx` | 92 | `aria-busy="true"` | Shimmer and pulse placeholders for cards, text lines, list rows, avatar circles. |
| `StatusBadge` | `src/components/primitives/StatusBadge.jsx` | 64 | Contrast tested | Semantic badges (`success`, `warning`, `danger`, `info`) with subtle tint backgrounds. |
| `Switch` | `src/components/primitives/Switch.jsx` | 82 | Min 44px hit target | `role="switch"`, `aria-checked`, spacebar/enter keyboard toggling, sliding thumb. |
| `Tabs` | `src/components/primitives/Tabs.jsx` | 92 | `role="tablist"` | Tab navigation primitive with roving tabindex. |
| `Toast` | `src/components/primitives/Toast.jsx` | 100 | `role="status"` | Auto-dismiss timer, pause on hover, semantic status icons. |
| `Tooltip` | `src/components/primitives/Tooltip.jsx` | 81 | `role="tooltip"` | Hover & focus activation with delay, Escape key dismiss, `aria-describedby` link. |

---

### 1.4 Critical Codebase Gaps Observed

During line-by-line inspection of all views and styling definitions, several critical visual, interaction, and performance issues were discovered:

#### 1. Broken / Undefined CSS Animation Classes
- **`animate-fade-in` (kebab-case) is undefined**:
  - `ReaderView.jsx:173`: `<div className="... animate-fade-in">`
  - `ReaderView.jsx:304`: `<div className="... animate-fade-in">`
  - `Tooltip.jsx:71`: `<div className="... animate-fade-in">`
  - `OpenGLPageReader.jsx:501, 502, 577, 650`: `<div className="... animate-fade-in">`
  - *Observation*: `tailwind.config.js:113` only defines `fadeIn` (which generates `animate-fadeIn` in camelCase). Neither `tailwind.config.js` nor `index.css` defines `animate-fade-in`. Thus, all these tooltips, empty states, banners, and 3D page spreads pop into the DOM abruptly without any transition.
- **`animate-slideDown` is undefined**:
  - `App.jsx:355`: `<div className="mb-4 p-3.5 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] shadow-xl flex items-center justify-between text-xs animate-slideDown">`
  - *Observation*: `animate-slideDown` is not defined anywhere in Tailwind or `index.css`. The playback resume toast appears with zero animation.
- **`fadeInUp` in `ToastContext.jsx` is undefined**:
  - `ToastContext.jsx:33`: `style={{ animation: 'fadeInUp 0.2s ease' }}`
  - *Observation*: `fadeInUp` keyframe is not defined anywhere in the codebase.
- **Broken Equalizer Bars in AudioPlayer**:
  - `AudioPlayer.jsx:309–313`:
    ```jsx
    <div className="flex items-end gap-0.5 h-4 w-4 justify-center">
      <span className="w-1 bg-[var(--accent)] rounded-full eq-bar-1" />
      <span className="w-1 bg-[var(--accent)] rounded-full eq-bar-2" />
      <span className="w-1 bg-[var(--accent)] rounded-full eq-bar-3" />
    </div>
    ```
  - *Observation*: `eq-bar-1`, `eq-bar-2`, and `eq-bar-3` are not defined anywhere in `index.css` or `tailwind.config.js`. Because `<span>` has `w-1` and `rounded-full` but no height or animation, the mini equalizer in the player dock renders as invisible 0px dots instead of an animated bouncing visualizer.
- **Static Voice Visualizer on Billboard Hero**:
  - `NovelCatalog.jsx:441–452`: Renders 8 static bars using `style={{ height: `${Math.sin(bar) * 6 + 8}px`, opacity: 0.7 }}`. These bars have zero animation or motion; they are frozen in time even while audio is described as live or auto-rotating.

#### 2. Unused External Google Fonts in `index.html`
- `index.html:25–30` requests Google Fonts:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:...&family=Literata:...&family=Plus+Jakarta+Sans:...&display=swap" rel="stylesheet" />
  ```
- *Observation*: A full grep search of `novel-audio-synthesizer/frontend` reveals that `Literata` and `Plus Jakarta Sans` are **never referenced anywhere in any CSS, JSX, or Tailwind configuration** (`index.css` imports `@fontsource-variable/newsreader`, `@fontsource-variable/inter`, and `@fontsource-variable/jetbrains-mono`).
- *Impact*: Every cold page load makes 2 render-blocking external HTTP requests to Google Fonts for unused font files, increasing latency and TTFB without rendering a single pixel.

#### 3. Tactile Feedback Deficits (No Active Press Feedback on Key Controls)
- `SidebarNav.jsx`: Buttons have `hover:scale-105 transition-transform`, but lack `active:scale-95` tactile click feedback.
- `AudioPlayer.jsx`: Transport buttons (Skip -10s, Prev, Next, Skip +10s) only have `hover:bg-[var(--bg-hover)]`; clicking them produces no visual depression or tactile feedback.
- `NovelCatalog.jsx`: Top 10 carousel scroll arrows (`IconChevronLeft`, `IconChevronRight`) have `hover:border-[var(--border-focus)]`, but lack active scale depression.
- `TopHeader.jsx`: Settings and auth buttons lack active tactile micro-press response.

#### 4. Scrubber Timecode Preview Gap
- `AudioPlayer.jsx:264–297`: The audio scrubber track expands on hover (`group-hover:h-2.5`) and reveals a white thumb indicator, but lacks a floating timecode tooltip following the cursor (e.g. `02:14`). Users must blindly click without knowing the exact timestamp they are scrubbing to.

#### 5. Toast Disconnect
- `ToastContext.jsx:29–48`: Implements an ad-hoc inline toast notification div that does not use the accessible `Toast.jsx` primitive (`src/components/primitives/Toast.jsx`). The ad-hoc toast lacks semantic icons and has broken animation.

#### 6. Color Token Drift in `OpenGLPageReader.jsx`
- `OpenGLPageReader.jsx:511, 535, 553, 564, 622, 637, 712, 728`: Uses Tailwind `stone-*` utility classes (`stone-200`, `stone-300`, `stone-600`, `stone-800`, `dark:bg-[#050507]`, `bg-[#fcfaf6]`) rather than the locked Earthy Luxury tokens (`var(--bg-card)`, `var(--bg-surface)`, `var(--text-main)`, `var(--text-sub)`, `var(--border-subtle)`).

---

## 2. Logic Chain

1. **Premise 1 (Design Goal)**: The mandate is to deliver "award-winning smoothness" and "premium feel" across all pages, micro-animations, typography, depth effects, and tactile feedback, while observing the zero-blue rule, the 115 passing Vitest tests, and the `<= 75 kB gzip` cold-load JavaScript bundle size budget.
2. **Premise 2 (Performance Headroom)**:
   - Observation 1.1 showed cold-load JavaScript is currently at **73.69 kB gzip**, leaving **1.31 kB gzip headroom** before the 75.00 kB budget.
   - Any attempt to import heavy animation libraries (like `framer-motion` at 31 kB gzip) into root routes or the Home catalog would immediately blow past the 75 kB budget (reaching ~104 kB gzip).
   - *Deduction*: All micro-animations, hover states, active clicks, and transitions on Home, Catalog, TopHeader, Sidebar, and AudioPlayer **must be implemented via compositor-only CSS transforms (`transform`, `opacity`) and CSS keyframes**, keeping JS bundle size growth strictly below 1.3 kB.
   - Removing the unused Google Fonts from `index.html` (Observation 1.4.2) will further improve Network Waterfall and Cold-Load FCP without touching bundle size.
3. **Premise 3 (Animation Fixes & Consistency)**:
   - Observation 1.4.1 revealed that `animate-fade-in`, `animate-slideDown`, `fadeInUp`, and `eq-bar-*` are completely missing from CSS definitions, causing UI components (tooltips, banners, toasts, equalizers) to snap into view without animation.
   - *Deduction*: Adding canonical keyframes (`@keyframes fadeIn`, `@keyframes slideDown`, `@keyframes eqBounce`) and standardizing utility classes in `tailwind.config.js` and `index.css` directly resolves all broken micro-animations with zero layout shifts and negligible bytes.
4. **Premise 4 (Tactile Polish & Spring Physics)**:
   - Modern premium interfaces (e.g. Apple Books, Linear, Spotify) rely on subtle active spring compression (`active:scale-[0.97]` or `active:scale-95`) with quick transition curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Adding `active:scale-95 transition-transform duration-120 ease-out` to transport controls, nav items, and carousel buttons transforms the tactile feel from "flat web document" to "native tactile appliance".
5. **Premise 5 (Color Guardrails & Theme Lock Integration)**:
   - The user request requires integrating **Sage Green (`#87A96B`)**, **Walnut Brown (`#5A3E2B`)**, and **Amber Glow (`#D5851F`)** alongside the Earthy Luxury palette.
   - Observation 1.1 showed that `theme_lock.test.js` strictly asserts the exact count (85 dark, 43 light) and values of root custom properties in `index.css`.
   - *Deduction*: Adding Tailwind theme extensions (`sage: '#87A96B'`, `walnut-deep: '#5A3E2B'`, `amber-glow: '#D5851F'`) in `tailwind.config.js` and updating `speakerColors.js` (which is not locked by `theme_lock.test.js`) allows seamless integration of all three colors across badges, visualizers, speaker pills, and active indicators without breaking any of the 115 Vitest tests or theme-lock assertions.

---

## 3. Caveats

1. **Theme Lock Invariance**: The 85 Dark Mode and 43 Light Mode root custom properties in `index.css` are locked by `src/__tests__/theme_lock.test.js`. Adding or renaming CSS custom properties inside `:root, html.dark` or `html.light` without updating the snapshot test will cause test failures. Theme color additions must be applied via Tailwind utilities or additive classes.
2. **Cold-Load Budget Rigidity**: With only **1.31 kB gzip headroom** on the Home page, implementers must avoid importing new npm packages or adding large inline SVG graphs on root routes. All icons must continue using the lightweight SVG icons in `icons.jsx`.
3. **Hardware Acceleration & Canvas**: `SpineShadowCanvas.jsx` relies on HTML5 Canvas 2D contexts. In headless test environments (`jsdom`), `getContext('2d')` returns null, which is guarded via graceful fallbacks (`if (!ctx) return;`). Any canvas enhancements must preserve this guard.
4. **Reduced Motion Compliance**: Any new micro-animation must be included in the `@media (prefers-reduced-motion: reduce)` block in `index.css` to comply with WCAG 2.3.3.

---

## 4. Conclusion & Actionable Polish Blueprint

To achieve "award-winning smoothness" and "premium feel", the survey identifies specific, prioritized, high-impact improvements organized by view and component:

### Actionable Polish Matrix

| Target Component | File Path | Current Gap | Recommended Polish Action |
| :--- | :--- | :--- | :--- |
| **Audio Scrubber** | `src/components/AudioPlayer.jsx` (lines 264–297) | No hover timecode tooltip; flat thumb. | Add a floating cursor-following timestamp badge (e.g. `03:45`) on mousemove over the scrubber track. Add subtle spring physics to thumb expand (`transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1)`). |
| **Mini Equalizer** | `src/components/AudioPlayer.jsx` (lines 309–313) | `eq-bar-1/2/3` are undefined; equalizer renders as static 0px invisible dots. | Bind bars to `equalizer-bar` utility with staggered animation delays (`0ms`, `150ms`, `300ms`) and dynamic height scaling. Pauses when `isPlaying` is false. |
| **Transport Buttons** | `src/components/AudioPlayer.jsx` (lines 332–384) | Flat hover; no tactile active press depression. | Add `active:scale-90 transition-transform duration-100 ease-out` on skip -10s, prev turn, next turn, skip +10s. |
| **Missing CSS Keyframes** | `src/tailwind.config.js` & `src/index.css` | `animate-fade-in`, `animate-slideDown`, and `fadeInUp` are broken classes. | Add `@keyframes slideDown` and alias `fade-in` to `fadeIn` in `tailwind.config.js`. Define smooth entrance for resume banners and tooltips. |
| **Billboard Visualizer** | `src/components/NovelCatalog.jsx` (lines 441–452) | 8 voice visualizer bars are completely static (`Math.sin`). | Add subtle animated height pulsing (`animation: eq-bounce 1.2s ease-in-out infinite alternate`) with staggered animation delays, bringing the marquee hero to life. |
| **Top 10 Carousel** | `src/components/NovelCatalog.jsx` (lines 584–598) | Flat chevron buttons; harsh horizontal scroll. | Add `active:scale-90` tactile feedback to navigation chevrons. Add scroll snap smoothing (`scroll-behavior: smooth`). |
| **Sidebar Navigation** | `src/components/SidebarNav.jsx` (lines 60–156) | Browser default HTML `title="..."` tooltips; no active click scale. | Replace HTML `title` with floating glass `Tooltip` primitive. Add `active:scale-95` on navigation icons. |
| **Toast System** | `src/context/ToastContext.jsx` (lines 28–48) | Uses ad-hoc unstyled markup with broken `fadeInUp` animation. | Refactor `ToastContext.jsx` to render the accessible `Toast.jsx` primitive (`src/components/primitives/Toast.jsx`) with semantic icons and auto-dismiss. |
| **Unused Google Fonts** | `index.html` (lines 25–30) | Loads `Plus Jakarta Sans` and `Literata` via Google Fonts, but neither is used. | Remove the unused font `<link>` to save ~2 HTTP roundtrips on cold page load. |
| **Major Color Palette Integration** | `src/tailwind.config.js` & `src/utils/speakerColors.js` | Sage Green, Walnut Brown, Amber Glow not yet mapped as major tokens. | Add `sage: '#87A96B'`, `walnut-deep: '#5A3E2B'`, `amber-glow: '#D5851F'` to Tailwind and integrate Sage Green into Match ratings / Live Sync, Walnut Brown into button active states, and Amber Glow into Top Pick badges and equalizer accents. |
| **OpenGL Page Reader** | `src/components/OpenGLPageReader.jsx` (lines 511–728) | Hardcoded Tailwind `stone-*` classes drift from Earthy Luxury tokens. | Replace `stone-*` classes with semantic theme classes (`theme-card`, `theme-surface`, `theme-sub`, `theme-heading`). |

---

## 5. Verification Method

To verify these findings independently or test subsequent implementations:

1. **Verify 115 Tests Passing**:
   ```bash
   npm test --prefix novel-audio-synthesizer/frontend
   ```
   *Expected*: `18 passed (18) test files, 115 passed (115) tests`.

2. **Verify Theme Lock & Zero-Blue Enforcement**:
   ```bash
   npx vitest run src/__tests__/theme_lock.test.js --dir novel-audio-synthesizer/frontend
   ```
   *Expected*: All 4 test assertions pass (85 dark properties, 43 light properties, 0 Cinnabar leaks, 0 blue tokens).

3. **Verify Cold-Load JavaScript Bundle Budget (`<= 75 kB gzip`)**:
   ```bash
   npm run build --prefix novel-audio-synthesizer/frontend
   ```
   *Expected*: Total cold-load JS (`dist/assets/index-*.js` + `dist/assets/react-vendor-*.js`) is `<= 75.00 kB gzip`.

4. **Verify Broken Animation Classes Search**:
   ```bash
   # Confirm missing classes
   grep -rn "animate-fade-in" novel-audio-synthesizer/frontend/src/
   grep -rn "animate-slideDown" novel-audio-synthesizer/frontend/src/
   grep -rn "eq-bar-1" novel-audio-synthesizer/frontend/src/
   ```

5. **Invalidation Conditions**:
   - If cold-load JS exceeds 75.00 kB gzip, R3 is invalidated.
   - If any blue token (`#0000ff`, `sky`, `cyan`, `indigo`) is introduced, R2 is invalidated.
   - If any of the 115 Vitest tests fail, acceptance criteria are invalidated.

---
*Report prepared and self-verified by `teamwork_explorer`.*
