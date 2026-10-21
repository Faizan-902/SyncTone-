import React, { useState, useEffect, useMemo } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  IconSearch,
  IconX,
  IconPlus,
  IconBook,
  IconMic,
  IconPlay,
  IconSparkles,
  IconArrowRight,
} from './icons';
import NovelCover from './NovelCover';

export default function NovelCatalog({ onSelectNovel, onOpenAddNovel }) {
  const { isWriterOrAdmin } = useAuth();
  const [novels, setNovels] = useState([]);
  const [channel, setChannel] = useState('verified'); // 'verified' | 'community' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNovels = async (activeChannel) => {
    setIsLoading(true);
    setError(null);
    try {
      const channelParam = activeChannel === 'all' ? null : activeChannel;
      const data = await api.novels.list(channelParam);
      setNovels(data.novels || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to load novel catalog';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels(channel);
  }, [channel]);

  // Filter novels dynamically by search query
  const filteredNovels = useMemo(() => {
    if (!searchQuery.trim()) return novels;
    const q = searchQuery.toLowerCase().trim();
    return novels.filter((n) => {
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const synopsisMatch = (n.synopsis || '').toLowerCase().includes(q);
      const authorMatch = (n.author_username || '').toLowerCase().includes(q);
      const narratorMatch = (n.narrator_name || '').toLowerCase().includes(q);
      return titleMatch || synopsisMatch || authorMatch || narratorMatch;
    });
  }, [novels, searchQuery]);

  // Spotlight Novel: show when not searching and catalog is rich (4+ titles)
  const isRichCatalog = !searchQuery && novels.length >= 4;
  const featuredNovel = isRichCatalog ? filteredNovels[0] : null;

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <IconSparkles className="w-3.5 h-3.5" />
            <span>Neural Multi-Voice Literature</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] font-display tracking-tight">
            Novel Library
          </h1>
          <p className="text-sm text-[var(--text-sub)] max-w-2xl font-serif leading-relaxed">
            Immerse yourself in literature where every character speaks in their own distinctive neural voice,
            synchronized in real time with high-fidelity audio narration.
          </p>
        </div>

        {/* Action Controls for Writers */}
        {isWriterOrAdmin && onOpenAddNovel && (
          <button
            onClick={onOpenAddNovel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex-shrink-0"
          >
            <IconPlus className="w-4 h-4" />
            <span>Publish Novel</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Channel Selector */}
        <div className="inline-flex p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
          <button
            onClick={() => setChannel('verified')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              channel === 'verified'
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Verified Originals
          </button>
          <button
            onClick={() => setChannel('community')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              channel === 'community'
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Community Novels
          </button>
          <button
            onClick={() => setChannel('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              channel === 'all'
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            All Channels
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or narrator..."
            className="w-full pl-10 pr-9 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-[var(--text-muted)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1"
              aria-label="Clear Search"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchNovels(channel)}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-5 space-y-4 animate-pulse"
            >
              <div className="h-56 bg-[var(--bg-surface)] rounded-xl" />
              <div className="h-5 bg-[var(--bg-surface)] rounded w-3/4" />
              <div className="h-3 bg-[var(--bg-surface)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredNovels.length === 0 ? (
        /* Empty State */
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
            <IconBook className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)] font-display">No novels found</h3>
          <p className="text-xs text-[var(--text-sub)] max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No novels matched "${searchQuery}". Try searching for another keyword or author.`
              : 'No novels available in this catalog view.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-semibold rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition"
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Featured Spotlight Showcase */}
          {featuredNovel && (
            <div
              onClick={() => onSelectNovel(featuredNovel.id)}
              className="group relative rounded-3xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer shadow-xl hover:border-indigo-500/40 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row">
                {/* Visual Cover Poster */}
                <div className="md:w-80 h-72 md:h-auto relative bg-[var(--bg-surface)] flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <NovelCover
                    title={featuredNovel.title}
                    author={featuredNovel.author_username}
                    coverUrl={featuredNovel.cover_object}
                    className="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden pointer-events-none" />
                </div>

                {/* Editorial Content */}
                <div className="p-6 sm:p-8 md:p-10 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Featured Production
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">•</span>
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        By {featuredNovel.author_username || 'Author'}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] font-display tracking-tight group-hover:text-indigo-400 transition-colors">
                      {featuredNovel.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-[var(--text-sub)] line-clamp-3 font-serif leading-relaxed max-w-2xl">
                      {featuredNovel.synopsis || 'Experience fully synthesized dialogue and narrative prose.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs border border-[var(--border-subtle)]">
                        <IconMic className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{featuredNovel.narrator_name || 'Neural Narrator'}</span>
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {featuredNovel.chapter_count || 0} chapters
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                      <span>Begin Experience</span>
                      <IconArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book Catalog Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredNovels.map((novel) => {
              const isVerified = novel.channel === 'verified';
              const narratorDisplay =
                novel.narrator_name ||
                novel.narrator_voice_label ||
                'Neural Cast Narrator';

              return (
                <div
                  key={novel.id}
                  onClick={() => onSelectNovel(novel.id)}
                  className="book-card bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] hover:border-indigo-500/40 flex flex-col overflow-hidden cursor-pointer group"
                >
                  {/* Book Cover (2:3 Aspect ratio header) */}
                  <div className="relative h-56 bg-[var(--bg-surface)] flex items-center justify-center overflow-hidden">
                    <NovelCover
                      title={novel.title}
                      author={novel.author_username}
                      coverUrl={novel.cover_object}
                      className="w-full h-full"
                    />

                    {/* Gradient Overlay for bottom title legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-black/30" />

                    {/* Channel & Chapter Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md uppercase tracking-wider backdrop-blur-md ${
                          isVerified
                            ? 'bg-indigo-600/90 text-white'
                            : 'bg-[var(--bg-surface)]/90 text-[var(--text-muted)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        {isVerified ? 'Original' : 'Community'}
                      </span>

                      <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium rounded-md">
                        {novel.chapter_count || 0} ch
                      </span>
                    </div>

                    {/* Title overlay at bottom of cover */}
                    <div className="absolute bottom-3 left-4 right-4 z-10">
                      <h3 className="text-base font-bold text-[var(--text-main)] tracking-tight line-clamp-1 font-display">
                        {novel.title}
                      </h3>
                    </div>
                  </div>

                  {/* Novel Information */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>By {novel.author_username || 'Author'}</span>
                        {novel.status && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            {novel.status}
                          </span>
                        )}
                      </div>

                      {/* Narrator Voice Badge */}
                      <div className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-lg w-full">
                        <IconMic className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="truncate font-mono text-[11px]">{narratorDisplay}</span>
                      </div>

                      {/* Synopsis */}
                      <p className="text-xs text-[var(--text-sub)] line-clamp-2 font-serif leading-relaxed">
                        {novel.synopsis || 'No synopsis available.'}
                      </p>
                    </div>

                    {/* Card Action Link */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-400 group-hover:underline">
                        Explore Chapters & Cast
                      </span>
                      <IconArrowRight className="w-3.5 h-3.5 text-indigo-400 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
