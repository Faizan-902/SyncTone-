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

  // Filter novels by search query
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

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span>📚</span> Novel Library
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Browse multi-voice synthesized novels with synchronized 60fps audio reading.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isWriterOrAdmin && onOpenAddNovel && (
            <button
              onClick={onOpenAddNovel}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <span>➕</span> Add Novel
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Channel Filter Tabs */}
        <div className="inline-flex p-1 bg-gray-100/80 rounded-xl border border-gray-200/60">
          <button
            onClick={() => setChannel('verified')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              channel === 'verified'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⭐ Verified Originals
          </button>
          <button
            onClick={() => setChannel('community')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              channel === 'community'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🌐 Community Novels
          </button>
          <button
            onClick={() => setChannel('all')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              channel === 'all'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Channels
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or narrator..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchNovels(channel)}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse shadow-sm"
            >
              <div className="h-44 bg-gray-200 rounded-xl" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNovels.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-4 shadow-sm">
          <div className="text-5xl">📖</div>
          <h3 className="text-lg font-bold text-gray-800">No novels found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {searchQuery
              ? `No novels matched your search query "${searchQuery}". Try adjusting your keywords.`
              : channel === 'community'
              ? 'No community novels uploaded yet. Be the first to share one!'
              : 'No novels available in this channel.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                Clear Search
              </button>
            )}
            {isWriterOrAdmin && onOpenAddNovel && (
              <button
                onClick={onOpenAddNovel}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                ➕ Create Novel
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Novel Cards Grid */
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
                className="group bg-white rounded-2xl border border-gray-100 hover:border-indigo-200/80 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
              >
                {/* Book Cover / Banner */}
                <div className="relative h-44 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6 text-white overflow-hidden">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent pointer-events-none" />
                  <span className="text-6xl opacity-30 group-hover:scale-110 transition duration-300">
                    📚
                  </span>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider backdrop-blur-md shadow-sm ${
                        isVerified
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-amber-500/90 text-white'
                      }`}
                    >
                      {isVerified ? '⭐ Verified' : '🌐 Community'}
                    </span>

                    <span className="px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-[11px] font-medium rounded-lg">
                      {novel.chapter_count || 0} Chapter{novel.chapter_count === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Bottom Title on Image */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1 drop-shadow-md">
                      {novel.title}
                    </h3>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Author & Narrator Details */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        By {novel.author_username || 'SyncTone Author'}
                      </span>
                      {novel.status && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-semibold">
                          {novel.status}
                        </span>
                      )}
                    </div>

                    {/* Narrator Badge */}
                    <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50/70 border border-indigo-100/60 px-2.5 py-1 rounded-lg">
                      <span className="text-sm">🎙️</span>
                      <span className="font-medium truncate">
                        {narratorDisplay}
                      </span>
                    </div>

                    {/* Synopsis Excerpt */}
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {novel.synopsis || 'No synopsis provided for this novel.'}
                    </p>
                  </div>

                  {/* Read / Listen Button */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-indigo-600 font-semibold group-hover:translate-x-0.5 transition duration-200">
                      View Chapters & Cast →
                    </span>
                    <span className="text-xs text-gray-400">
                      {novel.global_tone || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
