import React, { useState, useEffect, useMemo } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';

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

  // Show large Billboard & Top 10 only when not searching and catalog is rich (4+ titles)
  const isRichCatalog = !searchQuery && novels.length >= 4;
  const featuredNovel = isRichCatalog ? filteredNovels[0] : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Bar & Search / Filter Controls */}
      <div className="flex flex-col gap-6 bg-[var(--bg-card)] p-6 sm:p-8 rounded-3xl border border-[var(--border-subtle)] shadow-xl transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
                Immersive Audio Experience
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-xs text-[var(--text-muted)]">Dual-TTS 4NF Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] tracking-tight font-display flex items-center gap-3">
              <span>📚</span> Novel Library
            </h1>
            <p className="text-sm text-[var(--text-sub)] mt-1.5 max-w-2xl leading-relaxed">
              Explore multi-voice synthesized novels with synchronized 60fps audio reading,
              distinctive character voices, and lossless state resumption.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isWriterOrAdmin && onOpenAddNovel && (
              <button
                onClick={onOpenAddNovel}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-200 flex items-center gap-2 hover:scale-[1.02]"
              >
                <span>➕</span> Add Novel
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
          {/* Channel Filter Tabs */}
          <div className="inline-flex p-1 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-inner">
            <button
              onClick={() => setChannel('verified')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                channel === 'verified'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              ⭐ Verified Originals
            </button>
            <button
              onClick={() => setChannel('community')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                channel === 'community'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              🌐 Community Novels
            </button>
            <button
              onClick={() => setChannel('all')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                channel === 'all'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              All Channels
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or narrator..."
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none shadow-inner placeholder-[var(--text-muted)]"
            />
            <span className="absolute left-3.5 top-3 text-[var(--text-muted)] text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs p-1"
                aria-label="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchNovels(channel)}
            className="px-4 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 transition shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-5 space-y-4 animate-pulse shadow-sm"
            >
              <div className="h-48 bg-[var(--bg-surface)] rounded-xl" />
              <div className="h-5 bg-[var(--bg-surface)] rounded w-3/4" />
              <div className="h-4 bg-[var(--bg-surface)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredNovels.length === 0 ? (
        /* Empty State */
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-12 text-center space-y-4 shadow-xl">
          <div className="text-5xl mb-2">📖</div>
          <h3 className="text-xl font-bold text-[var(--text-main)] font-display">No novels found</h3>
          <p className="text-sm text-[var(--text-sub)] max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? `No novels matched your search query "${searchQuery}". Try adjusting your keywords.`
              : channel === 'community'
              ? 'No community novels uploaded yet. Be the first writer to publish one!'
              : 'No novels available in this channel.'}
          </p>
          <div className="flex justify-center gap-3 pt-3">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[var(--bg-surface)] hover:border-brand-500 text-[var(--text-main)] text-xs font-semibold rounded-xl border border-[var(--border-subtle)] transition"
              >
                Clear Search
              </button>
            )}
            {isWriterOrAdmin && onOpenAddNovel && (
              <button
                onClick={onOpenAddNovel}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                ➕ Create Novel
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Optional Hero Billboard (for large catalogs with 4+ items) */}
          {featuredNovel && (
            <div
              onClick={() => onSelectNovel(featuredNovel.id)}
              className="group relative rounded-3xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] cursor-pointer shadow-2xl hover:border-brand-500/50 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

              <div className="absolute inset-0 bg-gradient-to-tr from-brand-950 via-slate-900 to-indigo-950 overflow-hidden">
                {featuredNovel.cover_object ? (
                  <img
                    src={featuredNovel.cover_object}
                    alt=""
                    className="w-full h-full object-cover opacity-40 group-hover:scale-105 group-hover:opacity-50 transition duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-end pr-12 text-slate-800 text-9xl font-black select-none opacity-20">
                    🎙️
                  </div>
                )}
              </div>

              <div className="relative z-20 p-6 sm:p-10 md:p-12 max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 bg-brand-500/20 text-brand-400 font-bold text-xs rounded-lg border border-brand-500/30 backdrop-blur-md">
                    Featured Spotlight
                  </span>
                  <span className="px-2.5 py-1 bg-amber-500 text-black font-extrabold text-xs rounded-lg shadow-sm">
                    ★ 9.8 Voice Rating
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white font-display tracking-tight drop-shadow-lg leading-tight">
                  <span className="text-brand-400 font-serif mr-2 font-normal">Featured:</span>
                  {featuredNovel.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed max-w-2xl font-serif">
                  {featuredNovel.synopsis || 'Experience fully synthesized dialogue and narration.'}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNovel(featuredNovel.id);
                    }}
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2"
                  >
                    <span>▶</span> Start Listening
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOVEL CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map((novel) => {
              const isVerified = novel.channel === 'verified';
              const narratorDisplay =
                novel.narrator_name ||
                novel.narrator_voice_label ||
                novel.narrator_voice_id ||
                'British Cast Narrator';

              return (
                <div
                  key={novel.id}
                  onClick={() => onSelectNovel(novel.id)}
                  className="group bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer preview-card-container"
                >
                  {/* Book Cover / Banner */}
                  <div className="relative h-48 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-6 text-white overflow-hidden">
                    {novel.cover_object ? (
                      <img
                        src={novel.cover_object}
                        alt={novel.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}

                    {/* Gradient Overlay & Watermark Icon */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
                    <span className="text-6xl opacity-20 group-hover:scale-110 transition duration-300">
                      📚
                    </span>

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider backdrop-blur-md shadow-md ${
                          isVerified ? 'bg-brand-600 text-white' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isVerified ? '⭐ Verified' : '🌐 Community'}
                      </span>

                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/10">
                        {novel.chapter_count || 0} Chapter{novel.chapter_count === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Bottom Title on Image */}
                    <div className="absolute bottom-3 left-4 right-4 z-10">
                      <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1 drop-shadow-md font-serif">
                        {novel.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      {/* Author & Narrator Details */}
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-main)]">
                          By {novel.author_username || 'SyncTone Author'}
                        </span>
                        {novel.status && (
                          <span className="px-2 py-0.5 bg-[var(--bg-surface)] text-[var(--text-sub)] rounded-md text-[10px] uppercase font-bold border border-[var(--border-subtle)]">
                            {novel.status}
                          </span>
                        )}
                      </div>

                      {/* Narrator Badge */}
                      <div className="flex items-center gap-2 text-xs text-brand-400 bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-xl">
                        <span className="text-sm">🎙️</span>
                        <span className="font-semibold truncate">
                          {narratorDisplay}
                        </span>
                      </div>

                      {/* Synopsis Excerpt */}
                      <p className="text-xs text-[var(--text-sub)] leading-relaxed line-clamp-3 font-serif">
                        {novel.synopsis || 'No synopsis provided for this novel.'}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-xs text-brand-400 font-bold group-hover:translate-x-1 transition duration-200">
                        View Chapters & Cast →
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">
                        {novel.global_tone || 'Standard'}
                      </span>
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
