import React, { useState } from 'react';
import { IconBook } from './icons';

// Curated literary palettes for procedural covers
const LITERARY_PALETTES = [
  {
    bg: 'bg-gradient-to-br from-amber-950/70 via-[#12131C] to-[#0A0B10]',
    accent: 'text-amber-300',
    border: 'border-amber-500/20',
    spine: 'border-l-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    motif: '✦',
  },
  {
    bg: 'bg-gradient-to-br from-indigo-950/80 via-[#101426] to-[#0A0D18]',
    accent: 'text-indigo-300',
    border: 'border-indigo-500/20',
    spine: 'border-l-indigo-500/30',
    badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    motif: '◆',
  },
  {
    bg: 'bg-gradient-to-br from-emerald-950/70 via-[#0F1A17] to-[#090F0D]',
    accent: 'text-emerald-300',
    border: 'border-emerald-500/20',
    spine: 'border-l-emerald-500/30',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    motif: '❋',
  },
  {
    bg: 'bg-gradient-to-br from-rose-950/70 via-[#1A1016] to-[#0E090D]',
    accent: 'text-rose-300',
    border: 'border-rose-500/20',
    spine: 'border-l-rose-500/30',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    motif: '❖',
  },
  {
    bg: 'bg-gradient-to-br from-cyan-950/70 via-[#0E1720] to-[#080D14]',
    accent: 'text-cyan-300',
    border: 'border-cyan-500/20',
    spine: 'border-l-cyan-500/30',
    badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    motif: '◈',
  },
];

function getPalette(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % LITERARY_PALETTES.length;
  return LITERARY_PALETTES[idx];
}

export default function NovelCover({
  title = 'Untitled Novel',
  author = '',
  coverUrl = null,
  size = 'md', // 'sm' | 'md' | 'lg' | 'spotlight'
  className = '',
}) {
  const [imgError, setImgError] = useState(false);
  const palette = getPalette(title + author);

  const showImg = Boolean(coverUrl && !imgError);

  if (showImg) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
          loading="lazy"
        />
        <div className="absolute inset-0 shadow-[inset_0_0_1px_rgba(255,255,255,0.15)] pointer-events-none" />
      </div>
    );
  }

  // Procedural Editorial Hardcover
  return (
    <div
      className={`relative w-full h-full ${palette.bg} border ${palette.border} border-l-4 ${palette.spine} shadow-[inset_4px_0_12px_rgba(0,0,0,0.5)] flex flex-col justify-between p-4 overflow-hidden select-none ${className}`}
    >
      {/* Decorative book corner frame */}
      <div className="absolute inset-2 border border-white/5 rounded-sm pointer-events-none" />

      {/* Top Header Foil */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[9px] font-mono tracking-widest uppercase opacity-60 text-white">
          SyncTone Audio
        </span>
        <span className={`text-xs ${palette.accent}`}>{palette.motif}</span>
      </div>

      {/* Center Embossed Emblem */}
      <div className="relative z-10 my-auto text-center space-y-2 px-2" aria-hidden="true">
        <div className="w-12 h-12 mx-auto rounded-xl border border-white/20 bg-white/5 backdrop-blur-xs flex items-center justify-center shadow-inner">
          <span className="font-display font-black text-xl text-white">
            {(title?.[0] || 'S').toUpperCase()}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 opacity-40">
          <div className="w-4 h-px bg-white" />
          <span className="text-[10px] text-white font-mono">{palette.motif}</span>
          <div className="w-4 h-px bg-white" />
        </div>
      </div>

      {/* Bottom Footer Ribbon */}
      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[10px]" aria-hidden="true">
        <span className="text-white/60 font-mono text-[9px] uppercase tracking-wider">
          Neural Novel
        </span>
        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${palette.badge}`}>
          Original
        </span>
      </div>

      {/* Subtle paper grain / vignette lighting */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/5 pointer-events-none" />
    </div>
  );
}
