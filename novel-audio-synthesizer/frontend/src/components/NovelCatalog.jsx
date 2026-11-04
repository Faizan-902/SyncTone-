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

  // Filter novels by search query
  const filteredNovels = useMemo(() => {
    if (!debouncedSearch.trim()) return novels;
    const q = debouncedSearch.toLowerCase().trim();
    return novels.filter((n) => {
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const synopsisMatch = (n.synopsis || '').toLowerCase().includes(q);
      const authorMatch = (n.author_username || '').toLowerCase().includes(q);
      const narratorMatch = (n.narrator_name || '').toLowerCase().includes(q);
      return titleMatch || synopsisMatch || authorMatch || narratorMatch;
    });
  }, [novels, debouncedSearch]);

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
      {/* ================================================================= */}
      {/* 1. MASTER STICKY GLASS HEADER (Single Unified Header)             */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-30 -mx-4 sm:-mx-8 px-4 sm:px-8 lg:px-8 py-3.5 glass-header border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 min-h-[64px]">
        {/* Left: Heading & Instant Search */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="flex-shrink-0">
            <h1 className="text-lg font-bold tracking-tight theme-heading font-display">
              Novel Library
            </h1>
          </div>

          <div className="relative w-full">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none theme-muted">
              <IconSearch className="w-4 h-4" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or narrator... (/ to focus)"
              className="w-full pl-10 pr-10 py-2 text-xs theme-card border rounded-xl placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition shadow-inner"
              aria-label="Search novels"
            />
            <span className="hidden sm:flex absolute inset-y-0 right-3 items-center pointer-events-none text-[10px] font-mono theme-muted border theme-border rounded px-1.5 py-0.5 my-auto">
              /
            </span>
          </div>
        </div>

        {/* Right: Channel Filter Tabs & Quick Action Buttons */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0 flex-shrink-0">
          <div className="inline-flex p-1 rounded-xl theme-card border" role="tablist" aria-label="Channel selection">
            <button
              ref={(el) => (tabRefs.current[0] = el)}
              role="tab"
              aria-selected={channel === 'verified'}
              tabIndex={channel === 'verified' ? 0 : -1}
              onClick={() => setChannel('verified')}
              onKeyDown={(e) => handleTabKeyDown(e, 0)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                channel === 'verified'
                  ? 'bg-[var(--brand-sage,#87A96B)] text-[#1A120E] font-bold shadow-sm'
                  : 'theme-muted hover:text-[var(--text-main)]'
              }`}
            >
              Verified Originals
            </button>
            <button
              ref={(el) => (tabRefs.current[1] = el)}
              role="tab"
              aria-selected={channel === 'community'}
              tabIndex={channel === 'community' ? 0 : -1}
              onClick={() => setChannel('community')}
              onKeyDown={(e) => handleTabKeyDown(e, 1)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                channel === 'community'
                  ? 'bg-[var(--brand-amber,#D5851F)] text-[#1A120E] font-bold shadow-sm'
                  : 'theme-muted hover:text-[var(--text-main)]'
              }`}
            >
              Community Novels
            </button>
            <button
              ref={(el) => (tabRefs.current[2] = el)}
              role="tab"
              aria-selected={channel === 'all'}
              tabIndex={channel === 'all' ? 0 : -1}
              onClick={() => setChannel('all')}
              onKeyDown={(e) => handleTabKeyDown(e, 2)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                channel === 'all'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold shadow-sm'
                  : 'theme-muted hover:text-[var(--text-main)]'
              }`}
            >
              All Novels
            </button>
          </div>

          {/* Add Novel Button for Writers/Admins */}
          {isWriterOrAdmin && onOpenAddNovel && (
            <button
              onClick={onOpenAddNovel}
              className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 flex-shrink-0"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Novel</span>
            </button>
          )}

          {/* Auth Button */}
          {onOpenAuth && (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  onOpenAuth('login');
                }
              }}
              className="px-3 py-1.5 theme-card border hover:border-[var(--border-focus)] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 flex-shrink-0"
            >
              <IconUser className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              <span>{isAuthenticated ? user.username : 'Sign In'}</span>
            </button>
          )}
        </div>
      </header>

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
          {/* 2. CINEMATIC HERO BILLBOARD (Full-Bleed Marquee Banner)           */}
          {/* ================================================================= */}
          {featuredNovel && !searchQuery.trim() && (
            <section
              className="relative w-full rounded-3xl overflow-hidden p-6 sm:p-12 md:p-16 border theme-border shadow-2xl flex flex-col md:flex-row items-center md:items-end justify-between gap-8 min-h-[480px] sm:min-h-[520px] transition-all duration-300 architectural-portal"
              style={{
                background:
                  'radial-gradient(circle at 80% 20%, #2E1D13 0%, #1A120E 60%, #0D0A08 100%)',
              }}
              aria-label="Featured Novel Billboard"
              onMouseEnter={() => setIsBillboardPaused(true)}
              onMouseLeave={() => setIsBillboardPaused(false)}
              onFocus={() => setIsBillboardPaused(true)}
              onBlur={() => setIsBillboardPaused(false)}
            >
              {/* Radial Atmospheric Spotlight Glow (Champagne Gold & Warm Bronze) */}
              <div
                className="absolute inset-0 pointer-events-none opacity-60"
                style={{
                  backgroundImage:
                    'radial-gradient(ellipse at 78% 38%, rgba(223, 186, 83, 0.30) 0%, rgba(168, 132, 98, 0.16) 45%, transparent 70%)',
                }}
              />
              {/* Arched Architectural Portal Silhouette */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 max-w-lg pointer-events-none opacity-30 hidden md:block">
                <div className="w-full h-full rounded-tl-[160px] border-l border-t border-[var(--brand-champagne,#DFBA53)]/30 bg-gradient-to-b from-[rgba(223,186,83,0.10)] to-transparent" />
              </div>
              {/* Fluted Architectural Timber Edge Accent */}
              <div className="absolute right-0 top-0 bottom-0 w-2.5 fluted-timber opacity-30 pointer-events-none hidden sm:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)] via-[var(--bg-page)]/75 to-transparent pointer-events-none" />

              {/* Left Column: Atmospheric Typography & High-Impact CTA */}
              <div className="relative z-10 max-w-2xl space-y-4">
                {/* Tracked Category Overline: NATURE / FICTION / CINEMATIC AUDIO */}
                <div className="tracking-[0.25em] text-[10px] uppercase font-mono font-bold text-[var(--brand-bronze,#A88462)] flex items-center gap-2 mb-1 stagger-1">
                  <span>NATURE</span>
                  <span className="opacity-40">/</span>
                  <span>FICTION</span>
                  <span className="opacity-40">/</span>
                  <span>CINEMATIC AUDIO</span>
                </div>

                {/* Eyebrow Badges Row with Channel Indicator & Quick Switcher */}
                <div className="flex flex-wrap items-center gap-2.5 stagger-1">
                  <span className="px-3 py-1 rounded-full text-[var(--brand-sage,#87A96B)] bg-[var(--brand-sage,#87A96B)]/15 border border-[var(--brand-sage,#87A96B)]/40 text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <IconStar className="w-3.5 h-3.5 text-[var(--brand-champagne,#DFBA53)]" />
                    <span>Top Pick</span>
                  </span>
                  {/* Channel Badge with Quick Channel Switcher */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (featuredNovel.channel && channel !== featuredNovel.channel) {
                        setChannel(featuredNovel.channel);
                      }
                    }}
                    className="px-3 py-1 rounded-full theme-card theme-sub border text-[11px] font-mono font-semibold cursor-pointer hover:border-[var(--accent)] transition"
                    title="Click to filter by this channel"
                  >
                    {featuredNovel.channel === 'community' ? 'Community Channel' : 'Verified Channel'}
                  </span>
                  <span className="px-3 py-1 rounded-full theme-card theme-sub border text-[11px] font-mono font-semibold">
                    {featuredNovel.global_tone || 'Dramatic Ensemble'}
                  </span>
                  <span className="text-xs text-[var(--brand-sage,#87A96B)] font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--brand-sage,#87A96B)] animate-pulse" />
                    <span>Auto-Rotating</span>
                  </span>
                  {isBillboardPaused && (
                    <span className="text-[10px] font-mono theme-muted uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--bg-hover)] border border-[var(--border-subtle)]">
                      Paused
                    </span>
                  )}
                </div>

                {/* Headline: Display serif with italic flourish + Novel Title */}
                <div className="space-y-1 stagger-2">
                  <div className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold tracking-tight text-[var(--brand-sand,#D5C4AE)] leading-[1.08] drop-shadow-xl">
                    Stories that feel <span className="italic font-serif font-normal text-[var(--accent)]">alive.</span>
                  </div>
                  <h2
                    onClick={() => onSelectNovel(featuredNovel.id)}
                    className="text-lg sm:text-2xl md:text-3xl font-serif font-semibold tracking-tight text-[var(--brand-sand,#D5C4AE)]/90 hover:text-[var(--accent-text)] cursor-pointer transition-colors pt-1"
                  >
                    <span className="sr-only">Featured Spotlight: </span>
                    {featuredNovel.title}
                  </h2>
                </div>

                {/* Evocative Literary Synopsis */}
                <p className="text-xs sm:text-sm md:text-base text-[var(--text-main)]/90 font-serif line-clamp-3 leading-relaxed max-w-xl drop-shadow-sm stagger-3">
                  {featuredNovel.synopsis ||
                    'Curated stories inspired by nature, designed for a calmer, more intentional way of listening.'}
                </p>

                {/* Voice Visualizer Widget */}
                <div className="flex items-center gap-3 py-1 stagger-4">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full theme-card border border-white/10 text-[10px] font-mono theme-muted">
                    <IconSoundwave className="w-3.5 h-3.5 text-[var(--accent-text)] mr-1" />
                    <span className="text-[var(--text-main)] font-semibold">
                      {featuredNovel.narrator_name || 'Narrator'}
                    </span>
                    <span className="opacity-60">• Studio Audio</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-0.5 h-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                      <span
                        key={bar}
                        className="w-0.5 bg-[var(--accent)] rounded-full equalizer-bar"
                        style={{
                          height: `${Math.sin(bar) * 6 + 8}px`,
                          opacity: 0.7,
                          animationDelay: `${bar * 110}ms`,
                          animationDuration: `${0.65 + (bar % 3) * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Call to Action Buttons: Circular Action CTA */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2 stagger-5">
                  <button
                    onClick={(e) => handleStartListening(featuredNovel, e)}
                    onMouseEnter={preloadReaderView}
                    onFocus={preloadReaderView}
                    onPointerDown={preloadReaderView}
                    className="px-5 sm:px-6 py-3 sm:py-3.5 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] font-bold rounded-full border border-[var(--border-subtle)] shadow-xl flex items-center gap-3 text-xs sm:text-sm tracking-wider uppercase transition transform hover:-translate-y-0.5 active:scale-95 focus:outline-none cursor-pointer group"
                  >
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[var(--cta-primary-text)]/40 flex items-center justify-center group-hover:scale-105 group-hover:border-[var(--brand-amber)] transition-transform">
                      <IconPlay className="w-3.5 h-3.5 fill-current ml-0.5 text-[var(--brand-amber,#D5851F)]" />
                    </span>
                    <span className="tracking-[0.18em] font-mono text-xs font-bold">Start Listening (Ch. 1)</span>
                  </button>
                  <button
                    onClick={() => onSelectNovel(featuredNovel.id)}
                    onMouseEnter={preloadNovelDetails}
                    onFocus={preloadNovelDetails}
                    onPointerDown={preloadNovelDetails}
                    className="px-5 py-3.5 bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] font-semibold rounded-full text-xs sm:text-sm transition hover:border-[var(--border-focus)] focus:outline-none shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <IconBook className="w-4 h-4" />
                    <span>Novel Details</span>
                  </button>
                </div>
              </div>

              {/* Right Column: 3D Hardcover Physical Book Presentation */}
              <div
                onClick={() => onSelectNovel(featuredNovel.id)}
                onMouseEnter={preloadNovelDetails}
                onFocus={preloadNovelDetails}
                onPointerDown={preloadNovelDetails}
                className="relative z-10 w-48 sm:w-60 md:w-64 aspect-[3/4] flex-shrink-0 cursor-pointer group transform hover:scale-105 transition-all duration-300"
                style={{
                  filter: 'drop-shadow(0 25px 40px rgba(0, 0, 0, 0.85))',
                }}
                title={featuredNovel.title}
              >
                {/* 3D Cream Page Edges along the right spine */}
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] border-r-[6px] border-r-[var(--border-strong)] transform -rotate-2 group-hover:rotate-0 transition-transform duration-300">
                  <NovelCover
                    title={featuredNovel.title}
                    author={featuredNovel.author_username}
                    coverUrl={featuredNovel.cover_object}
                    className="w-full h-full"
                  />
                </div>
                {/* Floating Seal in Botanical Sage & Walnut */}
                <div className="absolute -bottom-3 -right-3 px-3 py-1 rounded-full bg-[var(--brand-walnut,#5A3E2B)] text-[var(--brand-sand,#D5C4AE)] font-mono font-bold text-[10px] shadow-lg border border-[var(--brand-sage,#87A96B)]/40 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-sage,#87A96B)]" />
                  <span>Botanical Edition</span>
                </div>
              </div>

              {/* Editorial Pagination Indicator: Minimalist hairline dash with numbered counters 01 —— 02 03 */}
              {novels.length > 1 && (
                <div className="absolute bottom-4 left-6 sm:left-12 right-6 sm:right-12 flex items-center justify-between z-20 pointer-events-auto">
                  {/* Numbered Counters with Hairline Dash */}
                  <div className="flex items-center gap-3 font-mono text-xs select-none">
                    {novels.map((novelItem, idx) => {
                      const isActive = idx === (featuredIndex % novels.length);
                      const numStr = String(idx + 1).padStart(2, '0');
                      return (
                        <button
                          key={novelItem.id || idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFeaturedIndex(idx);
                          }}
                          aria-label={`Jump to slide ${idx + 1}: ${novelItem.title}`}
                          className={`group flex items-center gap-2 cursor-pointer transition-colors duration-200 ${
                            isActive
                              ? 'text-[var(--brand-sand,#D5C4AE)] font-bold'
                              : 'text-[#4A4A46] hover:text-[var(--brand-bronze,#A88462)]'
                          }`}
                        >
                          <span>{numStr}</span>
                          {isActive && (
                            <span className="w-7 sm:w-10 h-[1.5px] bg-[var(--brand-amber,#D5851F)] inline-block shadow-[0_0_6px_rgba(213,133,31,0.5)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Previous / Next Arrows */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeaturedIndex((prev) => (prev - 1 + novels.length) % novels.length);
                      }}
                      aria-label="Previous featured novel"
                      className="p-1.5 rounded-full bg-[#3A2418]/80 hover:bg-[#6B4A2E] border border-[#A88462]/20 text-[#D5C4AE] hover:text-white transition backdrop-blur-sm cursor-pointer active:scale-95"
                    >
                      <IconChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeaturedIndex((prev) => (prev + 1) % novels.length);
                      }}
                      aria-label="Next featured novel"
                      className="p-1.5 rounded-full bg-[#3A2418]/80 hover:bg-[#6B4A2E] border border-[#A88462]/20 text-[#D5C4AE] hover:text-white transition backdrop-blur-sm cursor-pointer active:scale-95"
                    >
                      <IconChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ================================================================= */}
          {/* 3. SECTION 1: TOP 10 NUMBERED CAROUSEL (<ol> List with Controls)  */}
          {/* ================================================================= */}
          {top10Novels.length > 0 && !searchQuery.trim() && (
            <section className="space-y-4 pt-2" aria-label="Top 10 Audiobooks">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg sm:text-xl font-bold theme-heading font-serif flex items-center gap-2">
                    <IconSparkles className="w-5 h-5 text-[var(--accent-text)]" />
                    <span>Top 10 Today in Audiobooks</span>
                  </h3>
                  <span className="hidden sm:inline text-xs theme-muted font-mono">
                    Ranked by listener count
                  </span>
                </div>

                {/* Horizontal Scroll Arrows (Desktop) */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scrollCarousel(-1)}
                    aria-label="Scroll carousel left"
                    className="p-1.5 rounded-lg theme-card border hover:border-[var(--border-focus)] transition-all duration-100 ease-out active:scale-90 theme-muted hover:text-[var(--text-main)] shadow-xs cursor-pointer"
                  >
                    <IconChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => scrollCarousel(1)}
                    aria-label="Scroll carousel right"
                    className="p-1.5 rounded-lg theme-card border hover:border-[var(--border-focus)] transition-all duration-100 ease-out active:scale-90 theme-muted hover:text-[var(--text-main)] shadow-xs cursor-pointer"
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
                className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 list-none scrollbar-none snap-x focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
                        className="top10-num absolute left-0 bottom-6 text-8xl sm:text-9xl z-0 select-none pointer-events-none font-mono"
                      >
                        {rank}
                      </span>

                      {/* Card Body in Normal Document Flow */}
                      <div className="relative z-10 w-44 sm:w-56 rounded-2xl overflow-hidden theme-card border shadow-xl flex flex-col card-motion">
                        {/* 3:4 Cover Artwork without text overlay */}
                        <div className="w-full aspect-[3/4] relative overflow-hidden">
                          <NovelCover
                            title={novel.title}
                            author={novel.author_username}
                            coverUrl={novel.cover_object}
                            id={novel.id}
                            index={rank - 1}
                            hideEyebrow={true}
                            className="w-full h-full"
                          />
                          {/* Top 10 Badge featuring Amber Glow and Sage Green */}
                          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#1A120E]/85 backdrop-blur-xs text-[var(--brand-amber,#D5851F)] border border-[var(--brand-amber,#D5851F)]/40 shadow-xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-sage,#87A96B)]" />
                              #{rank} TOP 10
                            </span>
                          </div>
                        </div>

                        {/* Text Body in Normal Flow */}
                        <div className="p-3.5 bg-[var(--bg-card)] border-t theme-border space-y-1">
                          <h4
                            className="font-bold text-xs sm:text-sm theme-heading font-serif truncate"
                            title={novel.title}
                          >
                            <span className="sr-only">Rank #{rank}: </span>
                            {novel.title}
                          </h4>
                          <p className="text-[11px] theme-muted truncate">
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
          {/* 4. SECTION 2: VERIFIED NEURAL MASTERPIECES GRID (Hybrid Cards)   */}
          {/* ================================================================= */}
          <section className="space-y-4 pt-2" aria-label="Novel Catalog Grid">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold theme-heading font-serif">
                  {channel === 'verified'
                    ? 'Featured Masterpieces'
                    : channel === 'community'
                    ? 'Community Original Novels'
                    : 'All Audiobooks'}
                </h3>
                <p className="text-xs theme-muted mt-0.5">
                  Multi-voice audio synchronized with grounded character voices
                </p>
              </div>
              <span className="text-xs theme-muted font-mono">
                {filteredNovels.length} {filteredNovels.length === 1 ? 'novel' : 'novels'}
              </span>
            </div>

            {/* Empty Search Results State */}
            {filteredNovels.length === 0 && searchQuery && (
              <div className="p-12 text-center rounded-2xl theme-surface border space-y-3">
                <IconSearch className="w-8 h-8 mx-auto theme-muted opacity-60" />
                <h4 className="text-base font-bold theme-heading">No novels found</h4>
                <p className="text-xs theme-muted max-w-sm mx-auto">
                  No novels match &ldquo;{searchQuery}&rdquo;. Try adjusting your search or channel filter.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 theme-card border hover:border-[var(--border-focus)] rounded-xl text-xs font-semibold transition"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Responsive Hybrid Cards Grid */}
            {filteredNovels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7">
                {filteredNovels.map((novel, index) => (
                  <article
                    key={novel.id}
                    onClick={() => onSelectNovel(novel.id)}
                    onMouseEnter={preloadNovelDetails}
                    onFocus={preloadNovelDetails}
                    onPointerDown={preloadNovelDetails}
                    className="novel-card-hybrid group cursor-pointer p-4 sm:p-5 flex flex-col justify-between"
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
                      {/* Floating Physical Book Volume with Realistic Depth & Elevation */}
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.22)] group-hover:shadow-[0_18px_36px_-6px_rgba(0,0,0,0.32)] transition-all duration-300 transform group-hover:-translate-y-1 flex-shrink-0">
                        <NovelCover
                          title={novel.title}
                          author={novel.author_username}
                          coverUrl={novel.cover_object}
                          id={novel.id}
                          index={index}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Streamlined Card Body: Refined Editorial Typography & Proportions */}
                      <div className="mt-3.5 flex-1 flex flex-col justify-between min-w-0">
                        <div className="min-w-0">
                          {/* Genre / Channel Tag & Match Rating */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider truncate px-2 py-0.5 rounded-full border ${
                              novel.channel === 'verified'
                                ? 'text-[var(--brand-sage,#87A96B)] border-[var(--brand-sage,#87A96B)]/30 bg-[var(--brand-sage,#87A96B)]/10'
                                : 'text-[var(--brand-amber,#D5851F)] border-[var(--brand-amber,#D5851F)]/30 bg-[var(--brand-amber,#D5851F)]/10'
                            }`}>
                              {novel.global_tone ||
                                (novel.channel === 'verified' ? 'Verified Original' : 'Community')}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-[10px] sm:text-[11px] font-mono text-[var(--brand-sage,#87A96B)] font-semibold">98% Match</span>
                            </div>
                          </div>

                          {/* Title */}
                          <h4
                            className="font-serif text-base sm:text-lg font-bold theme-heading line-clamp-1 group-hover:text-[var(--accent-text)] transition-colors"
                            title={novel.title}
                          >
                            {novel.title}
                          </h4>

                          {/* Author credit line with integrated narrator pill */}
                          <div className="flex items-center justify-between text-xs theme-muted mt-1 gap-2">
                            <span className="truncate">
                              By {novel.author_username || 'SyncTone Author'}
                            </span>
                            {novel.narrator_name && (
                              <span className="text-[10px] font-mono theme-sub opacity-85 truncate flex items-center gap-1 flex-shrink-0" title={`Narrator: ${novel.narrator_name}`}>
                                <IconMic className="w-2.5 h-2.5 text-[var(--accent-text)]" />
                                <span className="truncate max-w-[110px]">{novel.narrator_name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tactile Action Row */}
                    <div className="pt-3 mt-3 border-t theme-border flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleStartListening(novel, e)}
                        onMouseEnter={preloadReaderView}
                        onFocus={preloadReaderView}
                        onPointerDown={preloadReaderView}
                        className="flex-1 py-1.5 px-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-xl shadow-xs transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
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
                        className="p-1.5 rounded-xl theme-surface hover:bg-[var(--bg-hover)] theme-sub border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all duration-150 active:scale-95 focus:outline-none cursor-pointer min-w-[34px] flex items-center justify-center"
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
                        className="p-1.5 rounded-xl theme-surface hover:bg-[var(--danger)]/10 theme-sub hover:text-[var(--danger)] border border-[var(--border-subtle)] hover:border-[var(--danger)]/30 transition-all duration-150 active:scale-95 focus:outline-none cursor-pointer min-w-[34px] flex items-center justify-center"
                        title="Delete Novel (Local Dev)"
                        aria-label={`Delete ${novel.title}`}
                        data-testid={`delete-novel-${novel.id}`}
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}

                {/* Upload Placeholder Card in Grid (Available to all users) */}
                {onOpenAddNovel && (
                  <div
                    onClick={onOpenAddNovel}
                    className="novel-card-hybrid group cursor-pointer border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent)] flex flex-col items-center justify-center p-8 text-center transition bg-[var(--bg-card)]/40 hover:bg-[var(--bg-card)] h-full min-h-[480px]"
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
                    <div className="w-14 h-14 rounded-2xl theme-surface border border-[var(--border-subtle)] group-hover:border-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center mb-4 shadow-sm transition-transform group-hover:scale-105">
                      <IconPlus className="w-7 h-7" />
                    </div>
                    <span className="text-base font-bold theme-heading group-hover:text-[var(--accent-text)] transition">
                      Upload Novel
                    </span>
                    <span className="text-xs theme-muted mt-1.5 font-mono">
                      Multi-Voice Audio
                    </span>
                    <span className="mt-4 px-3.5 py-1.5 rounded-lg theme-surface border border-[var(--border-subtle)] text-xs font-semibold text-[var(--accent-text)] group-hover:bg-[var(--accent)] group-hover:text-[var(--on-accent)] transition">
                      + Add New Novel
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
            className="relative w-full rounded-3xl overflow-hidden p-6 sm:p-10 md:p-12 border theme-border shadow-2xl theme-surface"
            aria-label="Upload Novel Section"
          >
            {/* Atmospheric Background Ambient Tint */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at 85% 20%, rgba(168, 132, 98, 0.20) 0%, transparent 60%), radial-gradient(ellipse at 15% 80%, rgba(107, 74, 46, 0.15) 0%, transparent 60%)',
              }}
            />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Left Column: Benefit Copy & Feature Badges */}
              <div className="space-y-4 max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full theme-card border border-[var(--border-subtle)] text-[11px] font-mono font-bold text-[var(--accent-text)] tracking-wider uppercase">
                  <IconSparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                  <span>Author Studio & Publishing</span>
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif theme-heading tracking-tight">
                  Publish Your Novel & Cast Your Characters
                </h3>

                <p className="text-xs sm:text-sm theme-sub font-serif leading-relaxed max-w-xl">
                  Transform your written manuscript into an immersive multi-voice audio performance.
                  SyncTone pairs your characters with distinctive voices and delivers synchronized
                  read-along narration.
                </p>

                {/* Feature Badges Row */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1 text-xs font-mono">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-card border theme-sub">
                    <IconMic className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    <span>Multi-Voice Casting</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-card border theme-sub">
                    <IconSoundwave className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span>Synchronized Audio</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-card border theme-sub">
                    <IconBook className="w-3.5 h-3.5 text-[var(--warning)]" />
                    <span>Follow-Along Prose</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-3">
                  <button
                    onClick={onOpenAddNovel}
                    className="px-6 py-3.5 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] font-bold rounded-xl shadow-lg flex items-center gap-2.5 text-xs sm:text-sm transition transform hover:-translate-y-0.5 active:scale-95 focus:outline-none cursor-pointer"
                  >
                    <IconPlus className="w-4 h-4" />
                    <span>Upload Novel</span>
                  </button>
                  <button
                    onClick={() => {
                      setChannel('community');
                      window.scrollTo({ top: 600, behavior: 'smooth' });
                    }}
                    className="px-5 py-3.5 theme-card border hover:border-[var(--border-focus)] font-semibold rounded-xl text-xs sm:text-sm theme-sub hover:text-[var(--text-main)] transition cursor-pointer"
                  >
                    Explore Community Stories
                  </button>
                </div>
              </div>

              {/* Right Column: Architectural Display Niche with Warm Amber Glow */}
              <div className="w-full max-w-xs flex-shrink-0 flex justify-center">
                <div className="w-48 h-56 display-niche bg-[#1A120E] p-6 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group border border-[var(--brand-amber,#D5851F)]/30 shadow-xl">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(213,133,31,0.22)_0%,transparent_70%)] pointer-events-none" />
                  <div className="w-12 h-12 rounded-full bg-[var(--cta-primary-bg)] border border-[var(--brand-amber,#D5851F)]/40 flex items-center justify-center text-[var(--brand-amber,#D5851F)] shadow-lg relative z-10">
                    <IconMic className="w-5 h-5 text-[var(--brand-amber,#D5851F)]" />
                  </div>
                  <div className="relative z-10 space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--brand-sage,#87A96B)]">Studio Ready</span>
                    <p className="text-xs font-serif theme-heading font-medium">Neural Voice Casting</p>
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
            className="w-full max-w-md theme-card border rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--danger)]/15 text-[var(--danger)] flex-shrink-0">
                <IconTrash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold theme-heading">Delete Novel (Local Dev)</h3>
                <p className="text-xs theme-muted">Permanently remove this novel</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm theme-sub leading-relaxed">
              Are you sure you want to delete <strong className="theme-heading">&ldquo;{novelToDelete.title}&rdquo;</strong>?
              All chapters, character voices, and audio references will be permanently removed from your local database.
            </p>

            {deleteNovelError && (
              <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-xs">
                {deleteNovelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNovelToDelete(null)}
                disabled={isDeletingNovel}
                className="px-4 py-2 theme-surface hover:bg-[var(--bg-hover)] border rounded-xl text-xs font-semibold theme-sub transition cursor-pointer"
                data-testid="cancel-delete-novel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingNovel}
                className="px-4 py-2 bg-[var(--danger)] hover:opacity-90 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                data-testid="confirm-delete-novel-btn"
              >
                {isDeletingNovel ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <IconTrash className="w-3.5 h-3.5" />
                    <span>Delete Novel</span>
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
