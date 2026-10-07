/**
 * ReaderView — Displays chapter text with segment highlighting and click-to-seek.
 *
 * Each segment is rendered as a paragraph (narration) or blockquote (dialogue).
 * The active segment is highlighted and auto-scrolled into view.
 */

import React, { useEffect, useRef } from 'react';
import type { Segment } from '../types';

interface ReaderViewProps {
  segments: Segment[];
  activeSegmentId: number;
  onSegmentClick: (segmentId: number) => void;
}

// Consistent color mapping based on speaker_id hash
const SPEAKER_COLORS = [
  { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800' },
  { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800' },
  { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-800' },
  { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-800' },
  { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800' },
  { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800' },
  { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800' },
  { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
];

function getSpeakerColor(speakerId: string) {
  if (speakerId === 'narrator') {
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
  }
  // Simple hash for consistent color assignment
  let hash = 0;
  for (let i = 0; i < speakerId.length; i++) {
    hash = ((hash << 5) - hash + speakerId.charCodeAt(i)) | 0;
  }
  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
}

export default function ReaderView({ segments, activeSegmentId, onSegmentClick }: ReaderViewProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current && activeSegmentId >= 0) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentId]);

  return (
    <div className="space-y-3">
      {segments.map((seg) => {
        const isActive = seg.segment_id === activeSegmentId;
        const color = getSpeakerColor(seg.speaker_id);

        return (
          <div
            key={seg.segment_id}
            ref={isActive ? activeRef : null}
            onClick={() => onSegmentClick(seg.segment_id)}
            className={`
              segment-highlight
              p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200
              ${color.bg} ${color.border}
              ${isActive ? 'segment-active ring-2 ring-blue-400 ring-opacity-50 scale-[1.01]' : 'hover:shadow-sm'}
            `}
          >
            {/* Speaker label */}
            {seg.type === 'dialogue' && seg.speaker_name && (
              <div className={`text-xs font-semibold ${color.text} mb-1 uppercase tracking-wide`}>
                {seg.speaker_name}
                {seg.attribution_confidence < 0.8 && (
                  <span className="ml-1 text-gray-400 normal-case" title={`Source: ${seg.attribution_source}`}>
                    (uncertain)
                  </span>
                )}
              </div>
            )}

            {/* Segment text */}
            <p className={`text-gray-800 leading-relaxed ${
              seg.type === 'dialogue' ? 'italic' : ''
            }`}>
              {seg.type === 'dialogue' ? `"${seg.text}"` : seg.text}
            </p>

            {/* Narration label */}
            {seg.type === 'narration' && (
              <div className="text-xs text-gray-400 mt-1">Narrator</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
