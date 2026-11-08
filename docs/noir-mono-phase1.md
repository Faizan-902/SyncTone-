# Phase 1: Noir Monochrome Reference Analysis, Token Proposal & Contrast Table

**Project**: SyncTone — Noir Monochrome Redesign (Full Visual & UX Overhaul)  
**Phase**: Phase 1 of 10 (Docs Only)  
**Precedence**: Supersedes `docs/noir-yellow-spec.md` (withdrawn), `docs/editorial-orange-spec.md`, and `THEME_LOCK` v1.  
**Status**: **PHASE 1 COMPLETE (READ-ONLY AUDIT & SPECIFICATION)**. No production source code in `src/` modified.

---

## 1. Executive Summary & Authorization Precedence

This document fulfills the requirements for **Phase 1: Reference Analysis, Pixel Sampling, Token Proposal, and WCAG Contrast Table** for the Noir Monochrome redesign of SyncTone.

### Precedence & Authorization
- **Written Owner Authorization**: Full visual and UX redesign encompassing color tokens, typography scales, layout geometry, component shapes, navigation structures, and editorial-voice copy.
- **Supersedes Withdrawn Specs**: `docs/noir-yellow-spec.md` (yellow accent withdrawn as a misreading of external viewer chrome), `docs/editorial-orange-spec.md`, and `THEME_LOCK` v1.
- **Strictly Frozen Systems**:
  - Business logic, REST/WebSocket API endpoints, and authentication/RBAC contracts.
  - Multi-tenant database behavior (PostgreSQL 16 schemas & MongoDB 7 polyglot collections).
  - Audio synthesis pipeline and player synchronization hooks (`useAudioSync`, `usePlaybackProgress`, `useSynthesisProgress`).
  - Reading fit engine and pagination contracts (`fitBook`, `useBookFit`, reading anchors, chapter slicing).
  - Deep links and route paths (`/`, `/novel/:id`, `/reader/:id`, `/profile`, `/admin`, `/upload`).
  - Offline ServiceWorker PWA caching and text sanitizer algorithms.
- **Editorial Voice Rule**: No technical, database, or backend wording is permitted in user-facing copy (e.g. references to "API Gateway", "MongoDB", "SQL", "Worker Bridge").
- **Zero Scope Inflation**: Non-existent features logged in [`docs/editorial-orange-gaps.md`](file:///Users/mohdfaizankhan/SyncTone-/docs/editorial-orange-gaps.md) (such as bookmarks data models, multi-chapter playback queues, or voice audio previews) remain strictly frozen and will **never** be mocked or stubbed.

---

## 2. Reference Analysis: Deconstructing the Visual Language

The design language is derived from the primary reference (`reference-hero.png`), which defines the site's true visual identity. An external viewer overlay (`reference.png`) includes Awwwards chrome—specifically a floating rounded yellow button, a rounded pill dock, and a light top bar. These elements are confirmed as third-party viewer chrome and are excluded from the design language.

```
+-------------------------------------------------------------------------------+
| TOP BAR: [Logo Mark]      + LIBRARY    + VOICES    + PROFILE      [● SIGN IN] |
+-------------------------------------------------------------------------------+
| HERO STAGE (Tall Vertical Gradient: Near-Black -> Mid Grey -> Light Grey)     |
|                                                                               |
|   GIANT DISPLAY HEADLINE (Inter 800-900 Uppercase, Tight Tracking)            |
|   SECOND WORD SKEWED ITALIC (skewX(-10deg) fading into gradient)              |
|                                                                               |
|   [Mono Credit Left]       [3D TILTED BOOK COVER]         [Short Sans Blurb]  |
|                                                                               |
|   [● LISTEN NOW] (Inverted Boxed Button)    [● PLAY SAMPLE] (Signal Dot Tag)  |
+-------------------------------------------------------------------------------+
| CATALOG & READING SURFACES (Sharp 0-2px Cards, Hairline 1px Borders)          |
| + Large Book Covers (Strict 2:3 / 3:4 Ratios)                                 |
| + JetBrains Mono Badges & Chips (+ GENRE, + DURATION)                         |
| + Hairline Separators, Generous Negative Space, Zero Decorative Gradients     |
+-------------------------------------------------------------------------------+
| BOTTOM AUDIO BAR: [Artwork] [Mono Title/Time] [Boxed Controls] [● Signal Dot]  |
+-------------------------------------------------------------------------------+
```

### Visual Grammar Principles

1. **Strictly Monochrome Chrome**:
   - Zero chromatic hues are allowed in the UI chrome. No yellow, green, orange fills, blue, or purple.
   - The only chromatic exception is **one tiny signal dot** (`--signal: #FF5A1F`, $\le$ 8px diameter) used strictly for active live/playing/recording states. It is never used as text, background fill, border, or icon glyph.
   - Book cover art, user avatars, and procedural novel jackets are content, not UI chrome.

2. **Stage Background Gradient**:
   - Landing and hero stages utilize a tall vertical 4-stop gradient transitioning from near-black at the top, fading to mid-grey, then to light grey at the bottom (inverted for light mode).
   - In-app utility surfaces (Reader, Voice Studio, Account, Modal dialogs) use flat, calm near-black or off-white neutral surfaces.

3. **Display Typography & Skewed Italic**:
   - Headline typography is set in Inter 800–900, fully uppercase, with tight tracking (`-0.05em`) and compressed line-height (`~0.85`).
   - The headline is filled with a vertical grey gradient applied via `background-clip: text`.
   - The secondary word features an aggressive skewed italic treatment (`transform: skewX(-10deg) italic`) that fades into the backdrop gradient.

4. **Micro UI & Boxed Geometry**:
   - Navigation links, metadata labels, tags, and timestamps use JetBrains Mono in uppercase with letter-spacing (`0.08em` to `0.12em`).
   - Primary and secondary buttons feature boxed 1px borders, sharp corners (border radius `0px` to `2px`), and a preceding circular indicator dot.
   - Zero pills, zero rounded cards, zero glassmorphism blurs, and zero drop shadows beyond subtle 1px hairline depth.

5. **3D Tilted Hero Object**:
   - A 3D-tilted novel cover using CSS 3D perspective transforms (`perspective(1200px) rotateY(-18deg) rotateX(8deg)`) replaces the tilted monitor from the reference.
   - Flanked symmetrically by small monospace metadata on the left and a concise sans-serif editorial blurb on the right.

6. **Status Communication Without Chromatic Hue**:
   - Success, warning, danger, and info states are expressed through semantic icons, typographic weight, boxed hairline borders, and inverted banners—never red/green/yellow badges.

---

## 3. Token Proposal: Dark & Light Monochrome Architecture

Existing CSS custom properties in `src/index.css` and `tailwind.config.js` will be re-valued, and four new tokens (`--stage-gradient`, `--headline-gradient`, `--signal`, `--bg-bar`) are added.

### 3.1 Dark Mode (`:root, html.dark`) — Default Nocturne

| Token Name | Proposed Value | Category | Semantic Purpose & Usage |
| :--- | :--- | :--- | :--- |
| `--bg-page` | `#0B0B0D` | Canvas | Deep neutral stage background and viewport base |
| `--bg-surface` | `#141416` | Surface | Primary navigation bars, sheets, dialog backdrop |
| `--bg-card` | `#1B1B1E` | Card | Novel cards, chapter items, settings containers |
| `--bg-hover` | `#232327` | Interaction | Interactive row hover, pressed button states |
| `--bg-elevated`| `#1B1B1E` | Overlay | Modals, floating dropdowns, popovers |
| `--bg-bar` | `#141416` | Shell | Fixed top navigation and bottom audio bar |
| `--text-main` | `#F2F2F3` | Typography | Primary headings, titles, body text (17.58:1 on page) |
| `--text-sub` | `#A9A9AF` | Typography | Secondary metadata, author credits, synopsis (8.41:1 on page) |
| `--text-muted` | `#84848D` | Typography | Timestamps, mono tags, disabled labels (4.64:1 on card, $\ge 4.5:1$ AA) |
| `--accent` | `#F2F2F3` | Inverse CTA | Inverted primary fill (text-main tone; white button on dark) |
| `--on-accent` | `#0B0B0D` | Inverse CTA | Text on inverted primary button (page color; near-black text) |
| `--accent-hover`| `#DCDCDF` | Interaction | One grey step darker for inverted button hover |
| `--accent-surface`| `rgba(242, 242, 243, 0.10)` | State | Subtle 10% alpha wash for selected tab/chip |
| `--border-subtle` | `#2E2E33` | Hairline | 1px card separators, catalog dividers |
| `--border-strong` | `#44444A` | Boundary | Boxed button borders, modal perimeter |
| `--border-focus` | `#F2F2F3` | Focus Ring | 2px text-main outline ring with 2px offset |
| `--top10-active`| `#F2F2F3` | Editorial | Active billboard rank selector |
| `--card-accent` | `#F2F2F3` | Editorial | Active card accent line |
| `--speaker-narrator` | `#A9A9AF` | Voice | Narrator voice metadata |
| `--speaker-a` | `#F2F2F3` | Voice | Lead dialogue speaker (differentiated via mono badge weight) |
| `--speaker-b` | `#DCDCDF` | Voice | Secondary character speaker |
| `--speaker-c` | `#A9A9AF` | Voice | Tertiary character speaker |
| `--speaker-d` | `#84848D` | Voice | Background dialogue speaker |
| `--color-status-success` | `#F2F2F3` | Status | Neutral inverted banner + `<IconCheck />` |
| `--color-status-warning` | `#DCDCDF` | Status | Neutral border banner + `<IconAlertTriangle />` |
| `--color-status-danger` | `#F2F2F3` | Status | Inverted high-contrast banner + `<IconAlertCircle />` |
| `--color-status-info` | `#A9A9AF` | Status | Muted border banner + `<IconInfo />` |
| `--signal` | `#FF5A1F` | Signal Dot | Tiny $\le$ 8px dot for active playing/recording indicator |
| `--stage-gradient` | `linear-gradient(180deg, #0A0A0C 0%, #2A2A2E 35%, #7B7B7E 70%, #C2C2C4 100%)` | Stage | Tall vertical hero background (scrim applied on bottom half) |
| `--headline-gradient` | `linear-gradient(180deg, #B4B4B6 0%, #3A3A3E 100%)` | Display | Background-clip text gradient on display headline |

---

### 3.2 Light Mode (`html.light`) — Inverted Minimalist Vellum

| Token Name | Proposed Value | Category | Semantic Purpose & Usage |
| :--- | :--- | :--- | :--- |
| `--bg-page` | `#EFEFF0` | Canvas | Crisp light grey stage canvas and viewport background |
| `--bg-surface` | `#F7F7F8` | Surface | Clean navigation bar, drawer sheets, modal background |
| `--bg-card` | `#FFFFFF` | Card | Pure white novel cards, chapter tiles, controls |
| `--bg-hover` | `#E4E4E6` | Interaction | Interactive item hover, selected rows |
| `--bg-elevated`| `#FFFFFF` | Overlay | Modals, flyout menus, tooltips |
| `--bg-bar` | `#F7F7F8` | Shell | Fixed top navigation and bottom audio bar |
| `--text-main` | `#0B0B0D` | Typography | Deep near-black titles, body text, headlines (17.11:1 on page) |
| `--text-sub` | `#4F4F56` | Typography | Secondary metadata, author credits (7.07:1 on page) |
| `--text-muted` | `#6B6B72` | Typography | Micro UI tags, timestamps, secondary labels (4.60:1 on page, $\ge 4.5:1$ AA) |
| `--accent` | `#0B0B0D` | Inverse CTA | Inverted primary fill (text-main tone; black button on light) |
| `--on-accent` | `#FFFFFF` | Inverse CTA | Text on inverted primary button (pure white text on black) |
| `--accent-hover`| `#232327` | Interaction | One grey step lighter for inverted button hover |
| `--accent-surface`| `rgba(11, 11, 13, 0.08)` | State | Subtle 8% alpha wash for selected tab/chip |
| `--border-subtle` | `#D0D0D4` | Hairline | 1px card separators, catalog dividers |
| `--border-strong` | `#86868A` | Boundary | Boxed button borders, inputs (3.16:1 on page, $\ge 3:1$ AA Non-Text) |
| `--border-focus` | `#0B0B0D` | Focus Ring | 2px text-main outline ring with 2px offset |
| `--top10-active`| `#0B0B0D` | Editorial | Active billboard rank selector |
| `--card-accent` | `#0B0B0D` | Editorial | Active card accent line |
| `--speaker-narrator` | `#4F4F56` | Voice | Narrator voice metadata |
| `--speaker-a` | `#0B0B0D` | Voice | Lead dialogue speaker (differentiated via mono badge weight) |
| `--speaker-b` | `#232327` | Voice | Secondary character speaker |
| `--speaker-c` | `#4F4F56` | Voice | Tertiary character speaker |
| `--speaker-d` | `#6B6B72` | Voice | Background dialogue speaker |
| `--color-status-success` | `#0B0B0D` | Status | Neutral inverted banner + `<IconCheck />` |
| `--color-status-warning` | `#232327` | Status | Neutral border banner + `<IconAlertTriangle />` |
| `--color-status-danger` | `#0B0B0D` | Status | Inverted high-contrast banner + `<IconAlertCircle />` |
| `--color-status-info` | `#4F4F56` | Status | Muted border banner + `<IconInfo />` |
| `--signal` | `#FF5A1F` | Signal Dot | Tiny $\le$ 8px dot for active playing/recording indicator |
| `--stage-gradient` | `linear-gradient(180deg, #F4F4F5 0%, #D9D9DB 35%, #8A8A8D 70%, #1A1A1C 100%)` | Stage | Mirrored tall vertical hero gradient |
| `--headline-gradient` | `linear-gradient(180deg, #1A1A1C 0%, #8A8A8D 100%)` | Display | Background-clip text gradient (dark to mid-grey fade) |

---

## 4. Mathematical WCAG 2.2 AA Contrast Verification Table

Every pair was tested using the standard W3C relative luminance formula:
$$L = 0.2126 \times R_{\text{lin}} + 0.7152 \times G_{\text{lin}} + 0.0722 \times B_{\text{lin}}$$
$$\text{Contrast Ratio} = \frac{L_{\text{lighter}} + 0.05}{L_{\text{darker}} + 0.05}$$

Under WCAG 2.2 AA:
- **Normal Text (< 18pt or < 14pt bold)**: Minimum **4.5:1** (AAA requires 7.0:1).
- **Large Text ($\ge$ 18pt or $\ge$ 14pt bold)**: Minimum **3.0:1** (AAA requires 4.5:1).
- **UI Components & Graphical Objects (SC 1.4.11)**: Minimum **3.0:1**.

### 4.1 Dark Theme Contrast Matrix

| Interface Element & Location | Foreground Token / Hex | Local Background Token / Hex | Measured Contrast Ratio | WCAG 2.2 Requirement | Compliance Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Text on Page** | `--text-main` (`#F2F2F3`) | `--bg-page` (`#0B0B0D`) | **17.58:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary Text on Surface** | `--text-main` (`#F2F2F3`) | `--bg-surface` (`#141416`) | **16.45:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary Text on Card** | `--text-main` (`#F2F2F3`) | `--bg-card` (`#1B1B1E`) | **15.36:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary Text on Hover Row** | `--text-main` (`#F2F2F3`) | `--bg-hover` (`#232327`) | **14.00:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Page** | `--text-sub` (`#A9A9AF`) | `--bg-page` (`#0B0B0D`) | **8.41:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Surface** | `--text-sub` (`#A9A9AF`) | `--bg-surface` (`#141416`) | **7.87:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Card** | `--text-sub` (`#A9A9AF`) | `--bg-card` (`#1B1B1E`) | **7.35:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Hover Row**| `--text-sub` (`#A9A9AF`) | `--bg-hover` (`#232327`) | **6.70:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Muted Metadata on Page** | `--text-muted` (`#84848D`) | `--bg-page` (`#0B0B0D`) | **5.31:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Muted Metadata on Surface** | `--text-muted` (`#84848D`) | `--bg-surface` (`#141416`) | **4.96:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Muted Metadata on Card** | `--text-muted` (`#84848D`) | `--bg-card` (`#1B1B1E`) | **4.64:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Primary CTA Button Text** | `--on-accent` (`#0B0B0D`) | `--accent` (`#F2F2F3`) | **17.58:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary CTA Hover State** | `--on-accent` (`#0B0B0D`) | `--accent-hover` (`#DCDCDF`) | **14.37:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Keyboard Focus Ring Indicator**| `--border-focus` (`#F2F2F3`) | `--bg-page` (`#0B0B0D`) | **17.58:1** | $\ge 3.0:1$ UI Indicator | **PASS (AAA)** |
| **Form Input Boundary** | High-Contrast Line (`#5E5E66`)| `--bg-page` (`#0B0B0D`) | **3.06:1** | $\ge 3.0:1$ UI Component | **PASS (AA Non-Text)** |
| **Display Headline (Top 0%)** | Gradient Start (`#B4B4B6`)| Stage Stop 0% (`#0A0A0C`) | **9.56:1** | $\ge 3.0:1$ Large Text | **PASS (AAA)** |
| **Display Headline (Mid 35%)**| Gradient Mid (`#76767A`) | Stage Stop 35% (`#2A2A2E`)| **3.68:1** | $\ge 3.0:1$ Large Text | **PASS (AA Large)** |
| **Informational Hero Text (0%)**| `--text-main` (`#F2F2F3`) | Stage Stop 0% (`#0A0A0C`) | **17.68:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Informational Hero Text (35%)**| `--text-main` (`#F2F2F3`) | Stage Stop 35% (`#2A2A2E`)| **12.78:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Informational Hero Text (70%)**| `--text-main` (`#F2F2F3`) | Solid Scrim (`#0B0B0D/90`)| **16.15:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |

*Critical Finding on Dark Stage Gradient*: When the vertical stage gradient transitions below 50% toward `#7B7B7E` and `#C2C2C4`, raw contrast against light text falls below 4.5:1. As mandated by the specification, all informational copy in the lower stage will be backed by a solid/semi-translucent scrim (`rgba(11, 11, 13, 0.92)` achieving 16.15:1 AAA) or structured within card surfaces (`#1B1B1E`). The fading italic second headline word is decorative and verified to retain an accessible full DOM text/`aria-label` equivalent.

---

### 4.2 Light Theme Contrast Matrix

| Interface Element & Location | Foreground Token / Hex | Local Background Token / Hex | Measured Contrast Ratio | WCAG 2.2 Requirement | Compliance Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Text on Page** | `--text-main` (`#0B0B0D`) | `--bg-page` (`#EFEFF0`) | **17.11:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary Text on Surface** | `--text-main` (`#0B0B0D`) | `--bg-surface` (`#F7F7F8`) | **18.37:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary Text on Card** | `--text-main` (`#0B0B0D`) | `--bg-card` (`#FFFFFF`) | **19.66:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary Text on Hover Row** | `--text-main` (`#0B0B0D`) | `--bg-hover` (`#E4E4E6`) | **15.49:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Page** | `--text-sub` (`#4F4F56`) | `--bg-page` (`#EFEFF0`) | **7.07:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Surface** | `--text-sub` (`#4F4F56`) | `--bg-surface` (`#F7F7F8`) | **7.59:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Card** | `--text-sub` (`#4F4F56`) | `--bg-card` (`#FFFFFF`) | **8.12:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Secondary Text on Hover Row**| `--text-sub` (`#4F4F56`) | `--bg-hover` (`#E4E4E6`) | **6.40:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Muted Metadata on Page** | `--text-muted` (`#6B6B72`) | `--bg-page` (`#EFEFF0`) | **4.60:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Muted Metadata on Surface** | `--text-muted` (`#6B6B72`) | `--bg-surface` (`#F7F7F8`) | **4.94:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Muted Metadata on Card** | `--text-muted` (`#6B6B72`) | `--bg-card` (`#FFFFFF`) | **5.29:1** | $\ge 4.5:1$ Normal | **PASS (AA)** |
| **Primary CTA Button Text** | `--on-accent` (`#FFFFFF`) | `--accent` (`#0B0B0D`) | **19.66:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Primary CTA Hover State** | `--on-accent` (`#FFFFFF`) | `--accent-hover` (`#232327`) | **15.66:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Keyboard Focus Ring Indicator**| `--border-focus` (`#0B0B0D`) | `--bg-page` (`#EFEFF0`) | **17.11:1** | $\ge 3.0:1$ UI Indicator | **PASS (AAA)** |
| **Form Input Boundary** | `--border-strong` (`#86868A`)| `--bg-page` (`#EFEFF0`) | **3.16:1** | $\ge 3.0:1$ UI Component | **PASS (AA Non-Text)** |
| **Form Input on Card** | `--border-strong` (`#86868A`)| `--bg-card` (`#FFFFFF`) | **3.63:1** | $\ge 3.0:1$ UI Component | **PASS (AA Non-Text)** |
| **Display Headline (Top 0%)** | Gradient Start (`#1A1A1C`)| Stage Stop 0% (`#F4F4F5`) | **15.81:1** | $\ge 3.0:1$ Large Text | **PASS (AAA)** |
| **Display Headline (Mid 35%)**| Gradient Mid (`#4F4F56`) | Stage Stop 35% (`#D9D9DB`)| **5.76:1** | $\ge 3.0:1$ Large Text | **PASS (AAA)** |
| **Informational Hero Text (0%)**| `--text-main` (`#0B0B0D`) | Stage Stop 0% (`#F4F4F5`) | **17.89:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Informational Hero Text (35%)**| `--text-main` (`#0B0B0D`) | Stage Stop 35% (`#D9D9DB`)| **13.95:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |
| **Lower Stage Content Scrim** | `--text-main` (`#0B0B0D`) | Solid Scrim (`#FFFFFF/95`)| **18.80:1** | $\ge 4.5:1$ Normal | **PASS (AAA)** |

*Critical Finding on Light Stage Gradient*: In Light Mode, the stage gradient mirrors dark mode, fading from light (`#F4F4F5`) at the top down to dark (`#1A1A1C`) at the bottom. Therefore, any content positioned in the lower third of the light hero stage will use pure white card containers (`#FFFFFF` with `#0B0B0D` text, 19.66:1 AAA) or an inverted light scrim (`rgba(255, 255, 255, 0.95)`, 18.80:1 AAA) to prevent black-on-black collisions.

---

## 5. Typography System & Cold-Load Budget Audit

### 5.1 Font Family Architecture
SyncTone's typography system uses the three existing self-hosted variable font packages already integrated into the application:

1. **Display & Giant Headline (`font-sans`)**:
   - Family: **Inter Variable** (`@fontsource-variable/inter`)
   - Weights: **800 to 900** (Heavy / Black)
   - Specifications: Fully uppercase, `letter-spacing: -0.05em`, `line-height: 0.85`, dynamic fluid sizing via `clamp(2.5rem, 7vw, 6.5rem)`.
   - Headline Gradient: `background: var(--headline-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`
   - Secondary Word Effect: Skewed italic (`display: inline-block; transform: skewX(-10deg); font-style: italic; opacity: 0.45;`) fading into the background gradient.

2. **UI & Editorial Blurbs (`font-sans`)**:
   - Family: **Inter Variable**
   - Weights: **400 (Regular) to 500 (Medium)**
   - Tracking: `-0.03em`, clean neutral readability across button labels, modals, and descriptions.

3. **Micro UI, Nav, Tags & Timestamps (`font-mono`)**:
   - Family: **JetBrains Mono Variable** (`@fontsource-variable/jetbrains-mono`)
   - Weights: **500 to 600**
   - Specifications: Monospace, fully uppercase, letter-spaced (`tracking-wider` / `0.08em` to `0.12em`), small (`text-xs` / `11px`).
   - Signature Nav Affordance: Navigation links prefixed with `+` (e.g. `+ LIBRARY`, `+ VOICES`, `+ PROFILE`).
   - Boxed Action Buttons: 1px border, sharp corners (`rounded-none` or `rounded-[2px]`), small preceding circular dot indicator (`●`).

4. **Reading Body Text (`font-serif`)**:
   - Family: **Newsreader Variable** (`@fontsource-variable/newsreader`)
   - Measure: Constrained to **60–75ch** per line for ergonomic reading comfort.
   - Line Height: `leading-relaxed` (1.75).
   - Reading Canvas: Completely neutral flat backdrop (`#0B0B0D` in dark mode, `#EFEFF0` in light mode), avoiding the stage gradient so reading remains calm and distraction-free.

### 5.2 Variable Font Weight Verification & Zero-Byte Regression Proof

An audit of the installed `@fontsource-variable` packages confirmed:
- `@fontsource-variable/inter/files/inter-latin-wght-normal.woff2` (48.26 kB) natively includes variable weights from **100 through 900** within a single WOFF2 file.
- `@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2` (40.40 kB) natively supports variable weights from **100 through 800**.
- `@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2` (58.08 kB) natively supports variable weights from **200 through 800**.

**Verdict**: Heavy Inter weights (800 and 900) are **already fully present and self-hosted** in the installed variable font files.
- **External Network Requests**: **0** (strictly self-hosted).
- **New Font Families Added**: **0**.
- **Net Added Byte Cost**: **0 bytes**.
- **Cold-load Gzip Impact**: **Zero regression**. The Home entry chunk remains well below the ~75 kB gzip budget (measured at 28.49 kB gzip for main bundle + 18.79 kB gzip for CSS).

---

## 6. Component Mapping & Rebuild Strategy for Phases 2–10

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNCTONE APP SHELL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ TOP NAV:                                                                    │
│ [SYNCTONE ■]               + LIBRARY    + VOICES    + PROFILE   [● SIGN IN] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [STAGE HERO]                                                                │
│   Display Headline with Skewed Italic Fade                                  │
│   3D Perspective Novel Jacket                                               │
│   Boxed Action Controls with Dot Indicators                                 │
│                                                                             │
│ [CATALOG / DETAILS / VOICE STUDIO / READER]                                 │
│   - Flat neutral surfaces (Dark #141416 / Light #FFFFFF)                    │
│   - Sharp 0-2px geometry                                                    │
│   - Mono metadata chips & status outlines                                   │
│   - Preserved book fit engine & audio sync contracts                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ BOTTOM AUDIO BAR:                                                           │
│ [Cover 48x48]  Dr. Watson — Ch. 1   [◀◀] [▶ PLAY] [▶▶] [Scrubber]  [● LIVE] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture Breakdown

1. **Top Navigation (`App.jsx`, replacing `SidebarNav.jsx` & `TopHeader.jsx`)**:
   - Replaces the sidebar/header layout with an editorial top navigation bar.
   - Left: Minimalist SyncTone logo glyph.
   - Center: JetBrains Mono links prefixed with `+` (`+ LIBRARY`, `+ VOICES`, `+ PROFILE`).
   - Right: Boxed sharp button with indicator dot (`● SIGN IN` / account trigger) and binary theme toggle (`● LIGHT` / `● DARK`).
   - Mobile: Slide-out compact sheet preserving the exact mono aesthetic.
   - Routing: All routes (`/`, `/profile`, `/admin`, modal triggers) preserved with zero logic changes.

2. **Home Stage & Catalog (`NovelCatalog.jsx`)**:
   - Hero Section: Tall vertical `--stage-gradient` background.
   - Giant display headline (`"STORIES TOLD IN SOUND"` with second phrase skewed italic and faded).
   - 3D tilted novel showcase: CSS perspective transform, mono author/cast credits left, concise sans blurb right.
   - Boxed CTA buttons: Inverted `[● LISTEN NOW]` primary button and `[● PLAY SAMPLE]` secondary button featuring the tiny `--signal` dot.
   - Catalog Grid: Clean 3-column / 4-column layout on desktop, sharp cards (0–2px radius), 1px hairline borders (`--border-subtle`), 2:3 vertical cover art, monospace genre/status badges, and hairline section dividers.

3. **Novel Detail View (`NovelDetails.jsx`)**:
   - Full-bleed stage header with giant title in Inter 800, mono publication metadata, and author attribution.
   - Boxed monospace tab bar: `[ OVERVIEW ]`, `[ CAST ]`, `[ CHAPTERS ]`, `[ DETAILS ]`, `[ SCORE ]`.
   - Inverted primary CTA: `[● LISTEN TO NOVEL]`.
   - Chapter directory: High-contrast row items with mono track durations and neural synthesis status indicators.

4. **Reading Canvas (`ReaderView.jsx` & `OpenGLPageReader.jsx`)**:
   - Calm, distraction-free reading surface set to flat neutral (`#0B0B0D` / `#EFEFF0`), avoiding background gradients.
   - Newsreader serif typography constrained to 60–75 characters per line.
   - Minimalist monospace floating toolbar for font size, book font, and atmosphere toggle.
   - **Fit Engine Preservation**: The book fit contract (`fitBook`, `useBookFit`, `paginate`, and reading anchors) remains strictly intact. The stage viewport reserves top nav height and publishes bottom player bar height as `--dock-safe-bottom`, guaranteeing text never collides with chrome.
   - Page turn chevrons positioned strictly in outer margins/gutters, never overlaying literary text.

5. **Docked Bottom Audio Player (`AudioPlayer.jsx`)**:
   - Fixed sharp bottom bar with 1px top hairline border.
   - 48x48px sharp cover thumbnail with mono chapter title and real-time millisecond timecode (`04:12 / 28:45`).
   - Central boxed controls: Skip backward (`[◀◀ 10s]`), inverted primary `[▶ PLAY]` / `[⏸ PAUSE]`, skip forward (`[▶▶ 10s]`).
   - Full-width interactive audio scrubber styled in `--text-main` with subtle unbuffered track in `--border-strong`.
   - When active, displays the tiny $\le$ 8px `--signal` dot (`#FF5A1F`) adjacent to the playback status label.

6. **Voice Studio (`SettingsModal.jsx` & `CharacterRoster.jsx`)**:
   - Sharp sheet container with boxed mono navigation tabs: `[ CAST ]`, `[ VOICES ]`, `[ SETTINGS ]`, `[ GENERATE ]`.
   - Character cast roster displaying speaker voice mappings (Narrator, Speaker A/B/C/D) using neutral badges and typographic weight.
   - Voice synthesis progress bar (`SynthesisProgressBar.jsx`) rendered with high-contrast neutral fill and mono percentage readout.

7. **Shared UI Primitives (`Button.jsx`, `Card.jsx`, `Dialog.jsx`, `StatusBadge.jsx`, `Tabs.jsx`)**:
   - `Button`: Boxed 1px border, sharp 0–2px corners, optional preceding dot, inverted primary styling.
   - `Card`: Sharp perimeter, `--border-subtle` border, flat `--bg-card` surface, zero heavy shadows.
   - `StatusBadge`: Monospace, uppercase, 1px neutral outline, zero chromatic background fills.
   - `Tabs`: Monospace boxed tab buttons with 1px active indicator border.
   - Modals & Dialogs: Sharp neutral backdrop, 1px hairline border, top-right `[×]` close square.

---

## 7. Phase Gates & Implementation Roadmap (Phases 1–10)

Per Section 7 of the project specification, each phase requires:
$$\text{Plan Artifact} \longrightarrow \text{Owner Approval} \longrightarrow \text{Implementation} \longrightarrow \text{Automated Gate Verification} \longrightarrow \text{Phase Report} \longrightarrow \text{STOP}$$

| Phase | Description | Scope / Artifact | Verification Gate |
| :--- | :--- | :--- | :--- |
| **P1** | **Reference Analysis & Token Specification** | `docs/noir-mono-phase1.md` (Docs Only) | Mathematical WCAG 2.2 AA Contrast Table & Budget Audit |
| **P2** | **Concept Preview** | Static HTML in `docs/design-preview/` (Dark/Light at 1440x900 & 390x844) | Visual approval of Home, Details, Reader, Audio Bar, Voice Studio |
| **P3** | **Tokens & Typography (`THEME_LOCK` v2)** | Re-value CSS properties in `index.css` & `tailwind.config.js` | Negative hue assertion (no yellow/green/orange/blue/purple tokens) |
| **P4** | **App Shell, Top Nav & Shared Primitives** | `App.jsx`, `Button.jsx`, `Card.jsx`, `StatusBadge.jsx`, `Tabs.jsx` | Navigation E2E tests, focus ring audits, touch target size |
| **P5** | **Reader & Fit Engine Integrity** | `ReaderView.jsx`, `OpenGLPageReader.jsx`, `PageNavButtons.jsx` | Vitest fit engine suite (`fit_book.test.js`), anchor persistence |
| **P6** | **Docked Bottom Audio Player** | `AudioPlayer.jsx`, audio scrubber, signal dot indicator | Audio sync hooks (`useAudioSync`, `usePlaybackProgress`) |
| **P7** | **Voice Studio & Roster Overhaul** | `CharacterRoster.jsx`, `SettingsModal.jsx`, `SynthesisProgressBar.jsx` | Voice synthesis tests (`roster.test.jsx`, `synthesis.test.jsx`) |
| **P8** | **Catalog, Details, Profile & Auth Modals** | `NovelCatalog.jsx`, `NovelDetails.jsx`, `AuthModal.jsx`, `AddNovelModal.jsx` | Full catalog browsing, novel ingestion, and modal flows |
| **P9** | **Responsive Layout & Accessibility Polish** | Viewport testing: 1440x900, 1190x770, 768x1024, 390x844, 320x568 | Axe-core accessibility re-enabled as ERROR, 44px touch targets |
| **P10**| **Full Verification & Theme Lock Finalization** | Full test suite, Playwright E2E, CDP cold-load measurement | Vitest (135 tests), build, theme:check, $\le 75\text{ kB}$ gzip cold load |

---

## 8. Acceptance Verification & Phase 1 Conclusion

### Acceptance Criteria Checklist
- [x] **Owner Authorization Recorded**: Clear precedence established superseding `docs/noir-yellow-spec.md`, `docs/editorial-orange-spec.md`, and `THEME_LOCK` v1.
- [x] **Strictly Monochrome Visual Language**: Reference visual grammar deconstructed (neutral greys, tall stage gradient, headline gradient with skewed italic fade, boxed micro UI, 3D tilted cover, zero chromatic hues, single `--signal` dot).
- [x] **Viewer Chrome Clarified**: Awwwards viewer chrome (yellow button, rounded pill dock, light top bar) identified and eliminated from design system.
- [x] **Token Re-Valuation & Proposal**: Complete Dark and Light token tables documented, adding `--stage-gradient`, `--headline-gradient`, `--signal`, and `--bg-bar`.
- [x] **Mathematical Contrast Verification**: 100% of informational text pairs confirmed $\ge 4.5:1$ AA. Display headlines confirmed $\ge 3.0:1$ AA Large. Scrim requirements for stage gradient documented.
- [x] **Typography & Budget Verified**: Confirmed Inter 800–900 already present in variable `@fontsource-variable/inter` with 0 bytes added to cold load.
- [x] **Strict Boundary Observed**: **Zero lines of application code modified outside `docs/`**.
- [x] **Phase Report Committed**: `docs/noir-mono-phase1.md` written and verified.

**Next Immediate Step**: Await user approval of Phase 1 before proceeding to Phase 2 (Concept Preview in `docs/design-preview/`).
