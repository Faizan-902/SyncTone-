import React, { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { preloadUploadChapterModal, preloadReaderView } from '../App';
import {
  IconPlay,
  IconRefresh,
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

const ARCHIVED_MODELS = [
  { id: 'Neural-Docu-UK-M', role: 'DOCUMENTARIAN', timbre: 'Warm British Tenor, balanced literary tone', freq: '48kHz PCM // Latency: 42ms' },
  { id: 'Neural-Analytical-V2', role: 'RP ANALYTICAL', timbre: 'Sharp Victorian RP, crisp consonants', freq: '48kHz PCM // Latency: 38ms' },
  { id: 'Neural-Warm-Male-UK', role: 'WARM MALE', timbre: 'Resonant, intimate companionable baritone', freq: '48kHz PCM // Latency: 40ms' },
  { id: 'Neural-Cockney-Male', role: 'COCKNEY MALE', timbre: 'Raspy authentic 19th-c urban dialect', freq: '48kHz PCM // Latency: 45ms' },
  { id: 'Neural-Matron-Female', role: 'MATRON FEMALE', timbre: 'Warm maternal Victorian cadence', freq: '48kHz PCM // Latency: 44ms' },
];

export default function NovelDetails({ novelId, onBack, onSelectChapter, onOpenUploadChapter, initialTab }) {
  const { isWriterOrAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('tab');
      if (q && ['overview', 'cast', 'chapters', 'details', 'score'].includes(q)) return q;
    } catch (_) {}
    return initialTab || 'overview';
  });
  const [studioTab, setStudioTab] = useState('cast'); // 'cast' | 'voices' | 'settings' | 'generate'
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
        <h1 className="sr-only">Loading Novel Details</h1>
        <div className="detail-breadcrumb-bar">
          <div className="h-4 w-48 bg-[var(--border-subtle)] rounded-md" />
          <div className="h-4 w-32 bg-[var(--border-subtle)] rounded-md" />
        </div>
        <div className="detail-stage-header space-y-4">
          <div className="h-6 w-56 bg-[var(--border-subtle)] rounded-md" />
          <div className="h-14 w-3/4 bg-[var(--border-subtle)] rounded-xl" />
          <div className="h-4 w-1/2 bg-[var(--border-subtle)] rounded-md" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-28 bg-[var(--border-subtle)] rounded-xl" />
            <div className="h-10 w-36 bg-[var(--border-subtle)] rounded-xl" />
            <div className="h-10 w-36 bg-[var(--border-subtle)] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.novel) {
    return (
      <div className="detail-stage">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-10 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-main)] flex items-center justify-center mx-auto shadow-xs">
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
          <span>← BACK TO ARCHIVE CATALOG</span>
          <span className="sr-only">Back to Library</span>
        </button>
        <span className="mono-xs text-[var(--text-muted)] truncate max-w-full">
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
          <button
            onClick={() => {
              if (chapters.length > 0) {
                onSelectChapter(novel, chapters[0]);
              } else if (onOpenUploadChapter) {
                onOpenUploadChapter(novel);
              }
            }}
            onMouseEnter={preloadReaderView}
            onFocus={preloadReaderView}
            onPointerDown={preloadReaderView}
            className="btn btn-lg btn-primary cursor-pointer active:scale-[0.96] hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-full shadow-md hover:shadow-lg"
            aria-label={chapters.length > 0 ? 'Start Listening (Ch. 1)' : 'Add Chapter'}
          >
            <span className="dot" aria-hidden="true" />
            <span>{chapters.length > 0 ? 'LISTEN' : 'ADD CHAPTER'}</span>
            <span className="sr-only">{chapters.length > 0 ? 'Start Listening (Ch. 1)' : 'Add Chapter'}</span>
          </button>

          <button
            onClick={() => {
              if (chapters.length > 0) {
                onSelectChapter(novel, chapters[0]);
              } else if (onOpenUploadChapter) {
                onOpenUploadChapter(novel);
              }
            }}
            onMouseEnter={preloadReaderView}
            onFocus={preloadReaderView}
            onPointerDown={preloadReaderView}
            className="btn btn-lg cursor-pointer active:scale-[0.96] hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-full shadow-xs hover:shadow-md"
            aria-label={chapters.length > 0 ? 'Open Reader' : 'Upload Manuscript'}
          >
            <span className="dot" aria-hidden="true" />
            <span>{chapters.length > 0 ? 'OPEN READER' : 'UPLOAD MANUSCRIPT'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('cast');
              setTimeout(() => {
                const el = document.getElementById('details-tabs-section') || document.querySelector('[role="tablist"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }}
            className="btn btn-lg cursor-pointer active:scale-[0.96] hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-full shadow-xs hover:shadow-md"
            aria-label="Voice Studio"
          >
            <span className="dot" aria-hidden="true" />
            <span>VOICE STUDIO</span>
          </button>

          <button
            className={`btn btn-lg cursor-pointer active:scale-[0.96] hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-full shadow-xs hover:shadow-md ${
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
              className="btn btn-lg cursor-pointer active:scale-[0.96] hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-full shadow-xs hover:shadow-md"
              aria-label="Upload Chapter"
            >
              <span className="dot" aria-hidden="true" />
              <span>UPLOAD CHAPTER</span>
            </button>
          )}
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

        {/* Tab 2: Cast Panel (Voice Synthesis Studio Parity) */}
        <section
          id="tab-panel-cast"
          role="tabpanel"
          aria-label="Character Cast"
          className={`tab-content-panel ${activeTab === 'cast' ? 'active' : ''}`}
          style={{ display: activeTab === 'cast' ? 'block' : 'none' }}
        >
          <div className="studio-card-container">
            {/* Studio Header */}
            <div className="studio-header">
              <div className="flex items-center gap-3">
                <span className="brand-symbol" />
                <span className="font-mono text-xs sm:text-[13px] font-bold text-[var(--text-main)]">
                  VOICE SYNTHESIS STUDIO // ENSEMBLE &amp; TIMBRE
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="boxed-btn px-2.5 py-1 text-[11px] font-mono cursor-pointer rounded-lg hover:border-[var(--text-main)] active:scale-95 transition-all shadow-xs"
                aria-label="Close Voice Studio"
              >
                CLOSE [×]
              </button>
            </div>

            {/* Sub-Navigation Tabs */}
            <nav className="tabs-bar">
              <button
                type="button"
                onClick={() => setStudioTab('cast')}
                className={`tab-btn ${studioTab === 'cast' ? 'active' : ''}`}
                data-tab="cast"
              >
                CAST ({characters.length})
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('voices')}
                className={`tab-btn ${studioTab === 'voices' ? 'active' : ''}`}
                data-tab="voices"
              >
                VOICES
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('settings')}
                className={`tab-btn ${studioTab === 'settings' ? 'active' : ''}`}
                data-tab="settings"
              >
                SETTINGS
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('generate')}
                className={`tab-btn ${studioTab === 'generate' ? 'active' : ''}`}
                data-tab="generate"
              >
                GENERATE
              </button>
            </nav>

            <div className="studio-body">
              {/* Persistent Synthesis Progress Banner (Section 9.4 Compliant) */}
              <section className="synthesis-banner-box">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="mono-xs font-semibold text-[var(--text-main)]">
                    SYNTHESIS STATUS // {novel.title.toUpperCase()}
                  </span>
                  <span className="badge">
                    {/* Section 9.4: Neutral dot when ready/complete, signal dot strictly when synthesizing */}
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)]" />
                    <span>AUDIO ENSEMBLE READY</span>
                  </span>
                </div>

                <div className="synthesis-progress-track">
                  <div className="synthesis-progress-fill" style={{ width: '100%' }} />
                </div>

                <div className="flex justify-between items-center flex-wrap gap-2 mono-xs">
                  <span className="text-[var(--text-muted)]">
                    PROGRESS: 100% COMPLETE // {characters.length} OF {characters.length} VOICES ASSIGNED
                  </span>
                  <span className="text-[var(--text-main)]">
                    MULTI-VOICE ENSEMBLE // 48KHZ READY
                  </span>
                </div>
              </section>

              {/* Sub-Tab 1: Cast */}
              {studioTab === 'cast' && (
                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <span className="mono-xs text-[var(--text-muted)]">// CHARACTER VOICE ASSIGNMENTS</span>
                    <button
                      type="button"
                      className="boxed-btn px-3 py-1 text-[11px] font-mono cursor-pointer flex items-center gap-1.5 rounded-full active:scale-95 transition-all shadow-xs hover:scale-105"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)]" />
                      <span>+ ADD CHARACTER</span>
                    </button>
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
                                <span>MODEL:</span>
                                <span className="text-[var(--text-main)] font-semibold">{charVoice}</span>
                              </div>
                              <div>PITCH OFFSET: +0.00 ST</div>
                              <div>CADENCE PACE: 1.00×</div>
                              <div>
                                STATUS: <span className="text-[var(--text-main)]">● ASSIGNED</span>
                              </div>
                              {char.sample_quote && (
                                <div className="italic font-serif text-xs text-[var(--text-sub)] line-clamp-2 pt-2 mt-1 border-t border-[var(--border-subtle)]">
                                  &ldquo;{char.sample_quote}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Voices */}
              {studioTab === 'voices' && (
                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <span className="mono-xs text-[var(--text-muted)]">// NEURAL VOICE LIBRARY</span>
                    <span className="mono-xs text-[var(--text-sub)]">5 ARCHIVED MODELS</span>
                  </div>

                  <div className="roster-grid">
                    {ARCHIVED_MODELS.map((m) => (
                      <div key={m.id} className="character-card">
                        <div className="char-header-row">
                          <span className="char-name">{m.id}</span>
                          <span className="char-role-badge">{m.role}</span>
                        </div>
                        <div className="char-traits-list">
                          <div>TIMBRE: {m.timbre}</div>
                          <div>FREQUENCY: {m.freq}</div>
                          <div className="pt-2 mt-1 border-t border-[var(--border-subtle)] flex items-center justify-between">
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">STATUS: REGISTERED</span>
                            <span className="text-[10px] text-[var(--text-main)] font-mono font-bold">● ACTIVE</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Settings */}
              {studioTab === 'settings' && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 flex flex-col gap-5">
                  <span className="mono-xs text-[var(--text-muted)] block">
                    // SYNTHESIS TIMBRE PARAMETERS
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div>
                      <label className="mono-xs text-[var(--text-sub)] block mb-2">
                        EMOTIONAL RANGE [78%]
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="78"
                        className="w-full accent-[var(--accent)] cursor-pointer"
                        aria-label="Emotional Range"
                      />
                    </div>
                    <div>
                      <label className="mono-xs text-[var(--text-sub)] block mb-2">
                        BREATH PHONEME RATE [42%]
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="42"
                        className="w-full accent-[var(--accent)] cursor-pointer"
                        aria-label="Breath Phoneme Rate"
                      />
                    </div>
                    <div>
                      <label className="mono-xs text-[var(--text-sub)] block mb-2">
                        ACOUSTIC REVERB [15%]
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="15"
                        className="w-full accent-[var(--accent)] cursor-pointer"
                        aria-label="Acoustic Reverb"
                      />
                    </div>
                    <div>
                      <label className="mono-xs text-[var(--text-sub)] block mb-2">
                        PACING MULTIPLIER [1.00×]
                      </label>
                      <input
                        type="range"
                        min="80"
                        max="140"
                        defaultValue="100"
                        className="w-full accent-[var(--accent)] cursor-pointer"
                        aria-label="Pacing Multiplier"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Generate */}
              {studioTab === 'generate' && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 flex flex-col gap-4 rounded-2xl shadow-sm">
                  <span className="mono-xs text-[var(--text-muted)] block">
                    // CHAPTER AUDIO GENERATION
                  </span>
                  <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                    Synthesize multi-voice audio for uploaded chapters. Audio segments are generated according to character voice assignments above.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => chapters.length > 0 && onSelectChapter(novel, chapters[0])}
                      className="boxed-btn-primary px-4 py-2 text-xs font-mono cursor-pointer flex items-center gap-2 rounded-full active:scale-[0.96] hover:scale-[1.03] hover:-translate-y-0.5 transition-all shadow-md"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>GENERATE AUDIO FOR CH. 01</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                const progressPercent = typeof ch.progress_percent === 'number'
                  ? ch.progress_percent
                  : (chDuration > 0 && typeof ch.playback_progress_ms === 'number'
                    ? Math.min(100, Math.round((ch.playback_progress_ms / chDuration) * 100))
                    : (ch.status === 'completed' ? 100 : null));
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
                    {progressPercent !== null && (
                      <span className="mono-xs text-[var(--text-muted)] text-[10px] hidden sm:inline">
                        {progressPercent === 100 ? 'COMPLETED' : `${progressPercent}%`}
                      </span>
                    )}
                    <button
                      className="btn btn-sm btn-primary rounded-full active:scale-95 transition-all shadow-xs hover:scale-105"
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
    </div>
  );
}
