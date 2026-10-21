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
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 sm:p-12 space-y-6 animate-pulse">
        <div className="h-6 bg-[var(--bg-surface)] rounded w-28" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-56 h-72 bg-[var(--bg-surface)] rounded-2xl" />
          <div className="flex-1 space-y-4 w-full">
            <div className="h-10 bg-[var(--bg-surface)] rounded w-3/4" />
            <div className="h-5 bg-[var(--bg-surface)] rounded w-1/3" />
            <div className="h-24 bg-[var(--bg-surface)] rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.novel) {
    return (
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 sm:p-12 text-center space-y-4 shadow-xl">
        <div className="text-4xl">⚠️</div>
        <h3 className="text-xl font-bold text-[var(--text-main)] font-display">Error Loading Novel</h3>
        <p className="text-sm text-rose-500 max-w-md mx-auto">{error || 'Novel not found'}</p>
        <div className="flex justify-center gap-3 pt-3">
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-[var(--bg-surface)] hover:border-brand-500 text-[var(--text-main)] text-xs font-bold rounded-xl border border-[var(--border-subtle)] transition"
          >
            ← Back to Library
          </button>
          <button
            onClick={fetchDetails}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md transition"
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
    <div className="space-y-8 animate-fadeIn">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-brand-500 transition px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
        >
          <span>←</span> Back to Library
        </button>
      </div>

      {/* Panoramic Blurred Backdrop Banner + Hero Showcase */}
      <div className="relative rounded-3xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl transition-colors duration-300">
        {/* Subtle Ambient Backing Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)]/80 to-transparent z-10" />

        {novel.cover_object ? (
          <div className="absolute inset-0 overflow-hidden opacity-25 filter blur-xl scale-110">
            <img src={novel.cover_object} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-950 via-slate-900 to-indigo-950 opacity-40" />
        )}

        {/* Hero Content */}
        <div className="relative z-20 p-6 sm:p-8 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Elevated 2:3 Cover Poster */}
            <div className="w-full sm:w-52 md:w-60 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-subtle)] flex-shrink-0 relative flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-black group">
              {novel.cover_object ? (
                <img
                  src={novel.cover_object}
                  alt={novel.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-7xl opacity-30 select-none">📖</span>
              )}
              <span
                className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider backdrop-blur-md shadow-md ${
                  isVerified ? 'bg-brand-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {isVerified ? '⭐ Verified' : '🌐 Community'}
              </span>
            </div>

            {/* Title & Metadata Details */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {novel.global_tone || 'Fantasy & Drama'}
                  </span>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    By {novel.author_username || 'Author'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[var(--text-main)] font-display tracking-tight leading-tight">
                  {novel.title}
                </h1>
              </div>

              {/* Narrator Badge */}
              <div className="inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3.5 py-2 rounded-2xl text-xs text-[var(--text-main)] shadow-inner">
                <span className="text-lg">🎙️</span>
                <div>
                  <span className="font-bold text-brand-400">Narrator: </span>
                  <span className="font-semibold">{narratorDisplay}</span>
                </div>
              </div>

              {/* Synopsis */}
              <p className="text-sm text-[var(--text-sub)] leading-relaxed max-w-3xl font-serif">
                {novel.synopsis || 'No synopsis provided for this novel.'}
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {chapters.length > 0 && (
                  <button
                    onClick={() => onSelectChapter(novel, chapters[0])}
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-brand-600/30 transition-all duration-200 flex items-center gap-2 hover:scale-105"
                  >
                    <span>▶</span> Start Listening (Ch. 1)
                  </button>
                )}
                {isWriterOrAdmin && onOpenUploadChapter && (
                  <button
                    onClick={() => onOpenUploadChapter(novel)}
                    className="px-5 py-3 bg-[var(--bg-surface)] hover:border-brand-500 text-[var(--text-main)] text-xs sm:text-sm font-bold rounded-xl border border-[var(--border-subtle)] transition flex items-center gap-2"
                  >
                    <span>➕</span> Upload Chapter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Mentalist Two-Column Layout (Fix 4: Synopsis/Episodes vs Cast & Production Credits) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Tabs (Chapters Directory / Character Cast) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex border-b border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveTab('chapters')}
              className={`pb-3.5 px-5 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'chapters'
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              📑 Chapters ({chapters.length})
            </button>
            <button
              onClick={() => setActiveTab('characters')}
              className={`pb-3.5 px-5 text-sm font-bold transition-all border-b-2 ${
                activeTab === 'characters'
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              👥 Character Cast ({characters.length})
            </button>
          </div>

          {/* Tab 1: Chapters Directory */}
          {activeTab === 'chapters' && (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] shadow-xl overflow-hidden transition-colors duration-300">
              {chapters.length === 0 ? (
                <div className="p-10 text-center text-[var(--text-muted)] text-sm space-y-3">
                  <div className="text-4xl">📜</div>
                  <p>No chapters uploaded to this novel yet.</p>
                  {isWriterOrAdmin && onOpenUploadChapter && (
                    <div>
                      <button
                        onClick={() => onOpenUploadChapter(novel)}
                        className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md"
                      >
                        Upload First Chapter
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-5 hover:bg-[var(--bg-surface)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] text-sm font-black flex items-center justify-center font-display group-hover:border-brand-500 transition">
                        {ch.chapter_number}
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[var(--text-main)] group-hover:text-brand-400 transition font-serif">
                          {ch.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                          <span>⏱️ {formatDuration(ch.total_duration_ms)}</span>
                          <span>•</span>
                          <span className="uppercase text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] font-bold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            {ch.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectChapter(novel, ch)}
                      className="px-5 py-2.5 bg-brand-600/10 hover:bg-brand-600 text-brand-400 hover:text-white border border-brand-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm self-start sm:self-auto"
                    >
                      <span>🎧</span> Read & Listen
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Character Cast Portfolio */}
          {activeTab === 'characters' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {characters.length === 0 ? (
                <div className="col-span-2 p-10 text-center text-[var(--text-muted)] text-sm bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)]">
                  No character profiles extracted for this novel yet.
                </div>
              ) : (
                characters.map((char) => (
                  <div
                    key={char.id}
                    className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-lg flex flex-col justify-between space-y-3 hover:border-brand-500/50 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-main)] text-sm flex items-center gap-1.5 font-display">
                          {char.is_narrator ? <span>🎙️</span> : <span>🎭</span>}
                          {char.canonical_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-md font-bold uppercase">
                          {char.gender} • {char.age_band}
                        </span>
                      </div>

                      {char.sample_quote && (
                        <p className="text-xs text-[var(--text-sub)] italic border-l-2 border-brand-500/50 pl-2.5 mt-1 leading-relaxed font-serif">
                          "{char.sample_quote}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Voice Engine:</span>
                      <span className="font-semibold text-brand-400 font-mono text-[11px]">
                        {char.voice_label || char.voice_id || 'en-GB-RyanNeural'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right 1 Column: Cast & Production Credits Box (Mentalist Style) */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-xl space-y-5 transition-colors duration-300">
            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-display border-b border-[var(--border-subtle)] pb-3">
              Production & Synthesizer Info
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[var(--text-muted)] block mb-1">Author & Creator</span>
                <span className="font-bold text-[var(--text-main)] text-sm">
                  {novel.author_username || 'Author'}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block mb-1">Primary Cast Narrator</span>
                <span className="font-semibold text-[var(--text-main)] flex items-center gap-1">
                  <span>🎙️</span>
                  <span>{narratorDisplay}</span>
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block mb-1">Narrator Voice Model</span>
                <span className="font-mono text-brand-400 font-bold">
                  {novel.narrator_voice_id || 'en-GB-RyanNeural'}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block mb-1">Acoustic Tone</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {novel.global_tone || 'Standard / Neutral'}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block mb-1">Synthesis Architecture</span>
                <span className="inline-block px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-bold uppercase tracking-wider text-[10px] border border-brand-500/20">
                  Strict 4NF Dual-TTS
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block mb-1">Channel Distribution</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {isVerified ? '⭐ Verified Originals' : '🌐 Community Synthesized'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
