import React, { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { preloadUploadChapterModal, preloadReaderView } from '../App';
import NovelCover from './NovelCover';
import {
  IconArrowLeft,
  IconPlay,
  IconMic,
  IconUsers,
  IconClock,
  IconStar,
  IconPlus,
  IconRefresh,
  IconBook,
  IconSoundwave,
  IconTrash,
  IconUpload,
} from './icons';

function formatDuration(ms) {
  if (!ms || ms <= 0) return 'Audio pending';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function NovelDetails({ novelId, onBack, onSelectChapter, onOpenUploadChapter, onNovelDeleted }) {
  const { isWriterOrAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('chapters'); // 'chapters' | 'characters'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inLibrary, setInLibrary] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(`synctone_library_${novelId}`) === 'true';
    } catch (_) {
      return false;
    }
  });

  const coverUploadInputRef = useRef(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !novelId) return;
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const assetRes = await api.novels.uploadAsset(formData);
      if (assetRes?.url) {
        await api.novels.patch(novelId, { cover_object: assetRes.url });
        setData((prev) =>
          prev && prev.novel
            ? { ...prev, novel: { ...prev.novel, cover_object: assetRes.url } }
            : prev
        );
      }
    } catch (err) {
      console.error('Failed to update cover:', err);
      alert('Failed to update cover: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingCover(false);
      if (coverUploadInputRef.current) coverUploadInputRef.current.value = '';
    }
  };

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        setInLibrary(localStorage.getItem(`synctone_library_${novelId}`) === 'true');
      }
    } catch (_) {}
  }, [novelId]);

  const handleToggleLibrary = () => {
    setInLibrary((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`synctone_library_${novelId}`, String(next));
        }
      } catch (_) {}
      return next;
    });
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteNovel = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.novels.delete(novelId);
      setShowDeleteModal(false);
      if (onNovelDeleted) {
        onNovelDeleted(novelId);
      } else {
        onBack();
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete novel');
      setIsDeleting(false);
    }
  };

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
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-[var(--border-subtle)] rounded" />
        <div className="rounded-3xl theme-surface border p-8 flex flex-col md:flex-row gap-8">
          <div className="w-48 sm:w-56 aspect-[3/4] bg-[var(--border-subtle)] rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-2/3 bg-[var(--border-subtle)] rounded-lg" />
            <div className="h-4 w-1/3 bg-[var(--border-subtle)] rounded" />
            <div className="h-20 w-full bg-[var(--border-subtle)] rounded-lg" />
            <div className="h-10 w-44 bg-[var(--border-subtle)] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.novel) {
    return (
      <div className="rounded-3xl theme-surface border p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] flex items-center justify-center mx-auto">
          <IconRefresh className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold theme-heading">Error Loading Novel</h3>
        <p className="text-sm text-[var(--danger)] max-w-md mx-auto">{error || 'Novel not found'}</p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2 theme-card border rounded-xl text-xs font-semibold theme-sub hover:text-[var(--text-main)] transition cursor-pointer"
          >
            ← Back to Library
          </button>
          <button
            onClick={fetchDetails}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
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

  const totalDurationMs = chapters.reduce((acc, c) => acc + (c.total_duration_ms || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer group"
          aria-label="Back to Library"
        >
          <IconArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>← Back to Library</span>
        </button>
        <span className="hidden sm:inline text-[11px] font-mono text-[var(--text-muted)] tracking-wider">
          CATALOG // {novel.title.toUpperCase()} // ID: {novel.id}
        </span>
      </div>

      {/* NOIR MONOCHROME HERO STAGE HEADER */}
      <section className="relative w-full rounded-[1px] overflow-hidden p-6 sm:p-8 md:p-10 bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-6">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* 3:4 Physical Cover Poster */}
          <div className="w-48 sm:w-56 aspect-[3/4] rounded-[1px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0 relative group">
            <NovelCover
              title={novel.title}
              author={novel.author_username}
              coverUrl={novel.cover_object}
              className="w-full h-full"
            />
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2 py-0.5 rounded-[1px] text-[10px] font-mono font-bold uppercase bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-main)]">
                {isVerified ? 'VERIFIED ORIGINAL' : 'COMMUNITY'}
              </span>
            </div>

            <input
              ref={coverUploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleCoverFileChange}
            />
            {(isWriterOrAdmin || !novel.cover_object) && (
              <button
                type="button"
                onClick={() => coverUploadInputRef.current?.click()}
                disabled={isUploadingCover}
                className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-1 rounded-[1px] text-[10px] font-mono uppercase bg-black/90 text-white border border-white/20 flex items-center gap-1 cursor-pointer"
                title="Change cover artwork"
                aria-label="Change novel cover artwork"
              >
                <IconUpload className="w-3 h-3" />
                <span>{isUploadingCover ? 'Saving...' : 'Change Cover'}</span>
              </button>
            )}
          </div>

          {/* Novel Info & Actions */}
          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <div className="tracking-[0.2em] text-[10px] uppercase font-mono text-[var(--text-muted)] mb-2 flex items-center gap-2">
                <span>CATALOG</span>
                <span className="opacity-40">/</span>
                <span>{novel.channel === 'community' ? 'COMMUNITY ARCHIVE' : 'VERIFIED REPERTORY'}</span>
                <span className="opacity-40">/</span>
                <span>{novel.global_tone || 'DRAMATIC ENSEMBLE'}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-sans uppercase tracking-tight text-[var(--text-main)] leading-[0.95]">
                {novel.title}
              </h1>

              <div className="flex items-center gap-2 mt-2 text-xs font-mono text-[var(--text-sub)] flex-wrap">
                <span>AUTHOR: {(novel.author_username || 'UNKNOWN').toUpperCase()}</span>
                <span>•</span>
                <span>CHAPTERS: {chapters.length} TRACKS</span>
                <span>•</span>
                <span>VOICES: {characters.length} CAST</span>
                <span>•</span>
                <span>FORMAT: MULTI-VOICE</span>
              </div>
            </div>

            {/* Action Buttons Cluster */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {chapters.length > 0 && (
                <button
                  onClick={() => onSelectChapter(novel, chapters[0])}
                  onMouseEnter={preloadReaderView}
                  onFocus={preloadReaderView}
                  onPointerDown={preloadReaderView}
                  className="boxed-btn-primary px-5 py-2.5 text-xs font-mono uppercase flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                  <IconPlay className="w-3.5 h-3.5 fill-current" />
                  <span>Start Listening (Ch. 1)</span>
                </button>
              )}
              {isWriterOrAdmin && onOpenUploadChapter && (
                <button
                  onClick={() => onOpenUploadChapter(novel)}
                  onMouseEnter={preloadUploadChapterModal}
                  onFocus={preloadUploadChapterModal}
                  className="boxed-btn px-4 py-2 text-xs font-mono uppercase text-[var(--text-main)] hover:border-[var(--text-main)] cursor-pointer active:scale-95 transition-colors flex items-center gap-1.5"
                >
                  <IconPlus className="w-3.5 h-3.5" />
                  <span>Upload Chapter</span>
                </button>
              )}
              <button
                className={`boxed-btn px-4 py-2 text-xs font-mono uppercase cursor-pointer active:scale-95 transition-colors ${
                  inLibrary ? 'text-[var(--text-main)] font-bold border-[var(--text-main)]' : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                }`}
                onClick={handleToggleLibrary}
              >
                {inLibrary ? '✓ IN LIBRARY' : '+ ADD TO LIBRARY'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="boxed-btn px-3 py-2 text-xs font-mono uppercase text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer active:scale-95 transition-colors ml-auto flex items-center gap-1.5"
                title="Delete Novel (Local Dev)"
                data-testid="delete-novel-btn"
              >
                <IconTrash className="w-3.5 h-3.5" />
                <span>Delete Novel (Dev)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BOXED MONO TAB BAR */}
      <nav className="tabs-bar" role="tablist" aria-label="Novel Detail Tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'chapters'}
          onClick={() => setActiveTab('chapters')}
          className={`tab-btn cursor-pointer ${activeTab === 'chapters' ? 'active' : ''}`}
        >
          CHAPTER DIRECTORY ({chapters.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'characters'}
          onClick={() => setActiveTab('characters')}
          className={`tab-btn cursor-pointer ${activeTab === 'characters' ? 'active' : ''}`}
        >
          CHARACTER CAST ({characters.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
          className={`tab-btn cursor-pointer ${activeTab === 'details' ? 'active' : ''}`}
        >
          SYNOPSIS & DETAILS
        </button>
      </nav>

      {/* TAB PANELS */}
      <section className="space-y-4">
        {/* Tab 1: Chapter Directory Track List */}
        {activeTab === 'chapters' && (
          <div className="space-y-2">
            {chapters.length === 0 ? (
              <div className="p-8 text-center rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-xs">
                No chapters uploaded yet.
              </div>
            ) : (
              chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectChapter(novel, ch)}
                  onMouseEnter={preloadReaderView}
                  onFocus={preloadReaderView}
                  onPointerDown={preloadReaderView}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectChapter(novel, ch);
                    }
                  }}
                  className="group p-4 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center font-mono font-bold text-xs text-[var(--text-main)] group-hover:bg-[var(--accent)] group-hover:text-[var(--on-accent)] transition-colors flex-shrink-0">
                      {String(ch.chapter_number || idx + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold font-sans uppercase tracking-tight text-[var(--text-main)] truncate">
                        {ch.title || `Chapter ${ch.chapter_number || idx + 1}`}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[var(--text-muted)]">
                        <span>{ch.segment_count ? `${ch.segment_count} dialogue segments` : 'Multi-voice audio'}</span>
                        <span className="opacity-40">•</span>
                        <span>Studio Cast</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                      <IconClock className="w-3.5 h-3.5 opacity-60" />
                      <span>{formatDuration(ch.total_duration_ms || 0)}</span>
                    </span>
                    <button
                      className="boxed-btn-primary px-3 py-1.5 text-xs font-mono uppercase flex items-center gap-1.5 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectChapter(novel, ch);
                      }}
                    >
                      <IconPlay className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Read & Listen</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Character Cast Portfolio */}
        {activeTab === 'characters' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {characters.length === 0 ? (
              <div className="col-span-full p-8 text-center rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-xs">
                No character profiles generated.
              </div>
            ) : (
              characters.map((char) => (
                <div key={char.id} className="p-4 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs font-sans uppercase tracking-tight text-[var(--text-main)]">{char.canonical_name}</h5>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-sub)]">
                      {char.gender || 'Character'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono flex items-center justify-between">
                    <span>VOICE:</span>
                    <span className="text-[var(--text-main)] font-semibold">{char.voice_id || 'en-GB-RyanNeural'}</span>
                  </p>
                  {char.sample_quote && (
                    <p className="text-xs italic text-[var(--text-sub)] font-serif line-clamp-2 pt-1 border-t border-[var(--border-subtle)]">
                      &ldquo;{char.sample_quote}&rdquo;
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Synopsis & Details */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 p-6 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase font-mono tracking-wider">
                // SYNOPSIS
              </span>
              <p className="text-sm font-sans text-[var(--text-main)] leading-relaxed">
                {novel.synopsis || 'No synopsis provided for this novel.'}
              </p>
            </div>

            <div className="p-6 rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 text-xs font-mono">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block border-b border-[var(--border-subtle)] pb-2">
                // AT A GLANCE
              </span>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">NARRATOR</span>
                <span className="text-[var(--text-main)] font-semibold">{narratorDisplay}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">CAST SIZE</span>
                <span className="text-[var(--text-main)] font-semibold">{characters.length} Voices</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">CHAPTERS</span>
                <span className="text-[var(--text-main)] font-semibold">{chapters.length} Tracks</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">STATUS</span>
                <span className="text-[var(--text-main)] font-semibold">Ready for Playback</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Delete Novel Confirmation Modal (Local Dev) */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
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
                <p className="text-xs font-mono text-[var(--text-muted)]">Permanently remove this novel</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm font-sans text-[var(--text-sub)] leading-relaxed">
              Are you sure you want to delete <strong className="text-[var(--text-main)]">&ldquo;{novel.title}&rdquo;</strong>?
              This will permanently remove the novel, all {chapters.length} chapters, character voice portfolio, and audio cache from your local database.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-main)] text-xs font-mono">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="boxed-btn px-4 py-2 text-xs font-mono uppercase text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
                data-testid="cancel-delete-novel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNovel}
                disabled={isDeleting}
                className="boxed-btn-primary px-4 py-2 text-xs font-mono uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                data-testid="confirm-delete-novel-btn"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
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
