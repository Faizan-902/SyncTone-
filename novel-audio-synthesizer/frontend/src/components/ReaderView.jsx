import React, { useEffect, useRef } from 'react';
import { getSpeakerColor } from '../utils/speakerColors';

export default function ReaderView({ segments = [], activeSegmentId = -1, onSegmentClick }) {
  const activeElementRef = useRef(null);
  const prevActiveIdRef = useRef(-1);

  // Auto-center active line only when activeSegmentId actually changes
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
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 text-sm">
        No chapter prose segments loaded.
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-3xl mx-auto py-4">
      {segments.map((seg) => {
        const segId = seg.segment_id !== undefined ? seg.segment_id : seg.order;
        const isActive = segId === activeSegmentId;
        const isDialogue = seg.type === 'dialogue';
        const speakerKey = seg.character_id || seg.speaker_id || (isDialogue ? seg.speaker_name : 'narrator');
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
            className={`
              group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer outline-none select-text
              ${color.bg} ${color.border}
              ${
                isActive
                  ? `shadow-lg ring-2 ${color.ring} ring-opacity-60 scale-[1.01] bg-white border-indigo-400 z-10`
                  : 'hover:border-gray-300 hover:shadow-sm hover:scale-[1.002]'
              }
            `}
          >
            {/* Speaker Header (for Dialogue) */}
            {isDialogue && (
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-2xs ${color.badge}`}
                >
                  <span>🗣️</span>
                  <span>{seg.speaker_name || 'Dialogue'}</span>
                </span>

                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span>Playing</span>
                  </span>
                )}
              </div>
            )}

            {/* Narrator Indicator */}
            {!isDialogue && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Narrator
                </span>
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span>Playing</span>
                  </span>
                )}
              </div>
            )}

            {/* Prose Text Content */}
            <p
              className={`text-gray-900 leading-relaxed font-serif text-[15px] sm:text-base ${
                isDialogue ? 'italic font-medium text-slate-900' : 'text-slate-800'
              }`}
            >
              {isDialogue ? `"${seg.text.replace(/^["“”]|["“”]$/g, '')}"` : seg.text}
            </p>

            {/* Hover Tooltip / Hint */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 bottom-2 text-[10px] text-gray-400 font-sans pointer-events-none">
              Click to seek
            </div>
          </div>
        );
      })}
    </div>
  );
}
