# SyncTone — Phase 3 Evidence-Based Design Decision & System Architecture

> **Document Status**: Production Architecture & Design System Decision  
> **Target Framework**: React 18, Vite 5, Tailwind CSS 3, TypeScript-ready domain architecture  
> **Design References**: `FRONTEND_REDESIGN_PLAN.md` & `demo/index.html` from `NamahOmprakash/synctone-private-docs`

---

## 1. Chosen Visual Direction: "Cinematic Literary OTT"

The chosen visual direction for SyncTone is **"Cinematic Literary OTT"**—a hybrid design uniting the **cinematic discovery and visual impact of modern streaming platforms (Netflix, Apple TV+)** with the **distraction-free typographic refinement of high-end reading applications (Apple Books, WeLib)**.

### Why This Fits SyncTone:
1. **Multi-Voice Storytelling as Theater**: SyncTone is not a dry text reader or a generic single-speaker TTS tool; it is a full-cast audio dramatization with distinct character voices (Harry, Hermione, Dumbledore, Watson, Sherlock). The UI must celebrate characters, voice attribution, and cinematic scale.
2. **Dual-Modality Balance**: Users switch between *browsing/discovering* (visual, media-forward, high contrast) and *reading/listening* (focused, calm, typography-first). The visual hierarchy transitions smoothly from a media billboard to a distraction-free reading canvas.
3. **Tri-Theme Flexibility**: Readers have strong preferences depending on lighting conditions:
   - 🌙 **Dark Slate OLED (`#0B0F17`)**: Deep immersion, low-light listening, high-contrast badges.
   - 📜 **Warm Sepia Paper (`#FBF0D9`)**: Reduced eye strain for hours of long-form literary reading.
   - ☀️ **Editorial Light (`#F8FAFC`)**: Clean daylight reading matching printed publications.

---

## 2. Alternatives Considered & Rejected

| Alternative Direction | Description | Reason for Rejection |
| :--- | :--- | :--- |
| **Generic AI SaaS Dashboard** | Collapsible sidebar with data tables, analytical graphs, card grids with metrics | Feels like an enterprise developer tool; ruins the emotional engagement of reading webnovels. |
| **Heavy Skeuomorphism** | 3D leather-bound book covers, simulated physical page-curls, wooden shelves | Slows down rendering, creates layout shifts, and clashes with modern 60fps line-by-line audio synchronization. |
| **Excessive "Neo-Brutalism"** | Harsh black borders, raw unstyled buttons, stark monospace fonts, neon accents | Fatiguing for long-form reading; lacks the cinematic elegance needed for literary fiction. |
| **Pure Minimal Text Reader (Substack/Medium-only)** | Centered single column with no covers, no carousels, minimal audio controls | Misses the OTT catalog discovery experience and fails to highlight multi-voice character casts. |

---

## 3. Design Tokens & Design System

### 3.1 Color System (Theme-Safe CSS Custom Properties)
All components use CSS variables for theme safety across Dark, Sepia, and Light modes:

```css
/* Dark Slate OLED (Default) */
html.dark {
  --bg-page: #0B0F17;
  --bg-surface: #131926;
  --bg-card: #182232;
  --bg-hover: #222F46;
  --text-main: #F8FAFC;
  --text-sub: #CBD5E1;
  --text-muted: #94A3B8;
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(99, 102, 241, 0.4);
  --glass-bg: rgba(11, 15, 23, 0.85);
  --glass-dock: rgba(15, 23, 42, 0.90);
  --top10-fill: #0B0F17;
  --top10-stroke: #64748B;
}

/* Warm Sepia Paper */
html.sepia {
  --bg-page: #FBF0D9;
  --bg-surface: #F4E4C1;
  --bg-card: #EAD8B0;
  --bg-hover: #DFCC9F;
  --text-main: #2C2216;
  --text-sub: #4A3B2C;
  --text-muted: #7A6B56;
  --border-subtle: rgba(44, 34, 22, 0.14);
  --border-focus: rgba(180, 83, 9, 0.45);
  --glass-bg: rgba(251, 240, 217, 0.88);
  --glass-dock: rgba(244, 228, 193, 0.94);
  --top10-fill: #FBF0D9;
  --top10-stroke: #B45309;
}

/* Editorial Light */
html.light {
  --bg-page: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-card: #F1F5F9;
  --bg-hover: #E2E8F0;
  --text-main: #0F172A;
  --text-sub: #334155;
  --text-muted: #64748B;
  --border-subtle: rgba(15, 23, 42, 0.08);
  --border-focus: rgba(79, 70, 229, 0.4);
  --glass-bg: rgba(255, 255, 255, 0.88);
  --glass-dock: rgba(255, 255, 255, 0.94);
  --top10-fill: #F8FAFC;
  --top10-stroke: #475569;
}
```

### 3.2 Typography Tokens
- **Display Headlines**: `Montserrat`, sans-serif (700, 800, 900)
- **Literary Reading & Prose**: `Merriweather`, serif (300, 400, 700, Italic)
- **System Interface & Metadata**: `Inter`, sans-serif (400, 500, 600, 700)
- **Timecodes & Audio Metrics**: Monospace (`ui-monospace`, `SFMono-Regular`, `Menlo`)

### 3.3 Elevation & Shadows
- **Card Rest**: `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);`
- **Card Hover / Popover**: `box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);`
- **Audio Dock**: `backdrop-filter: blur(16px); box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);`

---

## 4. Component Architecture & User Journeys

```
novel-audio-synthesizer/frontend/src/
├── context/
│   ├── AuthContext.jsx          # Cookie-based session & RBAC (reader/writer/admin)
│   └── ThemeContext.jsx         # Tri-Theme provider (dark, sepia, light) + font settings
├── components/
│   ├── navigation/
│   │   ├── SidebarNav.jsx       # Fixed OTT left icon rail (Home, Search, Details, Reader, Profile)
│   │   └── TopHeader.jsx        # Glassmorphic search bar with '/' keyboard shortcut & channels
│   ├── home/
│   │   ├── HeroBillboard.jsx    # Cinematic panoramic backdrop with quick-play CTA
│   │   ├── Top10Carousel.jsx    # Styled outline numbers 1–10 with vertical 2:3 book posters
│   │   └── NovelCardHover.jsx   # Netflix-style expandable hover preview card
│   ├── details/
│   │   ├── NovelHeroHeader.jsx  # Panoramic blurred backdrop + 2:3 elevated cover card
│   │   ├── TwoColumnMetadata.jsx# The Mentalist 2-column layout (Synopsis vs Cast & Tags)
│   │   └── ChapterDirectory.jsx # Numbered chapter rows with durations and play triggers
│   ├── reader/
│   │   ├── ReaderView.jsx       # 60fps synchronized text reader with active turn highlight
│   │   ├── ReaderControls.jsx   # Sans/Serif font toggle, font-size A-/A+, and reading width
│   │   └── FloatingAudioDock.jsx# Frosted-glass player with scrubber, timecodes, turn seeks, and speed
│   ├── auth/
│   │   └── SplitLoginModal.jsx  # Unity Hub-style 50/50 split authentication modal
│   ├── author/
│   │   ├── AddNovelModal.jsx    # Novel creation modal for writers/admins
│   │   └── UploadChapterModal.jsx# Chapter prose ingestion modal with live progress
│   ├── roster/
│   │   └── CharacterRoster.jsx  # Cast drawer with Kokoro/Edge Neural voice assignments
│   └── synthesis/
│       └── SynthesisProgressBar.jsx # WebSocket live progress bar
```

---

## 5. Accessibility & Performance Standards

1. **Contrast Safety**: Text tokens have been verified against background tokens across all 3 themes to meet WCAG AA ($4.5:1$ minimum).
2. **Keyboard Accessibility**:
   - `/`: Focus search input.
   - `Escape`: Close modals and drawers.
   - `Space`: Toggle audio play/pause when not in an input field.
   - Full keyboard navigation with visible focus rings (`focus:ring-2 focus:ring-indigo-500/40`).
3. **Performance & 60fps Audio Sync**:
   - Audio clock utilizes continuous `requestAnimationFrame` with $O(\log N)$ binary search to identify active segments.
   - React state updater is invoked only when active segment boundary changes, preventing 60 full-document DOM re-renders per second.
   - Auto-scroll centers active line smoothly (`scrollIntoView({ behavior: 'smooth', block: 'center' })`).
