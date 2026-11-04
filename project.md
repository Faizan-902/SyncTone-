# Project: SyncTone Premium Interaction & Visual Polish

## Architecture
SyncTone is an AI-powered web-novel library and multi-voice audiobook platform built with React 18, Vite, Tailwind CSS, and WebGL (Three.js/OpenGL 3D reader). The frontend code lives in `novel-audio-synthesizer/frontend`.

### Dual-Track Architecture
1. **Implementation Track**:
   - Milestone 1: Palette, Zero-Blue Cleanup & Theme Tokens
   - Milestone 2: Micro-Animations, Tactile Physics, Glass/Depth & Component Polish
   - Milestone 3: Performance Budget Hardening & Final Test Suite Verification
2. **E2E Testing Track**:
   - Requirement-driven opaque-box test suite verifying R1 (Interaction & Polish), R2 (Color guardrails & Zero Blue), R3 (Performance budget <= 75 kB gzip), and publishing `TEST_READY.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Zero-Blue Cleanup | Remove cold blue-tinted `#050507` and `#e5e5ea` in `OpenGLPageReader.jsx` and `#4f46e5` in `public/vite.svg`. Strictly zero blue across all styling. | M1 | Survey (E1) |
| 2 | Major Colors Integration | Incorporate Sage Green (`#87A96B`), Walnut Brown (`#5A3E2B`), and Amber Glow (`#D5851F`) into Tailwind tokens and component styles alongside Earthy Luxury palette. | M1 | Survey (E1, E2) |
| 3 | Theme Lock Contract Parity | Maintain exact contract in `src/__tests__/theme_lock.test.js` and zero color drift in `e2e/theme-lock.spec.js`. | M1 | Survey (E1, E3) |
| 4 | CSS Keyframe Repairs | Fix missing/undefined keyframes: `animate-fade-in`, `animate-slideDown`, `fadeInUp`, and mini equalizer bars `eq-bar-1/2/3`. | M2 | Survey (E2) |
| 5 | Tactile Spring Physics | Add `active:scale-95` / `active:scale-90` tactile feedback to buttons, transport controls, navigation chevrons, and sidebar items. | M2 | Survey (E2) |
| 6 | Audio Scrubber Timecode Tooltip | Add floating cursor-following timestamp preview badge on audio scrubber hover. | M2 | Survey (E2) |
| 7 | Equalizer & Visualizer Animation | Animate AudioPlayer mini equalizer bars and Billboard live voice visualizer using pure CSS keyframes. | M2 | Survey (E2) |
| 8 | Glass & Depth Effects | Polish backdrop blur, borders, elevation, and card/dock layering without layout shifts. | M2 | Survey (E2) |
| 9 | Toast Primitive Integration | Refactor `ToastContext.jsx` to use accessible `Toast.jsx` primitive with semantic status icons. | M2 | Survey (E2) |
| 10 | Typography & Asset Optimization | Remove unused Google Fonts (`Plus Jakarta Sans`, `Literata`) from `index.html` to reduce latency. | M2 | Survey (E2) |
| 11 | Home Bundle Budget Guardrail | Maintain Home cold-load JavaScript bundle size <= 75 kB gzip. Zero `framer-motion` imports on Home critical path. | M3 | Survey (E3) |
| 12 | 115 Vitest Tests & Playwright Pass | Ensure 100% pass across all 115 Vitest tests and all Playwright theme-lock/hardening tests. | M3 | Survey (E3) |
| 13 | E2E Requirements Test Suite | Requirement-driven test suite validating R1, R2, R3 across all tiers, outputting `TEST_READY.md`. | E2E Track | Survey (E3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite | Requirement-driven opaque-box test runner & cases (R1, R2, R3) -> TEST_READY.md | none | DONE (158/158 passed) |
| 1 | Color Guardrails & Theme Tokens | Zero-blue cleanup, Sage Green / Walnut Brown / Amber Glow integration, theme_lock parity | none | DONE (Gate PASS) |
| 2 | Micro-Animations & Interaction Polish | CSS keyframes, tactile springs, scrubber tooltip, equalizer, Toast refactor, asset cleanup | M1 | DONE (Gate PASS) |
| 3 | Final Verification & Performance Budget | Bundle budget audit (<= 75 kB gzip), all 115 Vitest tests pass, Playwright suite pass, 100% E2E test pass | M2, E2E | DONE (Gate PASS — 176/176 passed) |

## Interface Contracts
### Theme Tokens Contract (M1 -> M2, M3)
- Tailwind colors: `sage: '#87A96B'`, `walnut-deep: '#5A3E2B'`, `amber-glow: '#D5851F'`.
- Earthy Luxury core variables: `--bg-page: #1A120E`, `--bg-surface: #3A2418`, `--bg-card: #3A2418`, `--text-main: #D5C4AE`, `--accent: #A88462`, `--cta-primary-bg: #6B4A2E`.
- Zero blue: No hex codes with blue dominance, no `cyan`, `indigo`, `sky`, `blue-*` classes.

### Animation & Micro-Interaction Contract (M2 -> M3)
- CSS-only animations for Home page: All keyframes (`fade-in`, `slideDown`, `fadeInUp`, `eqBounce`) defined in `index.css` or `tailwind.config.js`.
- No `framer-motion` imported in `App.jsx`, `NovelCatalog.jsx`, `NovelCover.jsx`, `SidebarNav.jsx`, `TopHeader.jsx`.

### Performance & Test Contract (M3 & E2E)
- Command: `npm test --prefix novel-audio-synthesizer/frontend` -> 115 tests pass.
- Command: `npm run build --prefix novel-audio-synthesizer/frontend` -> cold-load JS bundle <= 75,000 bytes gzip.
- Command: `npm run theme:check --prefix novel-audio-synthesizer/frontend` -> passes with 0 color delta.

## Code Layout
- Frontend Root: `novel-audio-synthesizer/frontend/`
- Styling & Tokens: `src/index.css`, `tailwind.config.js`, `src/tokens/motion.js`
- Core UI & Views: `src/components/`, `src/components/primitives/`, `src/reader/`
- Context: `src/context/`
- Tests: `src/__tests__/`, `e2e/`
- Agent Workspace: `.agents/teamwork/`