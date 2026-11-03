import React, { useState, useEffect } from 'react';

const EDITIONS = [
  {
    bg: 'bg-gradient-to-br from-[#3D250E] via-[#2A1807] to-[#170E04]',
    border: 'border-[#D5851F]/40 border-l-[#D5851F]/80',
    accentText: 'text-[#D5851F]',
    authorText: 'text-[#A88462]',
    titleClass: 'text-[#D5C4AE]',
    glow: 'rgba(213,133,31,0.4)',
    eyebrow: 'AMBER GLOW',
    edition: 'Illuminated Edition',
    emblem: <polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2" />,
    color: 'text-[#D5851F]',
  },
  {
    bg: 'bg-gradient-to-br from-[#1E271D] via-[#2A3628] to-[#141C13]',
    border: 'border-[#87A96B]/40 border-l-[#87A96B]/75',
    accentText: 'text-[#87A96B]',
    authorText: 'text-[#87A96B]',
    titleClass: 'text-[#D5C4AE]',
    glow: 'rgba(135,169,107,0.35)',
    eyebrow: 'BOTANICAL & SAGE',
    edition: 'Antiquarian Herbarium',
    emblem: <circle cx="12" cy="12" r="8" strokeWidth="1.2" />,
    color: 'text-[#87A96B]',
  },
  {
    bg: 'bg-gradient-to-br from-[#4A3222] via-[#382417] to-[#22150D]',
    border: 'border-[#A88462]/45 border-l-[#5A3E2B]',
    accentText: 'text-[#D5C4AE]',
    authorText: 'text-[#A88462]',
    titleClass: 'text-[#D5C4AE]',
    glow: 'rgba(90,62,43,0.45)',
    eyebrow: 'WALNUT LEATHER',
    edition: 'Master Binding Edition',
    emblem: <path strokeLinecap="round" d="M12 6v13m-9-12C4 6 6 5 8 5s4 1 4 2m0 0c0-1 2-2 4-2s4 1 5 2v13c-1-1-3-2-5-2s-4 1-4 2" />,
    color: 'text-[#D5851F]',
  },
  {
    bg: 'bg-gradient-to-br from-[#FAF6F0] via-[#F2EAE1] to-[#E5DACB]',
    border: 'border-[#5A3E2B]/25 border-l-[#5A3E2B]/60',
    accentText: 'text-[#5A3E2B]',
    authorText: 'text-[#5A3E2B]',
    titleClass: 'text-[#1A120E]',
    glow: 'rgba(90,62,43,0.2)',
    eyebrow: 'ALABASTER VELLUM',
    edition: 'Archival Vellum Edition',
    emblem: <path strokeLinecap="round" d="M12 7v10M8 12h8" />,
    color: 'text-[#5A3E2B]',
    isLight: true,
  },
  {
    bg: 'bg-gradient-to-br from-[#1A120E] via-[#281A13] to-[#120B08]',
    border: 'border-[#A88462]/40 border-l-[#A88462]/70',
    accentText: 'text-[#A88462]',
    authorText: 'text-[#A88462]',
    titleClass: 'text-[#D5C4AE]',
    glow: 'rgba(168,132,98,0.3)',
    eyebrow: 'ESPRESSO CLOTH',
    edition: 'Fine Cloth Edition',
    emblem: <path strokeLinecap="round" d="M12 4v16m-8-8l8-8 8 8" />,
    color: 'text-[#A88462]',
  },
];

export const COVER_STYLES = {
  amber: EDITIONS[0],
  sage: EDITIONS[1],
  walnut: EDITIONS[2],
  alabaster: EDITIONS[3],
  espresso: EDITIONS[4],
  chocolate: EDITIONS[2],
  charcoal: EDITIONS[4],
};

export function getCoverStyle(title = '', id = '', index = 0) {
  if (typeof index === 'number' && index >= 0) {
    return EDITIONS[index % EDITIONS.length];
  }
  const seed = `${title || ''}#${id || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return EDITIONS[Math.abs(hash) % EDITIONS.length];
}

export default function NovelCover({
  title = 'Untitled Novel',
  author = '',
  coverUrl = null,
  className = '',
  id = '',
  index = 0,
  hideEyebrow = false,
}) {
  const [imgError, setImgError] = useState(false);
  const displayTitle = typeof title === 'string' && title.trim() ? title : 'Untitled Novel';
  const displayAuthor = typeof author === 'string' ? author.trim() : '';
  const style = getCoverStyle(displayTitle, id, index);

  useEffect(() => { setImgError(false); }, [coverUrl]);

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
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
      </div>
    );
  }

  const light = style.isLight;
  return (
    <div
      className={`relative w-full h-full ${style.bg} border border-l-[6px] ${style.border} flex flex-col justify-between p-3.5 sm:p-5 select-none overflow-hidden ${className}`}
      style={{ boxShadow: `inset 4px 0 12px rgba(0,0,0,${light ? '0.2' : '0.7'}),0 8px 24px ${style.glow}` }}
      aria-hidden="true"
    >
      <div className={`absolute inset-2 sm:inset-2.5 border ${light ? 'border-[#5A3E2B]/20' : 'border-white/10'} rounded pointer-events-none`} />
      <div className={`absolute top-2.5 right-2.5 text-[8px] font-mono ${light ? 'text-[#5A3E2B]/50' : 'text-[#A88462]/60'}`}>✦</div>
      <div className={`absolute bottom-2.5 left-2.5 text-[8px] font-mono ${light ? 'text-[#5A3E2B]/50' : 'text-[#A88462]/60'}`}>✦</div>

      <div className="relative z-10 flex items-center justify-between">
        {!hideEyebrow ? (
          <span className={`text-[8px] sm:text-[9px] font-mono font-bold tracking-widest uppercase ${light ? 'text-[#5A3E2B]/75' : 'text-[#D5C4AE]/75'}`}>
            {style.eyebrow}
          </span>
        ) : <span />}
        <span className={`text-[8px] sm:text-[9px] font-mono font-semibold ${light ? 'text-[#5A3E2B]' : 'text-[#A88462]'}`}>
          ✦ Edition
        </span>
      </div>

      <div className="relative z-10 my-auto text-center py-1 sm:py-2 space-y-1.5 sm:space-y-2">
        <svg className={`w-9 h-9 sm:w-11 sm:h-11 ${style.color} mx-auto drop-shadow-md transform transition-transform duration-300 group-hover:scale-105`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          {style.emblem}
        </svg>

        <div className="space-y-1 px-1">
          <div
            className={`font-serif font-bold text-center leading-tight text-[11px] sm:text-xs md:text-sm line-clamp-2 cover-typeset-title ${style.titleClass}`}
            data-title={displayTitle}
          />
          {displayAuthor && (
            <div
              className={`text-[8px] sm:text-[9px] font-mono tracking-widest uppercase text-center truncate cover-typeset-author ${style.authorText}`}
              data-author={`By ${displayAuthor}`}
            />
          )}
          <p className={`text-[8px] sm:text-[9px] font-mono tracking-wider uppercase font-semibold ${style.accentText} pt-0.5 opacity-85`}>
            {style.edition}
          </p>
        </div>
      </div>

      <div className={`relative z-10 pt-1.5 sm:pt-2 border-t ${light ? 'border-[#5A3E2B]/20 text-[#5A3E2B]/65' : 'border-white/10 text-[#D5C4AE]/50'} flex items-center justify-between text-[8px] sm:text-[9px] font-mono tracking-widest uppercase`}>
        <span>SyncTone</span>
        <span>Full Cast</span>
      </div>

      <div className={`absolute inset-0 ${light ? 'bg-gradient-to-t from-[#5A3E2B]/10 via-transparent to-white/20' : 'bg-gradient-to-t from-black/50 via-transparent to-white/5'} pointer-events-none`} />
      <div className={`absolute inset-y-0 left-0 w-2.5 ${light ? 'bg-gradient-to-r from-[#5A3E2B]/35 to-transparent' : 'bg-gradient-to-r from-black/80 to-transparent'} pointer-events-none`} />
    </div>
  );
}
