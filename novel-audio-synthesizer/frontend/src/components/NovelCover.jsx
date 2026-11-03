import React, { useState, useEffect } from 'react';

// Curated Earthy Luxury artistic cover styles
export const COVER_STYLES = {
  espresso: {
    bg: 'bg-gradient-to-br from-[#1A120E] via-[#2A1B14] to-[#140D0A]',
    border: 'border-[#A88462]/35',
    spine: 'border-l-[#A88462]/60',
    accentText: 'text-[#A88462]',
    subText: 'text-[#D5C4AE]/80',
    glow: 'rgba(168, 132, 98, 0.25)',
    emblem: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#A88462] mx-auto drop-shadow-[0_0_12px_rgba(168,132,98,0.4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18l-8 8m8-8l8 8" />
        <circle cx="12" cy="12" r="9" strokeWidth="1" opacity="0.6" />
      </svg>
    ),
    eyebrow: 'ESPRESSO & BRONZE',
    edition: 'Archival Gilded Edition',
  },
  chocolate: {
    bg: 'bg-gradient-to-br from-[#3A2418] via-[#2E1D13] to-[#1F130B]',
    border: 'border-[#D5C4AE]/25',
    spine: 'border-l-[#D5C4AE]/40',
    accentText: 'text-[#D5C4AE]',
    subText: 'text-[#A88462]',
    glow: 'rgba(58, 36, 24, 0.35)',
    emblem: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#D5C4AE] mx-auto drop-shadow-[0_0_10px_rgba(213,196,174,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" d="M12 7v10M7 12h10" strokeWidth="1" opacity="0.6" />
      </svg>
    ),
    eyebrow: 'DARK CHOCOLATE & SAND',
    edition: 'Blind-Stamped Edition',
  },
  walnut: {
    bg: 'bg-gradient-to-br from-[#5A3E2B] via-[#432D1E] to-[#2B1B10]',
    border: 'border-[#87A96B]/30',
    spine: 'border-l-[#5A3E2B]/90',
    accentText: 'text-[#D5C4AE]',
    subText: 'text-[#D5C4AE]/80',
    glow: 'rgba(90, 62, 43, 0.45)',
    emblem: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#D5851F] mx-auto drop-shadow-[0_0_12px_rgba(213,133,31,0.4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    eyebrow: 'WALNUT BROWN MASTERWORK',
    edition: 'Master Binding Edition',
  },
  sage: {
    bg: 'bg-gradient-to-br from-[#1E271D] via-[#2A3628] to-[#141C13]',
    border: 'border-[#87A96B]/35',
    spine: 'border-l-[#87A96B]/65',
    accentText: 'text-[#87A96B]',
    subText: 'text-[#D5C4AE]/80',
    glow: 'rgba(135, 169, 107, 0.28)',
    emblem: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#87A96B] mx-auto drop-shadow-[0_0_12px_rgba(135,169,107,0.45)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10c0 5.5-4.5 10-10 10z" strokeWidth="1" opacity="0.35" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m0-12c-2.5 2-4 5-4 8 0 2 1.5 3 4 4m0-12c2.5 2 4 5 4 8 0 2-1.5 3-4 4" />
      </svg>
    ),
    eyebrow: 'BOTANICAL & SAGE',
    edition: 'Antiquarian Herbarium Edition',
  },
  amber: {
    bg: 'bg-gradient-to-br from-[#3D250E] via-[#2A1807] to-[#170E04]',
    border: 'border-[#D5851F]/40',
    spine: 'border-l-[#D5851F]/75',
    accentText: 'text-[#D5851F]',
    subText: 'text-[#D5C4AE]/80',
    glow: 'rgba(213, 133, 31, 0.35)',
    emblem: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#D5851F] mx-auto drop-shadow-[0_0_12px_rgba(213,133,31,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        <circle cx="12" cy="12" r="4" strokeWidth="1" opacity="0.6" />
      </svg>
    ),
    eyebrow: 'AMBER GLOW CHRONICLES',
    edition: 'Living Amber Illuminated Edition',
  },
  charcoal: {
    bg: 'bg-gradient-to-br from-[#4A4A46] via-[#353532] to-[#1E1E1C]',
    border: 'border-[#D5C4AE]/30',
    spine: 'border-l-[#D5C4AE]/50',
    accentText: 'text-[#D5C4AE]',
    subText: 'text-[#A88462]',
    glow: 'rgba(74, 74, 70, 0.35)',
    emblem: (
      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#D5C4AE]/90 mx-auto drop-shadow-[0_0_10px_rgba(213,196,174,0.3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    eyebrow: 'CHARCOAL & SAND',
    edition: 'Editorial Masterpiece',
  },
};

export function getCoverStyle(title = '') {
  const safeTitle = typeof title === 'string' ? title : '';
  let hash = 0;
  for (let i = 0; i < safeTitle.length; i++) {
    hash = ((hash << 5) - hash + safeTitle.charCodeAt(i)) | 0;
  }
  const styles = [
    COVER_STYLES.amber,
    COVER_STYLES.sage,
    COVER_STYLES.walnut,
    COVER_STYLES.espresso,
    COVER_STYLES.chocolate,
  ];
  return styles[Math.abs(hash) % styles.length];
}

export default function NovelCover({
  title = 'Untitled Novel',
  author = '',
  coverUrl = null,
  className = '',
}) {
  const [imgError, setImgError] = useState(false);
  const displayTitle = typeof title === 'string' && title.trim().length > 0 ? title : 'Untitled Novel';
  const displayAuthor = typeof author === 'string' ? author.trim() : '';
  const style = getCoverStyle(displayTitle);

  useEffect(() => {
    setImgError(false);
  }, [coverUrl]);

  // If real image URL is valid, render image with rich book spine & ambient shadow
  if (coverUrl && !imgError) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
          loading="lazy"
        />
        {/* Book spine lighting */}
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-0 shadow-[inset_0_0_1px_rgba(255,255,255,0.2)] pointer-events-none" />
      </div>
    );
  }

  // Generative Artistic Hardcover: Rich book design with spine binding, foil borders, and literary emblem
  return (
    <div
      className={`relative w-full h-full ${style.bg} border ${style.border} border-l-[6px] ${style.spine} flex flex-col justify-between p-3.5 sm:p-5 select-none overflow-hidden ${className}`}
      style={{
        boxShadow: `inset 4px 0 12px rgba(0, 0, 0, 0.7), inset 1px 0 0 rgba(255, 255, 255, 0.15), 0 8px 24px ${style.glow}`,
      }}
      aria-hidden="true"
    >
      {/* Ornate Inner Border Frame */}
      <div className="absolute inset-2 sm:inset-2.5 border border-white/10 rounded pointer-events-none" />
      <div className="absolute inset-2.5 sm:inset-3 border border-dashed border-white/5 rounded pointer-events-none" />

      {/* Subtle corner flourish */}
      <div className="absolute top-3 right-3 text-[9px] font-mono text-[#A88462]/60 pointer-events-none">
        ✦
      </div>
      <div className="absolute bottom-3 left-3 text-[9px] font-mono text-[#A88462]/60 pointer-events-none">
        ✦
      </div>

      {/* Top: Category Eyebrow & Authenticity Seal */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest uppercase text-[#D5C4AE]/70">
          {style.eyebrow}
        </span>
        <span className="text-[9px] text-[#A88462] font-mono font-semibold">
          ✦ Edition
        </span>
      </div>

      {/* Center: Mythic Emblem & Typeset Title/Author */}
      <div className="relative z-10 my-auto text-center py-1 sm:py-2 space-y-1.5 sm:space-y-2">
        <div className="transform transition-transform duration-300 group-hover:scale-105">
          {style.emblem}
        </div>

        <div className="space-y-1 px-1">
          <div
            className="font-serif font-bold text-center text-[#D5C4AE] leading-tight text-[11px] sm:text-xs md:text-sm line-clamp-2 drop-shadow-md cover-typeset-title"
            data-title={displayTitle}
          />
          {displayAuthor && (
            <div
              className="text-[8px] sm:text-[9px] font-mono tracking-widest uppercase text-[#A88462] text-center truncate cover-typeset-author"
              data-author={`By ${displayAuthor}`}
            />
          )}
          <p className={`text-[8px] sm:text-[9px] font-mono tracking-wider uppercase font-semibold ${style.accentText} pt-0.5 opacity-80`}>
            {style.edition}
          </p>
        </div>
      </div>

      {/* Bottom: Decorative Publisher Ribbon */}
      <div className="relative z-10 pt-1.5 sm:pt-2 border-t border-white/10 flex items-center justify-between text-[8px] sm:text-[9px] font-mono tracking-widest text-[#D5C4AE]/50 uppercase">
        <span>SyncTone</span>
        <span>Full Cast</span>
      </div>

      {/* Ambient Lighting Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/5 pointer-events-none" />
      {/* Book spine shadow */}
      <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/80 to-transparent pointer-events-none" />
    </div>
  );
}
