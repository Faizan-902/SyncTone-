import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  IconArrowLeft,
  IconPlay,
  IconPlus,
  IconMic,
  IconClock,
  IconBook,
  IconUsers,
  IconSparkles,
  IconCheck,
} from './icons';

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
        <div className="h-5 bg-[var(--bg-surface)] rounded w-28" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-56 h-72 bg-[var(--bg-surface)] rounded-2xl" />
          <div className="flex-1 space-y-4 w-full">
            <div className="h-8 bg-[var(--bg-surface)] rounded w-3/4" />
            <div className="h-4 bg-[var(--bg-surface)] rounded w-1/3" />
            <div className="h-24 bg-[var(--bg-surface)] rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.novel) {
    return (
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-8 sm:p-12 text-center space-y-4">
        <h3 className="text-lg font-bold text-[var(--text-main)] font-display">Error Loading Novel</h3>
        <p className="text-xs text-rose-400 max-w-md mx-auto">{error || 'Novel not found'}</p>
        <div className="flex justify-center gap-3 pt-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-main)] text-xs font-semibold rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-focus)] transition"
          >
            Back to Library
          </button>
          <button
            onClick={fetchDetails}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
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
    'Neural Cast Narrator';

  const firstChapter = chapters.length > 0 ? chapters[0] : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
        >
          <IconArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Cinematic Hero Showcase */}
      <div className="relative rounded-3xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl">
        <div className="flex flex-col md:flex-row p-6 sm:p-8 md:p-10 gap-8 items-start">
          {/* Elevated Cover Poster */}
          <div className="w-48 sm:w-56 h-72 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative">
            {novel.cover_object ? (
              <img
                src={novel.cover_object}
                alt={novel.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950/30 via-[var(--bg-surface)] to-[var(--bg-card)] flex flex-col items-center justify-center p-4 text-center">
                <IconBook className="w-12 h-12 text-indigo-400/40 mb-2" />
                <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                  Cover Art
                </span>
              </div>
            )}
          </div>

          {/* Metadata & Synopsis */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {isVerified ? 'Verified Original' : 'Community'}
              </span>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span className="text-xs text-[var(--text-muted)]">
                By <strong className="text-[var(--text-main)]">{novel.author_username || 'Author'}</strong>
              </span>
              {novel.global_tone && (
                <>
                  <span className="text-xs text-[var(--text-muted)]">•</span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    Tone: {novel.global_tone}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] font-display tracking-tight leading-tight">
              {novel.title}
            </h1>

            <p className="text-xs sm:text-sm text-[var(--text-sub)] font-serif leading-relaxed">
              {novel.synopsis || 'No synopsis available for this work.'}
            </p>

            {/* Narrator Voice & Metrics */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                <IconMic className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-[11px] text-[var(--text-main)]">{narratorDisplay}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                <IconBook className="w-4 h-4 text-indigo-400" />
                <span>{chapters.length} Chapters</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                <IconUsers className="w-4 h-4 text-indigo-400" />
                <span>{characters.length} Voice Actors</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              {firstChapter && (
                <button
                  onClick={() => onSelectChapter(novel, firstChapter)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <IconPlay className="w-3.5 h-3.5 fill-white" />
                  <span>Start Listening (Ch. 1)</span>
                </button>
              )}

              {isWriterOrAdmin && onOpenUploadChapter && (
                <button
                  onClick={() => onOpenUploadChapter(novel)}
                  className="px-4 py-2.5 bg-[var(--bg-surface)] hover:border-indigo-500/50 text-[var(--text-main)] text-xs font-semibold rounded-xl border border-[var(--border-subtle)] transition flex items-center gap-2"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  <span>Upload Chapter</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Chapters Tracklist vs Character Voice Cast */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'chapters'
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Chapters ({chapters.length})
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'characters'
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Character Cast ({characters.length})
          </button>
        </div>

        {/* TAB 1: CHAPTERS LIST */}
        {activeTab === 'chapters' && (
          <div className="space-y-3">
            {chapters.length === 0 ? (
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-8 text-center text-xs text-[var(--text-muted)]">
                No chapters uploaded yet.
              </div>
            ) : (
              chapters.map((ch, idx) => {
                const isReady = ch.synthesis_status === 'completed' || ch.audio_url || ch.status === 'completed';
                const isSynthesizing = ch.synthesis_status === 'processing';

                return (
                  <div
                    key={ch.id}
                    onClick={() => onSelectChapter(novel, ch)}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-indigo-500/40 transition cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs font-mono font-semibold flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                        {ch.chapter_number || idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--text-main)] group-hover:text-indigo-400 transition truncate">
                          {ch.title || `Chapter ${ch.chapter_number || idx + 1}`}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <IconClock className="w-3 h-3" />
                            {formatDuration(ch.total_duration_ms)}
                          </span>
                          {ch.word_count && <span>• {ch.word_count} words</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md ${
                          isReady
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isSynthesizing
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        {isReady ? 'Audio Ready' : isSynthesizing ? 'Synthesizing...' : 'Pending'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChapter(novel, ch);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] group-hover:bg-indigo-600 text-[var(--text-muted)] group-hover:text-white flex items-center gap-1.5 text-xs font-semibold transition"
                        title="Read & Listen"
                      >
                        <IconPlay className="w-3.5 h-3.5 fill-current" />
                        <span>Read & Listen</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: CHARACTER VOICE CAST */}
        {activeTab === 'characters' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.length === 0 ? (
              <div className="col-span-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-8 text-center text-xs text-[var(--text-muted)]">
                No characters registered in this novel's cast.
              </div>
            ) : (
              characters.map((char) => {
                const charName = char.canonical_name || char.name || 'Character';
                const voiceId = char.voice_id || char.assigned_voice_id || 'en-GB-RyanNeural';

                return (
                  <div
                    key={char.id}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {charName[0] || 'C'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--text-main)] truncate">
                          {charName}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {char.role || (char.is_narrator ? 'Narrator' : 'Cast Character')}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs space-y-1 font-mono">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>Neural Voice</span>
                        <span className="text-[var(--text-main)] font-semibold truncate max-w-[140px]">
                          {voiceId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span>Engine</span>
                        <span>EdgeTTS / Kokoro</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
