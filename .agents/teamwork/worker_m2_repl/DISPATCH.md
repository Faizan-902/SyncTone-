## 2026-11-02T18:34:00Z
You are a Worker subagent for SyncTone Milestone 2 (Replacement for stalled worker).
Your identity: teamwork_worker
Your working directory: /Users/mohdfaizankhan/SyncTone-/.agents/teamwork/worker_m2_repl/
Parent conversation ID: 90768a0d-ba01-4ed2-8dd4-ad61d7db59c5

MANDATORY FIRST STEP:
Read /Users/mohdfaizankhan/SyncTone-/.agents/teamwork/ORIGINAL_REQUEST.md, /Users/mohdfaizankhan/SyncTone-/PROJECT.md, and /Users/mohdfaizankhan/SyncTone-/TEST_READY.md before doing anything else.
Also consult the survey findings in /Users/mohdfaizankhan/SyncTone-/.agents/teamwork/explorer_survey_2/handoff.md and previous progress at /Users/mohdfaizankhan/SyncTone-/.agents/teamwork/worker_m2/progress.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP (Milestone 2):
You own these files exclusively for this milestone:
- novel-audio-synthesizer/frontend/src/index.css
- novel-audio-synthesizer/frontend/tailwind.config.js
- novel-audio-synthesizer/frontend/src/components/AudioPlayer.jsx
- novel-audio-synthesizer/frontend/src/components/NovelCatalog.jsx
- novel-audio-synthesizer/frontend/src/components/SidebarNav.jsx
- novel-audio-synthesizer/frontend/src/components/TopHeader.jsx
- novel-audio-synthesizer/frontend/src/components/primitives/Button.jsx
- novel-audio-synthesizer/frontend/src/context/ToastContext.jsx
- novel-audio-synthesizer/frontend/index.html

YOUR ASSIGNMENT: Complete Milestone 2 — Micro-Animations, Tactile Physics, Glass/Depth & Component Polish
1. CSS Keyframe Repairs & Animation Classes:
   - In `tailwind.config.js` and `src/index.css`:
     - Ensure `animate-fade-in` (kebab-case) is defined (aliased to `fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)`).
     - Add `@keyframes slideDown` and alias `slideDown: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'`.
     - Add `@keyframes fadeInUp` and alias `fadeInUp: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'`.
     - Define `eq-bar-1`, `eq-bar-2`, `eq-bar-3` and `@keyframes eqBounce` in `index.css` so AudioPlayer mini-equalizer bars bounce fluidly when playing, with reduced-motion overrides.
2. AudioPlayer & Visualizer Polish:
   - In `AudioPlayer.jsx`:
     - Scrubber timecode hover preview: Add a floating badge showing timecode (e.g. `02:14`) tracking cursor on hover/drag over the scrubber track.
     - Transport buttons: Add tactile depression `active:scale-90 transition-transform duration-100 ease-out` on skip -10s, prev, play/pause, next, skip +10s.
     - Mini equalizer: Bind bars with staggered animation delays (`0ms`, `150ms`, `300ms`) and dynamic height scaling. Pauses when `!isPlaying`.
   - In `NovelCatalog.jsx`:
     - Billboard voice visualizer: Animate the 8 bars using smooth CSS pulsing keyframes when audio is live or auto-rotating.
     - Top 10 carousel scroll arrows: Add `active:scale-90` tactile feedback.
3. Tactile Spring Physics across Core Controls:
   - In `Button.jsx`: Ensure crisp tactile press feedback (`active:scale-[0.98]` or `active:scale-95`).
   - In `SidebarNav.jsx`: Add `active:scale-95` on navigation icon buttons.
   - In `TopHeader.jsx`: Add `active:scale-95` on action buttons.
4. Glass, Depth & Toast Polish:
   - In `ToastContext.jsx`: Refactor to render the accessible `Toast.jsx` primitive (`src/components/primitives/Toast.jsx`) with semantic status icons.
   - In `index.html`: Remove unused Google Fonts (`Plus Jakarta Sans`, `Literata`) from the `<link>` to eliminate render-blocking HTTP roundtrips.
5. PERFORMANCE BUDGET GUARDRAIL (CRITICAL):
   - Under NO circumstances import `framer-motion` into any Home page component (`App.jsx`, `NovelCatalog.jsx`, `NovelCover.jsx`, `SidebarNav.jsx`, `TopHeader.jsx`, `Button.jsx`).
   - Home cold-load JavaScript bundle size MUST remain <= 75,000 bytes gzip.
6. Verification Requirements:
   - Run `npm test --prefix novel-audio-synthesizer/frontend` (all 115 tests must pass).
   - Run `npm run build --prefix novel-audio-synthesizer/frontend` (verify clean build and bundle size <= 75 kB gzip).
   - Run `node novel-audio-synthesizer/frontend/e2e/run-all-requirements.mjs` (must pass 100% with exit code 0).
   - Document all verification commands, outputs, and diffs in handoff.md.
