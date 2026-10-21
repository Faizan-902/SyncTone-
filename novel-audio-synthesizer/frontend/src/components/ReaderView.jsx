import React, { useEffect, useRef } from 'react';
import { getSpeakerColor } from '../utils/speakerColors';
import { useTheme } from '../context/ThemeContext';
import {
  IconMoon,
  IconSun,
  IconScroll,
  IconMic,
  IconSoundwave,
} from './icons';

export default function ReaderView({ segments = [], activeSegmentId = -1, onSegmentClick }) {
  const {
    theme,
    cycleTheme,
    fontFamily,
    toggleFontFamily,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    readerWidth,
    toggleReaderWidth,
  } = useTheme();

  const activeElementRef = useRef(null);
  const prevActiveIdRef = useRef(-1);

  // Auto-center active segment only when activeSegmentId actually changes
  useEffect(() => {
    if (activeSegmentId !== -1 && activeSegmentId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeSegmentId;
      if (typeof activeElementRef.current?.scrollIntoView === 'function') {
        activeElementRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeSegmentId]);

  if (!segments || segments.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-12 text-center text-[var(--text-muted)] text-sm">
        No chapter prose segments loaded.
      </div>
    );
  }

  const maxWidthClass = readerWidth === 'wide' ? 'max-w-4xl' : 'max-w-2xl';
  const fontClass = fontFamily === 'sans' ? 'font-sans' : 'font-serif';
  const ThemeIcon = theme === 'dark' ? IconMoon : theme === 'sepia' ? IconScroll : IconSun;

  return (
    <div className={`space-y-6 ${maxWidthClass} mx-auto transition-all duration-300`}>
      {/* Sticky Reader Typography & Display Toolbar */}
      <div className="sticky top-20 z-30 flex items-center justify-between p-2.5 bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl shadow-lg transition-colors duration-250">
        <div className="flex items-center gap-2">
          {/* Font Family Switcher */}
          <button
            onClick={toggleFontFamily}
            className="px-3 py-1 bg-[var(--bg-surface)] hover:border-indigo-500/50 border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-main)] transition"
            title="Toggle Font (Merriweather Serif / Inter Sans)"
            aria-label="Toggle Font"
          >
            {fontFamily === 'serif' ? 'Serif' : 'Sans'}
          </button>

          {/* Font Size Adjusters */}
          <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-0.5">
            <button
              onClick={decreaseFontSize}
              disabled={fontSize <= 14}
              className="px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition"
              title="Decrease Font Size"
              aria-label="Decrease Font Size"
            >
              A-
            </button>
            <span className="text-[11px] font-mono px-1.5 text-[var(--text-muted)]">{fontSize}px</span>
            <button
              onClick={increaseFontSize}
              disabled={fontSize >= 24}
              className="px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition"
              title="Increase Font Size"
              aria-label="Increase Font Size"
            >
              A+
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reader Width Toggle */}
          <button
            onClick={toggleReaderWidth}
            className="hidden sm:inline-flex px-3 py-1 bg-[var(--bg-surface)] hover:border-indigo-500/50 border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-main)] transition"
            title="Toggle Column Measure"
            aria-label="Toggle Measure"
          >
            {readerWidth === 'standard' ? 'Wide' : 'Standard'}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={cycleTheme}
            className="px-3 py-1 bg-[var(--bg-surface)] hover:border-indigo-500/50 border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-main)] transition flex items-center gap-1.5"
            title="Cycle Reading Palette"
            aria-label="Cycle Palette"
          >
            <ThemeIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize hidden sm:inline">{theme}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Literary Prose Segments */}
      <div className="space-y-3 pt-2">
        {segments.map((seg) => {
          const segId = seg.segment_id !== undefined ? seg.segment_id : seg.order;
          const isActive = segId === activeSegmentId;
          const isDialogue = seg.type === 'dialogue';
          const speakerKey =
            seg.character_id || seg.speaker_id || (isDialogue ? seg.speaker_name : 'narrator');
          const color = getSpeakerColor(speakerKey);

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
              aria-label={`${isDialogue ? `${seg.speaker_name || 'Character'}: ` : 'Narrator: '}${seg.text}`}
              style={{ fontSize: `${fontSize}px` }}
              className={`
                group relative p-4 sm:p-5 rounded-xl border transition-all duration-200 cursor-pointer outline-none select-text
                ${
                  isActive
                    ? 'active-turn bg-[var(--bg-card)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-indigo-500/30'
                }
              `}
            >
              {/* Speaker Header */}
              <div className="flex items-center justify-between mb-2">
                {isDialogue ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono border ${color.badge}`}
                  >
                    <span>{seg.speaker_name || 'Dialogue'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                    <IconMic className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>Narrator</span>
                  </span>
                )}

                {isActive && (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span>Playing</span>
                  </span>
                )}
              </div>

              {/* Prose Text Content */}
              <p
                className={`leading-relaxed text-[var(--text-main)] ${fontClass} ${
                  isDialogue ? 'italic' : 'font-normal'
                }`}
                style={{ lineHeight: '1.75' }}
              >
                {isDialogue ? `"${seg.text.replace(/^["“”]|["“”]$/g, '')}"` : seg.text}
              </p>

              {/* Subtle Seek Prompt on Hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-2 text-[10px] font-mono text-[var(--text-muted)] pointer-events-none">
                Seek here
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
