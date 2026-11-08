import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { preloadNovelDetails, preloadReaderView } from '../App';
import NovelCover from './NovelCover';
import {
  IconSearch,
  IconPlay,
  IconBook,
  IconMic,
  IconStar,
  IconSparkles,
  IconPlus,
  IconRefresh,
  IconUser,
  IconChevronLeft,
  IconChevronRight,
  IconSoundwave,
  IconTrash,
} from './icons';

export default function NovelCatalog({
  onSelectNovel,
  onSelectChapter,
  onOpenAddNovel,
  onOpenSettings,
  onOpenAuth,
  onNovelDeleted,
}) {
  const { user, isAuthenticated } = useAuth();
  const isWriterOrAdmin = user && (user.role === 'writer' || user.role === 'admin');

  const [novels, setNovels] = useState([]);
  const [channel, setChannel] = useState('verified'); // 'verified' | 'community' | 'all'
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [novelToDelete, setNovelToDelete] = useState(null);
  const [isDeletingNovel, setIsDeletingNovel] = useState(false);
  const [deleteNovelError, setDeleteNovelError] = useState(null);

  const handleConfirmDelete = async () => {
    if (!novelToDelete) return;
    setIsDeletingNovel(true);
    setDeleteNovelError(null);
    try {
      await api.novels.delete(novelToDelete.id);
      const deletedId = novelToDelete.id;
      setNovelToDelete(null);
      fetchNovels(channel);
      if (onNovelDeleted) {
        onNovelDeleted(deletedId);
      }
    } catch (err) {
      setDeleteNovelError(err.message || 'Failed to delete novel');
    } finally {
      setIsDeletingNovel(false);
    }
  };

  const searchInputRef = useRef(null);
  const carouselRef = useRef(null);
  const tabRefs = useRef([]);
  const CHANNELS = ['verified', 'community', 'all'];

  const handleTabKeyDown = (e, idx) => {
    let nextIdx = idx;
    if (e.key === 'ArrowRight') {
      nextIdx = (idx + 1) % CHANNELS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + CHANNELS.length) % CHANNELS.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = CHANNELS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setChannel(CHANNELS[nextIdx]);
    tabRefs.current[nextIdx]?.focus();
  };

  // Fetch novels by channel filter
  const fetchNovels = async (selectedChannel, signal) => {
    setIsLoading(true);
    setError(null);
    try {
      const channelParam = selectedChannel === 'all' ? undefined : selectedChannel;
      const data = await api.novels.list(channelParam);
      if (signal && signal.aborted) return;
      setNovels(data.novels || []);
    } catch (err) {
      if (signal && signal.aborted) return;
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to load novel catalog';
      setError(msg);
    } finally {
      if (!signal || !signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchNovels(channel, controller.signal);
    return () => controller.abort();
  }, [channel]);

  // Global "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract dynamic genre tags from current novel collection
  const availableGenres = useMemo(() => {
    const set = new Set();
    novels.forEach((n) => {
      if (n.global_tone) {
        set.add(n.global_tone.toUpperCase());
      }
    });
    return ['ALL', ...Array.from(set).slice(0, 4)];
  }, [novels]);

  // Filter novels by search query and genre chip
  const filteredNovels = useMemo(() => {
    let result = novels;
    if (selectedGenre !== 'ALL') {
      result = result.filter(
        (n) => (n.global_tone || '').toUpperCase() === selectedGenre
      );
    }
    if (!debouncedSearch.trim()) return result;
    const q = debouncedSearch.toLowerCase().trim();
    return result.filter((n) => {
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const synopsisMatch = (n.synopsis || '').toLowerCase().includes(q);
      const authorMatch = (n.author_username || '').toLowerCase().includes(q);
      const narratorMatch = (n.narrator_name || '').toLowerCase().includes(q);
      return titleMatch || synopsisMatch || authorMatch || narratorMatch;
    });
  }, [novels, debouncedSearch, selectedGenre]);

  // Netflix-style automatic billboard rotation state
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isBillboardPaused, setIsBillboardPaused] = useState(false);

  // Reset rotation index when channel filter changes
  useEffect(() => {
    setFeaturedIndex(0);
  }, [channel]);

  // Netflix-style automatic rotation timer (every 6000ms when not paused or searching)
  useEffect(() => {
    if (debouncedSearch || isBillboardPaused || novels.length <= 1) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % novels.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [debouncedSearch, isBillboardPaused, novels.length]);

  // Featured Hero Novel (cycles automatically through novels)
  const featuredNovel = useMemo(() => {
    if (novels.length === 0) return null;
    return novels[featuredIndex % novels.length] || novels[0];
  }, [novels, featuredIndex]);

  // Top 10 Ranked List (up to 10 novels)
  const top10Novels = useMemo(() => {
    return novels.slice(0, 10);
  }, [novels]);

  const handleStartListening = async (novel, e) => {
    if (e) e.stopPropagation();
    if (!novel) return;
    try {
      const data = await api.novels.get(novel.id);
      const ch1 = (data.chapters || []).find((c) => c.chapter_number === 1) || data.chapters?.[0];
      if (ch1 && onSelectChapter) {
        onSelectChapter(novel, ch1);
        return;
      }
    } catch (_) {}
    onSelectNovel(novel.id);
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: direction * 340, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Error State with Retry Button */}
      {error && (
        <div className="p-8 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-center space-y-3">
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
          <button
            onClick={() => fetchNovels(channel)}
            className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-bold rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
          >
            <IconRefresh className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && !error && (
        <div className="space-y-10 animate-pulse">
          {/* Hero Billboard Skeleton */}
          <div className="w-full h-[480px] rounded-3xl theme-card border p-8 sm:p-12 flex flex-col justify-end space-y-4">
            <div className="h-4 w-40 bg-[var(--border-subtle)] rounded-md" />
            <div className="h-10 w-96 max-w-full bg-[var(--border-subtle)] rounded-xl" />
            <div className="h-14 w-full max-w-xl bg-[var(--border-subtle)] rounded-xl" />
            <div className="flex gap-4 pt-4">
              <div className="h-12 w-44 bg-[var(--border-subtle)] rounded-xl" />
              <div className="h-12 w-32 bg-[var(--border-subtle)] rounded-xl" />
            </div>
          </div>

          {/* Grid Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl theme-card border overflow-hidden flex flex-col">
                <div className="aspect-[3/4] bg-[var(--border-subtle)]" />
                <div className="p-4 space-y-3 flex-1">
                  <div className="h-3 w-24 bg-[var(--border-subtle)] rounded" />
                  <div className="h-5 w-full bg-[var(--border-subtle)] rounded" />
                  <div className="h-3 w-28 bg-[var(--border-subtle)] rounded" />
                  <div className="h-10 w-full bg-[var(--border-subtle)] rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content when Loaded */}
      {!isLoading && !error && (
        <>
          {/* ================================================================= */}
          {/* 2. NOIR MONOCHROME HERO STAGE (Tall Stage Gradient & 3D Cover)    */}
          {/* ================================================================= */}
          {featuredNovel && !searchQuery.trim() && (
            <section
              className="relative w-full -mx-4 sm:-mx-8 -mt-6 mb-10 px-4 sm:px-8 lg:px-12 pt-8 pb-14 border-b border-[var(--border-subtle)] flex flex-col justify-between transition-all duration-300"
              style={{
                background: 'var(--stage-gradient)',
              }}
              aria-label="Featured Novel Billboard"
              data-testid="featured-novel-billboard"
              onMouseEnter={() => setIsBillboardPaused(true)}
              onMouseLeave={() => setIsBillboardPaused(false)}
              onFocus={() => setIsBillboardPaused(true)}
              onBlur={() => setIsBillboardPaused(false)}
            >
              <div className="max-w-7xl mx-auto w-full flex flex-col justify-between">
                {/* Eyebrow Real-Data Tag */}
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 text-[11px] font-mono tracking-wider uppercase border border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-[1px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>FEATURED VOLUME // VOL. {String(featuredIndex + 1).padStart(2, '0')} — {featuredNovel.title.toUpperCase()}</span>
                  </span>
                  {isBillboardPaused && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider px-2 py-0.5 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      Paused
                    </span>
                  )}
                </div>

                {/* Display Headline: STORIES THAT / SPEAK (80-85% Width) */}
                <div className="w-full mb-8 sm:mb-10">
                  <h1 className="font-sans font-black text-5xl sm:text-7xl md:text-8xl lg:text-[7.2rem] xl:text-[8.2rem] tracking-tighter uppercase leading-[0.85] text-[var(--text-main)]">
                    <span className="headline-gradient block">STORIES THAT</span>
                    <span className="headline-gradient headline-skew block opacity-45">SPEAK</span>
                  </h1>
                </div>

                {/* Hero Triad Grid: Left Credits, Center 3D Book, Right Sans Blurb */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-center w-full mb-8">
                  {/* Left Column: Mono Metadata Credits ("AT A GLANCE") */}
                  <div className="border-l border-[var(--border-strong)] pl-5 flex flex-col gap-3.5 font-mono">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider">FEATURED TITLE</span>
                      <span
                        onClick={() => onSelectNovel(featuredNovel.id)}
                        className="text-xs font-bold text-[var(--text-main)] truncate cursor-pointer hover:underline"
                        title={featuredNovel.title}
                      >
                        {featuredNovel.title.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider">AUTHOR</span>
                      <span className="text-xs font-bold text-[var(--text-main)]">
                        {(featuredNovel.author_username || 'SYNCTONE AUTHOR').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider">NARRATOR</span>
                      <span className="text-xs font-bold text-[var(--text-main)]">
                        {(featuredNovel.narrator_name || 'STUDIO ENSEMBLE').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider">SCOPE</span>
                      <span className="text-xs font-bold text-[var(--text-main)]">
                        {featuredNovel.chapter_count || 1} CHAPTERS
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider">FORMAT</span>
                      <span className="text-xs font-bold text-[var(--text-main)]">
                        {(featuredNovel.global_tone || 'SYNCHRONIZED MULTI-VOICE').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Center Column: 3D Tilted Novel Showcase */}
                  <div className="flex justify-center items-center py-4 tilted-cover-stage">
                    <div
                      onClick={() => onSelectNovel(featuredNovel.id)}
                      className="relative w-52 sm:w-60 lg:w-64 aspect-[2/3] tilted-cover cursor-pointer group rounded-[2px]"
                      style={{
                        boxShadow: '-22px 26px 45px rgba(0, 0, 0, 0.85), -6px 8px 15px rgba(0, 0, 0, 0.65)',
                      }}
                      title={featuredNovel.title}
                    >
                      <div className="w-full h-full bg-[#111114] border border-white/20 rounded-[2px] overflow-hidden flex flex-col justify-between p-5 sm:p-6 text-[#F2F2F3] relative select-none">
                        {/* Spine highlight */}
                        <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-gradient-to-r from-white/20 to-black/80 border-r border-black/80 pointer-events-none" />

                        <div className="flex justify-between items-center text-[10px] font-mono tracking-wider pl-1">
                          <span className="border border-white/30 px-1.5 py-0.5">VOL. {String(featuredIndex + 1).padStart(2, '0')}</span>
                          <span>SYNCTONE</span>
                        </div>

                        <div className="flex flex-col items-center text-center my-auto px-2">
                          <div className="w-14 h-14 border border-white/30 flex items-center justify-center mb-3 relative">
                            <div className="w-10 h-10 border border-white/20 transform rotate-45 absolute" />
                            <span className="text-[10px] font-mono text-[#A9A9AF]">▲</span>
                          </div>
                          <h2 className="font-sans font-black text-base sm:text-lg uppercase leading-tight line-clamp-2">
                            {featuredNovel.title}
                          </h2>
                          <span className="text-[10px] font-mono tracking-widest text-[#A9A9AF] mt-2 uppercase">
                            {featuredNovel.author_username || 'AUTHOR'}
                          </span>
                        </div>

                        <div className="flex justify-between text-[9px] font-mono text-[#898992] border-t border-white/15 pt-2 pl-1">
                          <span>SYNCTONE AUDIO</span>
                          <span>STUDIO CAST</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Editorial Sans Blurb & CTA Scrim Box */}
                  <div className="flex flex-col gap-4">
                    <p className="font-sans text-sm sm:text-base leading-relaxed text-[var(--text-main)]">
                      {featuredNovel.synopsis ||
                        'SyncTone re-engineers classic literature into neural multi-speaker drama. Every sentence is dynamically assigned to character voices, scored with generative ambient soundscapes, and synchronized to the reading canvas in real time.'}
                    </p>

                    {/* Scrim box for high WCAG AA contrast compliance */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] p-5 flex flex-col gap-3.5 rounded-[1px] shadow-xl backdrop-blur-md">
                      <div className="flex flex-col gap-2.5">
                        <button
                          onClick={(e) => handleStartListening(featuredNovel, e)}
                          className="boxed-btn-primary py-3 px-5 text-xs font-mono uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>LISTEN NOW</span>
                        </button>
                        <button
                          onClick={() => onSelectNovel(featuredNovel.id)}
                          className="boxed-btn py-2.5 px-4 text-xs font-mono uppercase flex items-center justify-center gap-2 text-[var(--text-main)] hover:border-[var(--text-main)] cursor-pointer active:scale-95 transition-all bg-[var(--bg-surface)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>PLAY SAMPLE & READ</span>
                        </button>
                      </div>

                      <div className="text-[10px] font-mono text-[var(--text-muted)] flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
                        <span>STATUS: {featuredNovel.status?.toUpperCase() || 'READY'}</span>
                        <span>{featuredNovel.chapter_count || 1} CHAPTERS</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Minimal Numbered Counters & Arrows */}
                {novels.length > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] font-mono text-xs">
                    <div className="flex items-center gap-3">
                      {novels.slice(0, 5).map((novelItem, idx) => {
                        const isActive = idx === (featuredIndex % Math.min(novels.length, 5));
                        const numStr = String(idx + 1).padStart(2, '0');
                        return (
                          <button
                            key={novelItem.id || idx}
                            type="button"
                            onClick={() => setFeaturedIndex(idx)}
                            aria-label={`Jump to slide ${idx + 1}: ${novelItem.title}`}
                            className={`flex items-center gap-2 cursor-pointer transition-colors ${
                              isActive
                                ? 'text-[var(--text-main)] font-bold'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                          >
                            <span>{numStr}</span>
                            {isActive && <span className="w-8 h-[1px] bg-[var(--text-main)] inline-block" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFeaturedIndex((prev) => (prev - 1 + novels.length) % novels.length)}
                        aria-label="Previous featured novel"
                        className="boxed-btn p-1.5 text-[var(--text-sub)] hover:text-[var(--text-main)] active:scale-95 cursor-pointer"
                      >
                        <IconChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeaturedIndex((prev) => (prev + 1) % novels.length)}
                        aria-label="Next featured novel"
                        className="boxed-btn p-1.5 text-[var(--text-sub)] hover:text-[var(--text-main)] active:scale-95 cursor-pointer"
                      >
                        <IconChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ================================================================= */}
          {/* 3. SECTION 1: TOP 10 NUMBERED CAROUSEL (<ol> List with Controls)  */}
          {/* ================================================================= */}
          {top10Novels.length > 0 && !searchQuery.trim() && (
            <section className="space-y-4 pt-2" aria-label="Top 10 Audiobooks">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                    // CURATED VOLUMES
                  </span>
                  <h3 className="text-base sm:text-lg font-bold font-sans uppercase tracking-tight text-[var(--text-main)]">
                    Top 10 Today in Audiobooks
                  </h3>
                </div>

                {/* Horizontal Scroll Arrows (Desktop) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollCarousel(-1)}
                    aria-label="Scroll carousel left"
                    className="boxed-btn p-1.5 text-[var(--text-sub)] hover:text-[var(--text-main)] active:scale-95 cursor-pointer"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollCarousel(1)}
                    aria-label="Scroll carousel right"
                    className="boxed-btn p-1.5 text-[var(--text-sub)] hover:text-[var(--text-main)] active:scale-95 cursor-pointer"
                  >
                    <IconChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scroll Carousel */}
              <ol
                ref={carouselRef}
                tabIndex={0}
                aria-label="Top 10 audiobooks"
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 list-none scrollbar-none snap-x focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]"
              >
                {top10Novels.map((novel, index) => {
                  const rank = index + 1;
                  return (
                    <li
                      key={novel.id}
                      onClick={() => onSelectNovel(novel.id)}
                      onMouseEnter={preloadNovelDetails}
                      onFocus={preloadNovelDetails}
                      onPointerDown={preloadNovelDetails}
                      className="top10-card flex-shrink-0 flex items-center cursor-pointer group snap-start relative pl-12 sm:pl-16"
                    >
                      {/* Decorative Outline Rank Number */}
                      <span
                        aria-hidden="true"
                        className="top10-num absolute left-0 bottom-4 text-7xl sm:text-8xl z-0 select-none pointer-events-none font-mono"
                      >
                        {rank}
                      </span>

                      {/* Card Body */}
                      <div className="relative z-10 w-44 sm:w-56 rounded-[1px] overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all flex flex-col">
                        <div className="w-full aspect-[3/4] relative overflow-hidden bg-[var(--bg-surface)]">
                          <NovelCover
                            title={novel.title}
                            author={novel.author_username}
                            coverUrl={novel.cover_object}
                            id={novel.id}
                            index={rank - 1}
                            hideEyebrow={true}
                            className="w-full h-full"
                          />
                          <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded-[1px] text-[10px] font-mono font-bold bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-main)]">
                              #{rank} TOP 10
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] space-y-1">
                          <h4
                            className="font-bold text-xs sm:text-sm font-sans uppercase tracking-tight text-[var(--text-main)] truncate"
                            title={novel.title}
                          >
                            <span className="sr-only">Rank #{rank}: </span>
                            {novel.title}
                          </h4>
                          <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                            By {novel.author_username || 'SyncTone Author'}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* ================================================================= */}
          {/* 4. SECTION 2: VERIFIED & COMMUNITY VOLUMES GRID                   */}
          {/* ================================================================= */}
          <section className="space-y-6 pt-4" aria-label="Novel Catalog Grid">
            <div className="border-b border-[var(--border-subtle)] pb-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      // ARCHIVE CATALOG —
                    </span>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-main)]">
                      Novel Library
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-bold font-sans uppercase tracking-tight text-[var(--text-main)]">
                    {channel === 'verified'
                      ? 'Verified Repertory'
                      : channel === 'community'
                      ? 'Community Volumes'
                      : 'Literary Volumes in Repertory'}
                  </h3>
                </div>

                {/* Channel Filter Tabs (Accessible & Keyboard Navigable) */}
                <div
                  className="inline-flex p-0.5 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] gap-1 flex-wrap self-start md:self-auto"
                  role="tablist"
                  aria-label="Channel selection"
                >
                  <button
                    ref={(el) => (tabRefs.current[0] = el)}
                    role="tab"
                    aria-selected={channel === 'verified'}
                    tabIndex={channel === 'verified' ? 0 : -1}
                    onClick={() => setChannel('verified')}
                    onKeyDown={(e) => handleTabKeyDown(e, 0)}
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-[1px] transition-all cursor-pointer ${
                      channel === 'verified'
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold'
                        : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    + Verified Originals
                  </button>
                  <button
                    ref={(el) => (tabRefs.current[1] = el)}
                    role="tab"
                    aria-selected={channel === 'community'}
                    tabIndex={channel === 'community' ? 0 : -1}
                    onClick={() => setChannel('community')}
                    onKeyDown={(e) => handleTabKeyDown(e, 1)}
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-[1px] transition-all cursor-pointer ${
                      channel === 'community'
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold'
                        : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    + Community Novels
                  </button>
                  <button
                    ref={(el) => (tabRefs.current[2] = el)}
                    role="tab"
                    aria-selected={channel === 'all'}
                    tabIndex={channel === 'all' ? 0 : -1}
                    onClick={() => setChannel('all')}
                    onKeyDown={(e) => handleTabKeyDown(e, 2)}
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-[1px] transition-all cursor-pointer ${
                      channel === 'all'
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold'
                        : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    + All Novels
                  </button>
                </div>
              </div>

              {/* Instant Search Bar & Genre Filter Chips */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Monospace Genre Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-shrink-0">
                  {availableGenres.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className={`px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase rounded-[1px] border cursor-pointer transition ${
                        selectedGenre === g
                          ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] font-bold'
                          : 'border-[var(--border-subtle)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      [ {g === 'ALL' ? 'ALL VOLUMES' : g} ]
                    </button>
                  ))}
                </div>

                {/* Search Box & Controls */}
                <div className="flex items-center gap-2 flex-1 max-w-md sm:ml-auto">
                  <div className="relative w-full">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <IconSearch className="w-3.5 h-3.5" />
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by title, author, or narrator... (/ to focus)"
                      className="w-full pl-8 pr-8 py-1.5 text-xs font-mono bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[1px] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-main)] transition"
                      aria-label="Search novels"
                    />
                    <span className="hidden sm:flex absolute inset-y-0 right-2 items-center pointer-events-none text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-[1px] px-1 py-0.5 my-auto">
                      /
                    </span>
                  </div>

                  {isWriterOrAdmin && onOpenAddNovel && (
                    <button
                      onClick={onOpenAddNovel}
                      className="boxed-btn px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] text-[11px] font-mono uppercase font-semibold rounded-[1px] border border-[var(--border-strong)] hover:border-[var(--text-main)] transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    >
                      <IconPlus className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Add</span>
                    </button>
                  )}

                  <span className="text-xs text-[var(--text-sub)] font-mono flex-shrink-0 pl-1">
                    {filteredNovels.length} {filteredNovels.length === 1 ? 'VOL' : 'VOLS'}
                  </span>
                </div>
              </div>
            </div>

            {/* Empty Search Results State */}
            {filteredNovels.length === 0 && searchQuery && (
              <div className="p-12 text-center rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                <IconSearch className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-60" />
                <h4 className="text-base font-bold font-sans uppercase text-[var(--text-main)]">No novels found</h4>
                <p className="text-xs text-[var(--text-muted)] font-mono max-w-sm mx-auto">
                  No novels match &ldquo;{searchQuery}&rdquo;. Try adjusting your search query.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="boxed-btn px-4 py-2 text-xs font-mono uppercase"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Responsive Volume Cards Grid */}
            {filteredNovels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredNovels.map((novel, index) => (
                  <article
                    key={novel.id}
                    onClick={() => onSelectNovel(novel.id)}
                    onMouseEnter={preloadNovelDetails}
                    onFocus={preloadNovelDetails}
                    onPointerDown={preloadNovelDetails}
                    className="volume-card group cursor-pointer p-4 flex flex-col justify-between rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all"
                    aria-label={novel.title}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget && e.target.closest('button, a, input, select')) {
                        return;
                      }
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectNovel(novel.id);
                      }
                    }}
                  >
                    <div className="flex flex-col min-w-0">
                      {/* Physical Book Cover Wrapper */}
                      <div className="relative aspect-[3/4] w-full rounded-[1px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0">
                        <NovelCover
                          title={novel.title}
                          author={novel.author_username}
                          coverUrl={novel.cover_object}
                          id={novel.id}
                          index={index}
                          className="w-full h-full"
                        />
                        <div className="absolute top-2 left-2 z-20">
                          <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-sub)]">
                            VOL. {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Volume Metadata */}
                      <div className="mt-3.5 flex-1 flex flex-col justify-between min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[1px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-sub)]">
                              + {novel.global_tone || (novel.channel === 'verified' ? 'VERIFIED' : 'COMMUNITY')}
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[1px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-sub)]">
                              + {novel.chapter_count || 1} CH
                            </span>
                          </div>

                          <h4
                            className="font-sans text-sm sm:text-base font-bold uppercase tracking-tight text-[var(--text-main)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors"
                            title={novel.title}
                          >
                            {novel.title}
                          </h4>

                          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] mt-1 gap-2">
                            <span className="truncate">
                              By {novel.author_username || 'SyncTone Author'}
                            </span>
                            {novel.narrator_name && (
                              <span className="text-[10px] truncate max-w-[100px]" title={`Narrator: ${novel.narrator_name}`}>
                                {novel.narrator_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleStartListening(novel, e)}
                        onMouseEnter={preloadReaderView}
                        onFocus={preloadReaderView}
                        onPointerDown={preloadReaderView}
                        className="boxed-btn-primary flex-1 py-1.5 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <IconPlay className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNovel(novel.id);
                        }}
                        onMouseEnter={preloadNovelDetails}
                        onFocus={preloadNovelDetails}
                        onPointerDown={preloadNovelDetails}
                        className="boxed-btn p-1.5 text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer active:scale-95 min-w-[32px] flex items-center justify-center"
                        title="View Novel Details"
                        aria-label="View Novel Details"
                      >
                        <IconBook className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNovelToDelete(novel);
                        }}
                        className="boxed-btn p-1.5 text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer active:scale-95 min-w-[32px] flex items-center justify-center"
                        title="Delete Novel (Local Dev)"
                        aria-label={`Delete ${novel.title}`}
                        data-testid={`delete-novel-${novel.id}`}
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}

                {/* Upload Placeholder Card */}
                {onOpenAddNovel && (
                  <div
                    onClick={onOpenAddNovel}
                    className="group cursor-pointer border border-dashed border-[var(--border-strong)] hover:border-[var(--text-main)] flex flex-col items-center justify-center p-8 text-center transition bg-[var(--bg-card)]/40 hover:bg-[var(--bg-card)] h-full min-h-[420px] rounded-[1px]"
                    tabIndex={0}
                    role="button"
                    aria-label="Upload Novel"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenAddNovel();
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                      <IconPlus className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-mono uppercase font-bold text-[var(--text-main)]">
                      Upload Novel
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                      Multi-Voice Audio Synthesis
                    </span>
                    <span className="boxed-btn mt-4 px-3 py-1 text-[11px] font-mono uppercase text-[var(--text-main)]">
                      + Add New Volume
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 5. DEDICATED SECTION: PUBLISH & UPLOAD NOVEL                       */}
          {/* ================================================================= */}
          <section
            className="relative w-full rounded-[1px] overflow-hidden p-6 sm:p-10 border border-[var(--border-subtle)] bg-[var(--bg-card)]"
            aria-label="Upload Novel Section"
          >
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Left Column: Benefit Copy & Feature Badges */}
              <div className="space-y-4 max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[10px] font-mono tracking-wider uppercase text-[var(--text-sub)]">
                  <IconSparkles className="w-3.5 h-3.5 text-[var(--text-main)]" />
                  <span>Author Studio & Publishing</span>
                </div>

                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-sans uppercase tracking-tight text-[var(--text-main)]">
                  Publish Your Novel & Cast Your Characters
                </h3>

                <p className="text-xs sm:text-sm font-sans text-[var(--text-sub)] leading-relaxed max-w-xl">
                  Transform your written manuscript into an immersive multi-voice audio performance.
                  SyncTone pairs your characters with distinctive voices and delivers synchronized
                  read-along narration.
                </p>

                {/* Feature Badges Row */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 text-xs font-mono">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-sub)]">
                    <IconMic className="w-3.5 h-3.5 text-[var(--text-main)]" />
                    <span>Multi-Voice Casting</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-sub)]">
                    <IconSoundwave className="w-3.5 h-3.5 text-[var(--text-main)]" />
                    <span>Synchronized Audio</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-sub)]">
                    <IconBook className="w-3.5 h-3.5 text-[var(--text-main)]" />
                    <span>Follow-Along Prose</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-3">
                  <button
                    onClick={onOpenAddNovel}
                    className="boxed-btn-primary px-5 py-2.5 text-xs font-mono uppercase flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                  >
                    <IconPlus className="w-4 h-4" />
                    <span>Upload Novel</span>
                  </button>
                  <button
                    onClick={() => {
                      setChannel('community');
                      window.scrollTo({ top: 600, behavior: 'smooth' });
                    }}
                    className="boxed-btn px-5 py-2.5 text-xs font-mono uppercase text-[var(--text-main)] hover:border-[var(--text-main)] cursor-pointer active:scale-95 transition-colors"
                  >
                    Explore Community Stories
                  </button>
                </div>
              </div>

              {/* Right Column: Monochrome Geometric Showcase Frame */}
              <div className="w-full max-w-xs flex-shrink-0 flex justify-center">
                <div className="w-48 h-56 rounded-[1px] bg-[var(--bg-surface)] p-6 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group border border-[var(--border-strong)]">
                  <div className="w-12 h-12 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-main)] relative z-10">
                    <IconMic className="w-5 h-5 text-[var(--text-main)]" />
                  </div>
                  <div className="relative z-10 space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-sub)]">Studio Ready</span>
                    <p className="text-xs font-sans font-bold uppercase tracking-tight text-[var(--text-main)]">Voice Studio</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Delete Novel Confirmation Modal (Local Dev) */}
      {novelToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => !isDeletingNovel && setNovelToDelete(null)}
          data-testid="confirm-delete-novel-modal"
        >
          <div
            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[1px] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] flex-shrink-0">
                <IconTrash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-sans uppercase text-[var(--text-main)]">Delete Novel (Local Dev)</h3>
                <p className="text-xs font-mono text-[var(--text-muted)]">Permanently remove this volume</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm font-sans text-[var(--text-sub)] leading-relaxed">
              Are you sure you want to delete <strong className="text-[var(--text-main)]">&ldquo;{novelToDelete.title}&rdquo;</strong>?
              All chapters, character voices, and audio references will be permanently removed from your local database.
            </p>

            {deleteNovelError && (
              <div className="p-2.5 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-main)] text-xs font-mono">
                {deleteNovelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNovelToDelete(null)}
                disabled={isDeletingNovel}
                className="boxed-btn px-4 py-2 text-xs font-mono uppercase text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
                data-testid="cancel-delete-novel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingNovel}
                className="boxed-btn-primary px-4 py-2 text-xs font-mono uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                data-testid="confirm-delete-novel-btn"
              >
                {isDeletingNovel ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <IconTrash className="w-3.5 h-3.5" />
                    <span>Delete Volume</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
