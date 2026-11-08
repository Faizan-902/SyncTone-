import React, { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { preloadUploadChapterModal, preloadReaderView } from '../App';
import {
  IconArrowLeft,
  IconPlay,
  IconRefresh,
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

function formatTotalDuration(ms) {
  if (!ms || ms <= 0) return 'AUDIO PENDING';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
  }
  return `${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
}

export default function NovelDetails({ novelId, onBack, onSelectChapter, onOpenUploadChapter, onNovelDeleted }) {
  const { isWriterOrAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'cast' | 'chapters' | 'details' | 'score'
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
      <div className="detail-stage space-y-6 animate-pulse">
        <div className="detail-breadcrumb-bar">
          <div className="h-4 w-48 bg-[var(--border-subtle)] rounded-[1px]" />
          <div className="h-4 w-32 bg-[var(--border-subtle)] rounded-[1px]" />
        </div>
        <div className="detail-stage-header space-y-4">
          <div className="h-6 w-56 bg-[var(--border-subtle)] rounded-[1px]" />
          <div className="h-14 w-3/4 bg-[var(--border-subtle)] rounded-[1px]" />
          <div className="h-4 w-1/2 bg-[var(--border-subtle)] rounded-[1px]" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-28 bg-[var(--border-subtle)] rounded-[1px]" />
            <div className="h-10 w-36 bg-[var(--border-subtle)] rounded-[1px]" />
            <div className="h-10 w-36 bg-[var(--border-subtle)] rounded-[1px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.novel) {
    return (
      <div className="detail-stage">
        <div className="rounded-[1px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-[1px] bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-main)] flex items-center justify-center mx-auto">
            <IconRefresh className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold font-sans uppercase text-[var(--text-main)]">Error Loading Novel</h3>
          <p className="text-sm font-mono text-[var(--text-sub)] max-w-md mx-auto">{error || 'Novel not found'}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={onBack}
              className="btn btn-sm"
              aria-label="Back to Library"
            >
              ← Back to Library
            </button>
            <button
              onClick={fetchDetails}
              className="btn btn-sm btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { novel, characters = [], chapters = [] } = data;
  const isVerified = novel.channel === 'verified';
  const narratorDisplay =
    novel.narrator ||
    novel.narrator_name ||
    novel.narrator_voice_label ||
    novel.narrator_voice_id ||
    'British Cast Narrator';

  const totalDurationMs =
    chapters.reduce((acc, c) => acc + (c.total_duration_ms || c.duration_ms || 0), 0) ||
    novel.total_duration_ms ||
    0;

  return (
    <div className="detail-stage">
      {/* Back Navigation & Breadcrumb Bar */}
      <div className="detail-breadcrumb-bar">
        <button
          onClick={onBack}
          className="mono-xs text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center gap-1.5"
          aria-label="Back to Library"
        >
          <IconArrowLeft className="w-3.5 h-3.5" />
          <span>← BACK TO ARCHIVE CATALOG</span>
          <span className="sr-only">Back to Library</span>
        </button>
        <span className="mono-xs text-[var(--text-muted)]">
          CATALOG // {isVerified ? 'VERIFIED' : 'COMMUNITY'} // {novel.title.toUpperCase()} // ID: {novel.id}
        </span>
      </div>

      {/* NOIR MONOCHROME FULL-BLEED STAGE HEADER */}
      <section className="detail-stage-header">
        <span className="badge badge-active" style={{ width: 'fit-content' }}>
          <span className="dot" aria-hidden="true" />
          <span>{isVerified ? 'VERIFIED REPERTORY // AUDIO ARCHIVE' : 'COMMUNITY ARCHIVE // MULTI-VOICE'}</span>
        </span>

        <h1 className="detail-giant-title">
          {novel.title}
        </h1>

        <div className="detail-metadata-bar">
          <span>AUTHOR: {(novel.author_username || 'UNKNOWN').toUpperCase()}</span>
          <span>•</span>
          <span>DURATION: {formatTotalDuration(totalDurationMs)}</span>
          <span>•</span>
          <span>CHAPTERS: {chapters.length} TRACKS</span>
          <span>•</span>
          <span>VOICES: {characters.length} CAST</span>
          <span>•</span>
          <span>FORMAT: {(novel.global_tone || 'MULTI-VOICE ENSEMBLE').toUpperCase()}</span>
        </div>

        {/* Action Buttons Cluster */}
        <div className="detail-actions-cluster">
          {chapters.length > 0 && (
            <button
              onClick={() => onSelectChapter(novel, chapters[0])}
              onMouseEnter={preloadReaderView}
              onFocus={preloadReaderView}
              onPointerDown={preloadReaderView}
              className="btn btn-lg btn-primary cursor-pointer active:scale-95 transition-transform"
              aria-label="Start Listening (Ch. 1)"
            >
              <span className="dot" aria-hidden="true" />
              <span>LISTEN</span>
              <span className="sr-only">Start Listening (Ch. 1)</span>
            </button>
          )}

          {chapters.length > 0 && (
            <button
              onClick={() => onSelectChapter(novel, chapters[0])}
              onMouseEnter={preloadReaderView}
              onFocus={preloadReaderView}
              onPointerDown={preloadReaderView}
              className="btn btn-lg cursor-pointer active:scale-95 transition-all"
              aria-label="Open Reader"
            >
              <span className="dot" aria-hidden="true" />
              <span>OPEN READER</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('cast')}
            className="btn btn-lg cursor-pointer active:scale-95 transition-all"
            aria-label="Voice Studio"
          >
            <span className="dot" aria-hidden="true" />
            <span>VOICE STUDIO</span>
          </button>

          <button
            className={`btn btn-lg cursor-pointer active:scale-95 transition-all ${
              inLibrary ? 'btn-primary' : ''
            }`}
            onClick={handleToggleLibrary}
            aria-label={inLibrary ? 'In Library' : 'Add to Library'}
          >
            <span className="dot" aria-hidden="true" />
            <span>{inLibrary ? '✓ IN LIBRARY' : '+ ADD TO LIBRARY'}</span>
          </button>

          {isWriterOrAdmin && onOpenUploadChapter && (
            <button
              onClick={() => onOpenUploadChapter(novel)}
              onMouseEnter={preloadUploadChapterModal}
              onFocus={preloadUploadChapterModal}
              className="btn btn-lg cursor-pointer active:scale-95 transition-all"
              aria-label="Upload Chapter"
            >
              <span className="dot" aria-hidden="true" />
              <span>UPLOAD CHAPTER</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-lg cursor-pointer active:scale-95 transition-all ml-auto flex items-center gap-1.5"
            title="Delete Novel (Local Dev)"
            data-testid="delete-novel-btn"
            aria-label="Delete Novel (Dev)"
          >
            <IconTrash className="w-3.5 h-3.5" />
            <span>Delete Novel (Dev)</span>
          </button>
        </div>

        {/* Hidden Cover Upload Input */}
        <input
          ref={coverUploadInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleCoverFileChange}
        />
      </section>

      {/* BOXED MONO TAB BAR */}
      <nav className="tabs-bar" style={{ marginBottom: 24 }} role="tablist" aria-label="Novel Detail Tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`tab-btn cursor-pointer ${activeTab === 'overview' ? 'active' : ''}`}
          data-tab="overview"
        >
          OVERVIEW
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'cast'}
          onClick={() => setActiveTab('cast')}
          className={`tab-btn cursor-pointer ${activeTab === 'cast' ? 'active' : ''}`}
          data-tab="cast"
        >
          <span>CAST</span>
          <span className="sr-only">Character Cast</span>
          <span className="ml-1 text-[10px] opacity-60">({characters.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'chapters'}
          onClick={() => setActiveTab('chapters')}
          className={`tab-btn cursor-pointer ${activeTab === 'chapters' ? 'active' : ''}`}
          data-tab="chapters"
        >
          <span>CHAPTERS</span>
          <span className="sr-only">Chapter Directory</span>
          <span className="ml-1 text-[10px] opacity-60">({chapters.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'details'}
          onClick={() => setActiveTab('details')}
          className={`tab-btn cursor-pointer ${activeTab === 'details' ? 'active' : ''}`}
          data-tab="details"
        >
          DETAILS
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'score'}
          onClick={() => setActiveTab('score')}
          className={`tab-btn cursor-pointer ${activeTab === 'score' ? 'active' : ''}`}
          data-tab="score"
        >
          SCORE
        </button>
      </nav>

      {/* TAB CONTENT PANELS */}
      <div className="space-y-4">
        {/* Tab 1: Overview Panel */}
        <section
          id="tab-panel-overview"
          role="tabpanel"
          aria-label="Overview"
          className={`tab-content-panel ${activeTab === 'overview' ? 'active' : ''}`}
          style={{ display: activeTab === 'overview' ? 'block' : 'none' }}
        >
          <div className="detail-overview-grid">
            <div>
              <h3 className="mono-sm mb-3 text-[var(--text-muted)]">// SYNOPSIS</h3>
              <p className="text-[15px] leading-[1.7] text-[var(--text-main)] mb-6 whitespace-pre-line">
                {novel.synopsis || 'No synopsis registered for this literary volume.'}
              </p>
            </div>
            <aside className="detail-matrix-box">
              <span className="mono-xs text-[var(--text-muted)]">// AT A GLANCE</span>
              <div className="detail-matrix-row">
                <span>AUTHOR</span>
                <span className="text-[var(--text-main)] font-semibold">{(novel.author_username || 'Unknown').toUpperCase()}</span>
              </div>
              <div className="detail-matrix-row">
                <span>NARRATOR</span>
                <span className="text-[var(--text-main)] font-semibold">{narratorDisplay}</span>
              </div>
              <div className="detail-matrix-row">
                <span>CAST SIZE</span>
                <span className="text-[var(--text-main)] font-semibold">{characters.length} Voices</span>
              </div>
              <div className="detail-matrix-row">
                <span>CHAPTERS</span>
                <span className="text-[var(--text-main)] font-semibold">{chapters.length} Tracks</span>
              </div>
              <div className="detail-matrix-row">
                <span>TOTAL DURATION</span>
                <span className="text-[var(--text-main)] font-semibold">{formatTotalDuration(totalDurationMs)}</span>
              </div>
              <div className="detail-matrix-row">
                <span>CHANNEL</span>
                <span className="text-[var(--text-main)] font-semibold">{isVerified ? 'VERIFIED REPERTORY' : 'COMMUNITY ARCHIVE'}</span>
              </div>
              <div className="detail-matrix-row">
                <span>STATUS</span>
                <span className="text-[var(--text-main)] font-semibold">{novel.status ? novel.status.toUpperCase() : 'READY FOR PLAYBACK'}</span>
              </div>
            </aside>
          </div>
        </section>

        {/* Tab 2: Cast Panel */}
        <section
          id="tab-panel-cast"
          role="tabpanel"
          aria-label="Character Cast"
          className={`tab-content-panel ${activeTab === 'cast' ? 'active' : ''}`}
          style={{ display: activeTab === 'cast' ? 'block' : 'none' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="mono-xs text-[var(--text-muted)]">// CHARACTER VOICE PORTFOLIO</span>
            <span className="mono-xs text-[var(--text-sub)]">{characters.length} VOICES REGISTERED</span>
          </div>

          <div className="roster-grid">
            {characters.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono text-xs">
                No character profiles generated.
              </div>
            ) : (
              characters.map((char) => {
                const charName = char.canonical_name || char.name || 'Character';
                const charRole = char.role || (char.is_narrator ? 'NARRATOR' : 'CAST');
                const charVoice = char.voice_id || 'en-GB-RyanNeural';
                return (
                  <div key={char.id || charName} className="character-card">
                    <div className="char-header-row">
                      <span className="char-name">{charName}</span>
                      <span className="char-role-badge">{charRole.toUpperCase()}</span>
                    </div>
                    <div className="char-traits-list">
                      <div className="flex justify-between items-center">
                        <span>VOICE:</span>
                        <span className="text-[var(--text-main)] font-semibold">{charVoice}</span>
                      </div>
                      <div>
                        <span>ROLE: {char.is_narrator ? 'First-person Narrator & Chronicler' : (char.gender ? `${char.gender.toUpperCase()} Cast` : 'Dialogue Speaker')}</span>
                      </div>
                      {char.age_band && <div>AGE: {char.age_band.toUpperCase()}</div>}
                      {char.sample_quote && (
                        <div className="italic font-serif text-xs text-[var(--text-sub)] line-clamp-2 pt-1 border-t border-[var(--border-subtle)]">
                          &ldquo;{char.sample_quote}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Tab 3: Chapters Panel */}
        <section
          id="tab-panel-chapters"
          role="tabpanel"
          aria-label="Chapter Directory"
          className={`tab-content-panel ${activeTab === 'chapters' ? 'active' : ''}`}
          style={{ display: activeTab === 'chapters' ? 'block' : 'none' }}
        >
          <div className="chapters-directory-list">
            {chapters.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bg-card)] text-[var(--text-muted)] font-mono text-xs">
                No chapters uploaded yet.
              </div>
            ) : (
              chapters.map((ch, idx) => {
                const chNumber = ch.chapter_number || idx + 1;
                const chTitle = ch.title || `Chapter ${chNumber}`;
                const chDuration = ch.total_duration_ms || ch.duration_ms || 0;
                const hasAudio = chDuration > 0 || ch.has_studio_audio;
                return (
                  <div
                    key={ch.id || idx}
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
                    className="chapter-row-item cursor-pointer"
                  >
                    <span className="chapter-idx">CH. {String(chNumber).padStart(2, '0')}</span>
                    <span className="chapter-title truncate">{chTitle}</span>
                    <span className="chapter-duration">{formatDuration(chDuration)}</span>
                    <span className={`badge ${hasAudio ? 'badge-active' : ''}`}>
                      <span className="dot" aria-hidden="true" />
                      <span>{hasAudio ? 'SYNTHESIZED' : 'PENDING'}</span>
                    </span>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectChapter(novel, ch);
                      }}
                      aria-label={`Read & Listen to ${chTitle}`}
                    >
                      <span className="dot" aria-hidden="true" />
                      <span>PLAY</span>
                      <span className="sr-only">Read & Listen</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Tab 4: Details Panel */}
        <section
          id="tab-panel-details"
          role="tabpanel"
          aria-label="Archive Details"
          className={`tab-content-panel ${activeTab === 'details' ? 'active' : ''}`}
          style={{ display: activeTab === 'details' ? 'block' : 'none' }}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 flex flex-col gap-5">
            <h3 className="mono-sm text-[var(--text-main)]">// ACOUSTIC & SYNTHESIS ARCHITECTURE</h3>
            <p className="text-sm leading-relaxed text-[var(--text-sub)]">
              SyncTone produces high-resolution neural speech synthesized against time-aligned character phoneme tags.
              Playback utilizes multi-channel acoustic streams mapped to authentic character vocal profiles.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-[var(--border-subtle)] p-3.5 bg-[var(--bg-surface)]">
                <span className="mono-xs text-[var(--text-muted)] block mb-1">CHANNEL ARCHIVE</span>
                <span className="mono-xs text-[var(--text-main)] font-semibold">
                  {isVerified ? 'VERIFIED ORIGINAL' : 'COMMUNITY REPERTORY'}
                </span>
              </div>
              <div className="border border-[var(--border-subtle)] p-3.5 bg-[var(--bg-surface)]">
                <span className="mono-xs text-[var(--text-muted)] block mb-1">EDITORIAL TONE</span>
                <span className="mono-xs text-[var(--text-main)] font-semibold">
                  {(novel.global_tone || 'DRAMATIC ENSEMBLE').toUpperCase()}
                </span>
              </div>
              <div className="border border-[var(--border-subtle)] p-3.5 bg-[var(--bg-surface)]">
                <span className="mono-xs text-[var(--text-muted)] block mb-1">RECORDED DURATION</span>
                <span className="mono-xs text-[var(--text-main)] font-semibold">
                  {formatTotalDuration(totalDurationMs)}
                </span>
              </div>
              <div className="border border-[var(--border-subtle)] p-3.5 bg-[var(--bg-surface)]">
                <span className="mono-xs text-[var(--text-muted)] block mb-1">PLAYBACK STATUS</span>
                <span className="mono-xs text-[var(--text-main)] font-semibold">
                  {novel.status ? novel.status.toUpperCase() : 'READY FOR PLAYBACK'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab 5: Score Panel */}
        <section
          id="tab-panel-score"
          role="tabpanel"
          aria-label="Atmospheric Score"
          className={`tab-content-panel ${activeTab === 'score' ? 'active' : ''}`}
          style={{ display: activeTab === 'score' ? 'block' : 'none' }}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 flex flex-col gap-5">
            <h3 className="mono-sm text-[var(--text-main)]">// GENERATIVE ATMOSPHERIC SOUNDSCAPES</h3>
            <p className="text-sm leading-relaxed text-[var(--text-sub)]">
              Dynamic atmospheric background soundscapes calibrated to narrative tension and reader pacing.
              Ambience runs synchronously with the chapter reading engine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-[var(--border-subtle)] p-4 bg-[var(--bg-surface)]">
                <span className="mono-xs text-[var(--text-muted)] block mb-1">ACOUSTIC PROFILE</span>
                <span className="mono-xs text-[var(--text-main)] font-semibold">
                  {(novel.global_tone || 'DRAMATIC ENSEMBLE').toUpperCase()}
                </span>
              </div>
              <div className="border border-[var(--border-subtle)] p-4 bg-[var(--bg-surface)]">
                <span className="mono-xs text-[var(--text-muted)] block mb-1">SOUNDTRACK ENGINE</span>
                <span className="mono-xs text-[var(--text-main)] font-semibold">DYNAMIC AMBIENCE</span>
              </div>
              <div className="border border-[var(--border-subtle)] p-4 bg-[var(--bg-surface)]">
                <span className="mono-xs text-[var(--text-muted)] block mb-1">STATUS</span>
                <span className="mono-xs text-[var(--text-main)] font-semibold">CALIBRATED // REAL-TIME</span>
              </div>
            </div>
          </div>
        </section>
      </div>

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
                className="btn btn-sm cursor-pointer"
                data-testid="cancel-delete-novel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNovel}
                disabled={isDeleting}
                className="btn btn-sm btn-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
