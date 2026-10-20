import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function formatDuration(ms) {
  if (!ms || ms <= 0) return 'Audio pending';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function NovelDetails({ novelId, onBack, onSelectChapter, onOpenUploadChapter }) {
  const { isWriterOrAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('chapters'); // 'chapters' | 'characters'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.novels.get(novelId);
      setData(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to load novel details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (novelId) fetchDetails();
  }, [novelId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-24" />
        <div className="flex gap-6 items-start">
          <div className="w-36 h-48 bg-gray-200 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-16 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.novel) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h3 className="text-lg font-bold text-gray-800">Error Loading Novel</h3>
        <p className="text-sm text-red-600 max-w-md mx-auto">{error || 'Novel not found'}</p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
          >
            ← Back to Library
          </button>
          <button
            onClick={fetchDetails}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { novel, characters = [], chapters = [] } = data;
  const isVerified = novel.channel === 'verified';
  const narratorDisplay =
    novel.narrator_name ||
    novel.narrator_voice_label ||
    novel.narrator_voice_id ||
    'British Cast Narrator';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition"
        >
          <span>←</span> Back to Library
        </button>
      </div>

      {/* Novel Header Hero Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Cover Art / Stylized Placeholder */}
          <div className="w-full md:w-44 h-56 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl overflow-hidden shadow-lg shadow-indigo-950/20 flex-shrink-0 relative flex items-center justify-center text-white">
            {novel.cover_object ? (
              <img
                src={novel.cover_object}
                alt={novel.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-6xl opacity-30">📖</span>
            <span
              className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider backdrop-blur-md ${
                isVerified ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
              }`}
            >
              {isVerified ? '⭐ Verified' : '🌐 Community'}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  {novel.global_tone || 'Fantasy / Adventure'}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">
                  By {novel.author_username || 'SyncTone Author'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                {novel.title}
              </h1>
            </div>

            {/* Narrator Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs text-indigo-900">
              <span className="text-base">🎙️</span>
              <div>
                <span className="font-semibold">Narrator: </span>
                <span>{narratorDisplay}</span>
              </div>
            </div>

            {/* Synopsis */}
            <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
              {novel.synopsis || 'No synopsis provided for this novel.'}
            </p>

            {/* Action Bar */}
            <div className="flex items-center gap-3 pt-2">
              {chapters.length > 0 && (
                <button
                  onClick={() => onSelectChapter(novel, chapters[0])}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
                >
                  <span>▶</span> Start Listening (Ch. 1)
                </button>
              )}
              {isWriterOrAdmin && onOpenUploadChapter && (
                <button
                  onClick={() => onOpenUploadChapter(novel)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <span>➕</span> Upload Chapter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Chapters vs Character Cast */}
      <div className="space-y-4">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'chapters'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📑 Chapters ({chapters.length})
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'characters'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Character Cast ({characters.length})
          </button>
        </div>

        {/* Tab 1: Chapters Directory */}
        {activeTab === 'chapters' && (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 shadow-sm overflow-hidden">
            {chapters.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No chapters added to this novel yet.
                {isWriterOrAdmin && onOpenUploadChapter && (
                  <div className="mt-3">
                    <button
                      onClick={() => onOpenUploadChapter(novel)}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Upload First Chapter
                    </button>
                  </div>
                )}
              </div>
            ) : (
              chapters.map((ch) => {
                const isReady = ch.status === 'completed' || (ch.total_duration_ms > 0);
                return (
                  <div
                    key={ch.id}
                    className="p-4 hover:bg-gray-50/80 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">
                        {ch.chapter_number}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{ch.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>⏱️ {formatDuration(ch.total_duration_ms)}</span>
                          <span>•</span>
                          <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-gray-100 font-semibold text-gray-600">
                            {ch.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectChapter(novel, ch)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>🎧</span> Read & Listen
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Character Cast Portfolio */}
        {activeTab === 'characters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-gray-500 text-sm bg-white rounded-2xl border border-gray-100">
                No character profiles generated for this novel yet.
              </div>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        {char.is_narrator && <span>🎙️</span>}
                        {char.canonical_name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
                        {char.gender} • {char.age_band}
                      </span>
                    </div>

                    {char.sample_quote && (
                      <p className="text-xs text-gray-500 italic border-l-2 border-indigo-200 pl-2 mt-1">
                        "{char.sample_quote}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Assigned Voice:</span>
                    <span className="font-semibold text-gray-800">
                      {char.voice_label || char.voice_id || 'en-GB-RyanNeural'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
