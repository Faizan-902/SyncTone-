import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSpeakerColor } from '../utils/speakerColors';
import { parseSegmentImage } from '../utils/segmentUtils';
import { useTheme } from '../context/ThemeContext';
import { sanitizeSegmentsWithTtsDomCleaner } from '../utils/ttsSanitizer';
import { process4PassSegment } from '../utils/readerLayoutEngine';
import { Button } from './primitives/Button';
import OpenGLPageReader from './OpenGLPageReader';
import {
  IconArrowLeft,
  IconMic,
  IconSoundwave,
  IconPlay,
  IconBook,
  IconBookOpen,
  IconRefresh,
  IconX,
} from './icons';

// Check if running in real interactive browser (not Vitest / jsdom)
const isBrowserEnv =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !navigator.userAgent.includes('jsdom');

export default function ReaderView({
  segments = [],
  activeSegmentId = -1,
  segmentProgress = 0,
  isPlaying = true,
  onSegmentClick,
  currentNovel,
  currentChapter,
  chapters = [],
  onSelectChapter = null,
  onBack,
  onRetry,
  onNextChapter,
  useTtsSanitizer: propUseTtsSanitizer,
  onToggleTtsSanitizer: propOnToggleTtsSanitizer,
}) {
  const { fontFamily, setFontFamily, fontSize, increaseFontSize, decreaseFontSize } = useTheme();
  const activeElementRef = useRef(null);
  const prevActiveIdRef = useRef(-1);
  const isAutoScrollingRef = useRef(false);

  const currentChapterIdx = React.useMemo(() => {
    if (!chapters || !currentChapter) return -1;
    return chapters.findIndex((c) => c.id === currentChapter.id);
  }, [chapters, currentChapter]);

  const prevChapter = React.useMemo(() => {
    if (!chapters || currentChapterIdx <= 0) return null;
    return chapters[currentChapterIdx - 1];
  }, [chapters, currentChapterIdx]);

  const nextChapter = React.useMemo(() => {
    if (!chapters || currentChapterIdx < 0 || currentChapterIdx >= chapters.length - 1) return null;
    return chapters[currentChapterIdx + 1];
  }, [chapters, currentChapterIdx]);

  // Reader mode: 'normal' (WTR-Lab scroll) vs 'opengl' (Moon+ Reader Pro 3D book)
  const [readerMode, setReaderMode] = useState('normal');

  // Popup Modal for choosing experience when opening the reader (browser only)
  const [showExperiencePopup, setShowExperiencePopup] = useState(() => {
    if (!isBrowserEnv) return false;
    try {
      return !localStorage.getItem('synctone_reader_mode_seen');
    } catch (_) {
      return false;
    }
  });

  const [isScrolledAway, setIsScrolledAway] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  const [localUseTtsSanitizer, setLocalUseTtsSanitizer] = useState(false);
  const isSanitizerActive = propUseTtsSanitizer !== undefined ? propUseTtsSanitizer : localUseTtsSanitizer;
  const handleToggleSanitizer = () => {
    if (propOnToggleTtsSanitizer) {
      propOnToggleTtsSanitizer();
    } else {
      setLocalUseTtsSanitizer((prev) => !prev);
    }
  };

  const effectiveSegments = React.useMemo(
    () => (isSanitizerActive ? sanitizeSegmentsWithTtsDomCleaner(segments) : segments),
    [segments, isSanitizerActive]
  );

  // Fullscreen state & toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Listen to Escape key to exit Focus Mode and toggle full-screen body class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('focus-fullscreen-mode', isFocusMode);
    }
    if (!isFocusMode) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('focus-fullscreen-mode');
      }
    };
  }, [isFocusMode]);

  // Monitor tab visibility to pause animations when user switches tabs
  useEffect(() => {
    const handleVisChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, []);

  // Auto-scroll to active element only when activeSegmentId actually changes
  useEffect(() => {
    if (readerMode !== 'normal') return;

    if (activeSegmentId !== -1 && activeSegmentId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeSegmentId;

      if (!isScrolledAway && typeof activeElementRef.current?.scrollIntoView === 'function') {
        isAutoScrollingRef.current = true;
        activeElementRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 500);
      }
    }
  }, [activeSegmentId, isScrolledAway, readerMode]);

  // Track user manual scrolling in Normal mode
  useEffect(() => {
    if (readerMode !== 'normal') return;

    const handleScroll = () => {
      if (isAutoScrollingRef.current) return;
      if (!activeElementRef.current) return;

      const rect = activeElementRef.current.getBoundingClientRect();
      const inViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
      setIsScrolledAway(!inViewport);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [readerMode]);

  const handleReturnToNow = useCallback(() => {
    setIsScrolledAway(false);
    if (typeof activeElementRef.current?.scrollIntoView === 'function') {
      activeElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  const handleChooseMode = (mode) => {
    setReaderMode(mode);
    setShowExperiencePopup(false);
    try {
      localStorage.setItem('synctone_reader_mode_seen', 'true');
    } catch (_) {}
  };

  // Graceful Unready State
  if (!segments || segments.length === 0) {
    return (
      <div className="py-16 sm:py-24 px-4 max-w-xl mx-auto text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl theme-surface border border-[var(--border-subtle)] mx-auto flex items-center justify-center text-[var(--accent-text)] shadow-sm">
          <IconBookOpen className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold font-serif theme-heading tracking-tight">
            This chapter isn't ready yet
          </h2>
          <p className="text-xs sm:text-sm theme-sub leading-relaxed">
            The narration for this chapter is being prepared by our cast. You can try refreshing
            or continue reading other available chapters.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onBack && (
            <Button variant="secondary" size="md" onClick={onBack}>
              ← Back to Chapters
            </Button>
          )}
          {onRetry && (
            <Button variant="primary" size="md" onClick={onRetry} icon={IconRefresh}>
              Try Again
            </Button>
          )}
          {onNextChapter && (
            <Button variant="ghost" size="md" onClick={onNextChapter}>
              Next Chapter →
            </Button>
          )}
        </div>
      </div>
    );
  }

  // WTR-Lab Intra-segment text renderer with word highlight and inline EPUB illustrations
  const renderSegmentText = (seg, isActive) => {
    const { imgUrl, cleanText } = parseSegmentImage(seg);
    const isDialogue = seg.type === 'dialogue';
    const displayText = isDialogue
      ? (cleanText ? `"${cleanText.replace(/^["“”]|["“”]$/g, '')}"` : '')
      : cleanText;

    const imageElement = imgUrl ? (
      <div className="my-3 flex justify-center">
        <img
          src={imgUrl}
          alt="Book illustration"
          className="my-4 mx-auto max-h-72 rounded-xl border border-white/15 shadow-lg object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    ) : null;

    // Inactive segment: plain text (Pass 3 Typography with full justification)
    if (!isActive) {
      return (
        <>
          {imageElement}
          {displayText && (
            <p className={`relative z-10 leading-[1.85] text-justify hyphens-auto ${isDialogue ? 'italic theme-main font-serif' : 'theme-sub font-normal'}`}>
              {displayText}
            </p>
          )}
        </>
      );
    }

    // Active segment with intra-segment word progress
    if (typeof segmentProgress === 'number' && segmentProgress > 0) {
      const tokens = (displayText || '').split(/(\s+)/);
      const nonWhitespaceIndices = [];
      tokens.forEach((t, i) => {
        if (!/^\s+$/.test(t)) nonWhitespaceIndices.push(i);
      });

      const totalWords = Math.max(1, nonWhitespaceIndices.length);
      const targetWordIdx = Math.min(
        totalWords - 1,
        Math.max(0, Math.floor(segmentProgress * totalWords))
      );
      const activeTokenIdx = nonWhitespaceIndices[targetWordIdx] ?? -1;

      return (
        <>
          {imageElement}
          {displayText && (
            <p className={`relative z-10 leading-[1.85] text-justify hyphens-auto p-2.5 rounded-[1px] bg-[var(--accent-surface)] border-l-2 border-[var(--text-main)] transition-colors duration-100 ${
              isDialogue ? 'italic font-serif text-[var(--text-main)] font-medium' : 'text-[var(--text-main)]'
            }`}>
              {tokens.map((token, idx) => {
                if (idx === activeTokenIdx) {
                  return (
                    <span
                      key={idx}
                      className="bg-[var(--accent)] text-[var(--on-accent)] font-bold px-1 py-0.5 rounded-[1px] inline-block transition-transform duration-75"
                    >
                      {token}
                    </span>
                  );
                }
                return <React.Fragment key={idx}>{token}</React.Fragment>;
              })}
            </p>
          )}
        </>
      );
    }

    // Active segment at start or without progress prop (ensures exact text match in Vitest tests)
    return (
      <>
        {imageElement}
        {displayText && (
          <p className={`relative z-10 leading-[1.85] text-justify hyphens-auto p-2 rounded-[1px] bg-[var(--accent-surface)] border-l-2 border-[var(--text-main)] ${
            isDialogue ? 'italic text-[var(--text-main)] font-serif font-medium' : 'text-[var(--text-main)] font-normal'
          }`}>
            {displayText}
          </p>
        )}
      </>
    );
  };

  return (
    <div className={`pb-36 transition-opacity duration-300 ${isFocusMode ? 'focus-mode-active' : ''}`}>
      {/* Floating Focus Mode Banner */}
      {isFocusMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-surface)] text-[var(--text-main)] text-xs px-4 py-2 rounded-[1px] border border-[var(--border-strong)] shadow-2xl flex items-center gap-3 animate-fade-in font-mono">
          <span className="signal-dot" />
          <span>Focus Mode Active • Press Esc to exit</span>
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            className="boxed-btn px-2 py-0.5 text-[10px] font-mono cursor-pointer transition"
          >
            Exit
          </button>
        </div>
      )}

      {/* Choose Reading Experience Modal (Moon+ OpenGL 3D vs Normal WTR-Lab) */}
      {showExperiencePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 modal-scrim-enter"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-[1px] shadow-2xl border border-[var(--border-strong)] p-6 modal-panel-enter space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[1px] bg-[var(--accent-surface)] text-[var(--text-main)] flex items-center justify-center font-bold border border-[var(--border-subtle)]">
                  <IconBookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] font-sans uppercase tracking-tight">Choose Reading Experience</h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">Select how you want to read this chapter</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleChooseMode('normal')}
                className="boxed-btn p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition cursor-pointer"
                aria-label="Dismiss experience popup"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Card 1: Normal Mode */}
              <button
                type="button"
                onClick={() => handleChooseMode('normal')}
                className={`p-4 rounded-[1px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  readerMode === 'normal'
                    ? 'border-[var(--accent)] bg-[var(--accent-surface)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="w-8 h-8 rounded-[1px] bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] flex items-center justify-center">
                  <IconBookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-main)] font-sans uppercase">
                    Normal Mode
                  </h4>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 leading-relaxed">
                    Continuous vertical scroll with synchronized high-contrast voice highlight.
                  </p>
                </div>
              </button>

              {/* Card 2: Apple Books / Moon+ OpenGL 3D Spread Mode */}
              <button
                type="button"
                onClick={() => handleChooseMode('opengl')}
                className={`p-4 rounded-[1px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                  readerMode === 'opengl'
                    ? 'border-[var(--accent)] bg-[var(--accent-surface)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="w-8 h-8 rounded-[1px] bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] flex items-center justify-center">
                  <IconBook className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-main)] font-sans uppercase">
                    Moon+ OpenGL 3D Spread
                  </h4>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 leading-relaxed">
                    Two-page side-by-side spread with 3D page-curl and synchronized voice highlight.
                  </p>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-[var(--text-muted)] text-center font-mono">
              Switch between Normal &amp; OpenGL anytime in the reader toolbar.
            </p>
          </div>
        </div>
      )}

      {/* Sticky Reader Sub-Header Controls */}
      <header className="sticky top-0 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-2 bg-[var(--bg-bar)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back Link & Chapter Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="boxed-btn px-2.5 py-1 text-xs font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer flex items-center gap-1.5"
              aria-label="Back to novel details"
            >
              <IconArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          )}
          {currentNovel && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[var(--text-muted)] select-none font-mono">/</span>
              <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[140px] sm:max-w-[200px] font-sans">
                {currentNovel.title}
              </span>
              {currentChapter && (
                chapters && chapters.length > 1 ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!prevChapter}
                      onClick={() => prevChapter && onSelectChapter?.(prevChapter.id)}
                      className="boxed-btn px-1.5 py-0.5 text-xs font-mono font-bold text-[var(--text-main)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Previous Chapter"
                      aria-label="Previous Chapter"
                    >
                      ‹
                    </button>
                    <div className="relative inline-flex items-center">
                      <select
                        value={currentChapter.id}
                        onChange={(e) => onSelectChapter?.(e.target.value)}
                        className="boxed-btn px-2 py-0.5 text-xs font-mono font-semibold bg-[var(--bg-card)] text-[var(--text-main)] cursor-pointer focus:outline-none appearance-none pr-4 truncate max-w-[90px] sm:max-w-[180px]"
                        aria-label="Select Chapter"
                      >
                        {chapters.map((ch) => (
                          <option
                            key={ch.id}
                            value={ch.id}
                            className="bg-[var(--bg-surface)] text-[var(--text-main)]"
                          >
                            {ch.title || `Chapter ${ch.chapter_number}`}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none text-[9px] text-[var(--text-muted)] -ml-3">▾</span>
                    </div>
                    <button
                      type="button"
                      disabled={!nextChapter}
                      onClick={() => nextChapter && onSelectChapter?.(nextChapter.id)}
                      className="boxed-btn px-1.5 py-0.5 text-xs font-mono font-bold text-[var(--text-main)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Next Chapter"
                      aria-label="Next Chapter"
                    >
                      ›
                    </button>
                  </div>
                ) : (
                  <span className="boxed-btn px-2 py-0.5 text-xs font-mono font-bold text-[var(--text-main)] truncate max-w-[110px] sm:max-w-[200px]">
                    {currentChapter.title}
                  </span>
                )
              )}
            </div>
          )}
        </div>

        {/* Right: Mode Switcher (Normal | OpenGL) + Font Controls + Focus Mode */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-xs">
          {/* Moon+ Reader Mode Switcher: Normal vs OpenGL 3D */}
          <div
            className="inline-flex border border-[var(--border-strong)] rounded-[1px] p-0.5 bg-[var(--bg-card)]"
            role="group"
            aria-label="Reading mode selection"
          >
            <button
              type="button"
              onClick={() => setReaderMode('normal')}
              className={`px-2 py-0.5 text-[11px] font-mono font-medium transition cursor-pointer flex items-center gap-1.5 rounded-[1px] ${
                readerMode === 'normal'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
              title="Normal continuous vertical scroll mode (WTR-Lab)"
            >
              <IconBookOpen className="w-3 h-3" />
              <span>Normal</span>
            </button>
            <button
              type="button"
              onClick={() => setReaderMode('opengl')}
              className={`px-2 py-0.5 text-[11px] font-mono font-medium transition cursor-pointer flex items-center gap-1.5 rounded-[1px] ${
                readerMode === 'opengl'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
              title="Apple Books & Moon+ Reader Pro 3D OpenGL page-turn two-page spread mode"
            >
              <IconBook className="w-3 h-3" />
              <span>OpenGL 3D</span>
            </button>
          </div>

          {/* Font Family Switcher */}
          <div
            className="inline-flex border border-[var(--border-strong)] rounded-[1px] p-0.5 bg-[var(--bg-card)]"
            role="group"
            aria-label="Font family selection"
          >
            <button
              type="button"
              onClick={() => setFontFamily('serif')}
              className={`px-2 py-0.5 text-[11px] font-serif font-medium transition cursor-pointer rounded-[1px] ${
                fontFamily === 'serif'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              Serif
            </button>
            <button
              type="button"
              onClick={() => setFontFamily('sans')}
              className={`px-2 py-0.5 text-[11px] font-sans font-medium transition cursor-pointer rounded-[1px] ${
                fontFamily === 'sans'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              Sans
            </button>
          </div>

          {/* Font Size Adjuster */}
          <div
            className="inline-flex items-center border border-[var(--border-strong)] rounded-[1px] px-1 py-0.5 bg-[var(--bg-card)]"
            role="group"
            aria-label="Font size adjustment"
          >
            <button
              type="button"
              onClick={decreaseFontSize}
              className="px-1.5 font-bold font-mono text-[var(--text-sub)] hover:text-[var(--text-main)] transition cursor-pointer"
              aria-label="Decrease font size"
            >
              A-
            </button>
            <span className="text-[10px] font-mono text-[var(--text-main)] px-1 min-w-[2rem] text-center font-bold">
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={increaseFontSize}
              className="px-1.5 font-bold font-mono text-[var(--text-sub)] hover:text-[var(--text-main)] transition cursor-pointer"
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>

          {/* TTS Clean Sanitizer Toggle */}
          <button
            type="button"
            data-testid="reader-tts-sanitizer-toggle"
            aria-pressed={isSanitizerActive}
            onClick={handleToggleSanitizer}
            title={
              isSanitizerActive
                ? 'TTS Clean: ON (Filtering OCR noise, spam & junk divider symbols)'
                : 'TTS Clean: OFF (Click to filter scanned OCR noise, dividers & duplicate paragraphs)'
            }
            className={`boxed-btn px-2 py-1 text-[11px] font-mono cursor-pointer flex items-center gap-1.5 ${
              isSanitizerActive
                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] font-bold'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            <span>TTS Clean</span>
          </button>

          {/* Focus Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsFocusMode((prev) => !prev)}
            className={`boxed-btn px-2 py-1 text-[11px] font-mono cursor-pointer hidden md:inline-flex ${
              isFocusMode
                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] font-bold'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
            title="Focus mode (distraction-free spotlight reading)"
          >
            {isFocusMode ? 'Exit Focus' : 'Focus'}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="boxed-btn p-1 text-[var(--text-sub)] hover:text-[var(--text-main)] transition cursor-pointer flex items-center justify-center"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2v3"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Floating 'Return to Now' Pill (Normal mode only) */}
      {readerMode === 'normal' && isScrolledAway && activeSegmentId !== -1 && (
        <div className="fixed top-20 right-6 sm:right-12 z-30 motion-view-route">
          <button
            type="button"
            onClick={handleReturnToNow}
            className="boxed-btn-primary px-3 py-1.5 text-xs font-mono shadow-xl flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
            aria-label="Return to active audio position"
          >
            <IconSoundwave className="w-3.5 h-3.5 text-current" />
            <span>Return to now</span>
          </button>
        </div>
      )}

      {/* Render Mode 1: Moon+ Reader Pro 3D OpenGL Mode */}
      {readerMode === 'opengl' ? (
        <div className="pt-6">
          <OpenGLPageReader
            segments={effectiveSegments}
            activeSegmentId={activeSegmentId}
            segmentProgress={segmentProgress}
            isPlaying={isPlaying}
            onSegmentClick={onSegmentClick}
            currentNovel={currentNovel}
            currentChapter={currentChapter}
            nextChapter={nextChapter}
            prevChapter={prevChapter}
            onNextChapter={() => {
              if (nextChapter) {
                if (onNextChapter) {
                  onNextChapter();
                } else if (onSelectChapter) {
                  onSelectChapter(nextChapter.id);
                }
              }
            }}
            onBack={onBack}
            onSwitchToNormal={() => setReaderMode('normal')}
            fontFamily={fontFamily}
            fontSize={fontSize}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
          />
        </div>
      ) : (
        /* Render Mode 2: Normal Continuous Vertical Scroll (WTR-Lab Mode) */
        <article
          className={`max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-4 ${
            fontFamily === 'serif' ? 'font-serif' : 'font-sans'
          }`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {/* Literary Chapter Stage Header */}
          <header className="border-b border-[var(--border-subtle)] pb-6 mb-8 select-none">
            <div className="text-[11px] font-mono text-[var(--text-muted)] tracking-wider uppercase mb-2">
              {currentNovel?.title ? `// ${currentNovel.title.toUpperCase()}` : '// SYNC NOVEL'}
              {currentNovel?.author_username ? ` // BY ${currentNovel.author_username.toUpperCase()}` : ''}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-main)] font-sans">
              {currentChapter?.title || 'Chapter I'}
            </h1>
            <div className="text-[11px] font-mono text-[var(--text-sub)] mt-2 flex items-center gap-2">
              <span>FORMAT: MULTI-VOICE DRAMA</span>
              <span>•</span>
              <span>NARRATED BY {currentNovel?.narrator || 'DR. JOHN WATSON'}</span>
            </div>
          </header>

          {effectiveSegments.map((seg) => {
            const segId = seg.segment_id !== undefined ? seg.segment_id : seg.order;
            const isActive = segId === activeSegmentId;
            const isDialogue = seg.type === 'dialogue';
            const speakerKey =
              seg.character_id || seg.speaker_id || (isDialogue ? seg.speaker_name : 'narrator');
            const color = getSpeakerColor(speakerKey);
            const isEqActive = isActive && isPlaying && isTabVisible;

            return (
              <div
                key={segId}
                ref={isActive ? activeElementRef : null}
                onClick={() => onSegmentClick && onSegmentClick(segId)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && onSegmentClick) {
                    e.preventDefault();
                    onSegmentClick(segId);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`${
                  isDialogue ? `${seg.speaker_name || 'Character'}: ` : 'Narrator: '
                }${seg.text}`}
                className={`
                  group relative p-4 sm:p-5 rounded-[1px] transition-all duration-120 cursor-pointer outline-none select-text
                  ${
                    isActive
                      ? 'bg-[var(--accent-surface)] border-l-2 border-[var(--text-main)] border-y border-r border-[var(--border-subtle)]'
                      : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }
                `}
              >
                {/* Dynamic Speaker Header Row */}
                <div className="relative z-10 flex items-center justify-between mb-2 text-xs font-mono">
                  {isDialogue ? (
                    <span className="font-bold text-[var(--text-main)] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)]" />
                      <span>{seg.speaker_name || 'Character'}</span>
                    </span>
                  ) : (
                    <span className="font-medium text-[var(--text-sub)] font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-60" />
                      <span>{seg.speaker_name || 'Narrator'}</span>
                    </span>
                  )}

                  {/* Equalizer Playing Indicator */}
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[var(--text-main)] bg-[var(--bg-card)] px-2 py-0.5 rounded-[1px] border border-[var(--border-strong)]">
                      <span className="signal-dot" />
                      <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                      <IconPlay className="w-3 h-3 text-[var(--text-main)]" />
                      <span>Listen from here</span>
                    </span>
                  )}
                </div>

                {/* Prose Text with High-Contrast Highlight */}
                {renderSegmentText(seg, isActive)}
              </div>
            );
          })}

          {/* Chapter Navigation Footer at End of Prose */}
          {(prevChapter || nextChapter || onNextChapter) && (
            <div className="pt-10 pb-6 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
              {prevChapter ? (
                <button
                  type="button"
                  onClick={() => onSelectChapter?.(prevChapter.id)}
                  className="boxed-btn px-3 py-1.5 text-xs font-mono text-[var(--text-main)] hover:bg-[var(--bg-hover)] cursor-pointer flex items-center gap-1.5"
                >
                  <span>‹ {prevChapter.title || `Chapter ${prevChapter.chapter_number}`}</span>
                </button>
              ) : (
                <div />
              )}
              {nextChapter ? (
                <button
                  type="button"
                  onClick={() => (onSelectChapter ? onSelectChapter(nextChapter.id) : onNextChapter?.())}
                  className="boxed-btn-primary px-3.5 py-1.5 text-xs font-mono cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next: {nextChapter.title || `Chapter ${nextChapter.chapter_number}`} ›</span>
                </button>
              ) : onNextChapter ? (
                <button
                  type="button"
                  onClick={onNextChapter}
                  className="boxed-btn-primary px-3.5 py-1.5 text-xs font-mono cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next Chapter ›</span>
                </button>
              ) : (
                <div />
              )}
            </div>
          )}
        </article>
      )}
    </div>
  );
}
