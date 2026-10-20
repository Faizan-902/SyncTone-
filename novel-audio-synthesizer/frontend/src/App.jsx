import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAudioSync } from './hooks/useAudioSync';
import { usePlaybackProgress } from './hooks/usePlaybackProgress';
import { useSynthesisProgress } from './hooks/useSynthesisProgress';
import { api } from './services/api';

import NovelCatalog from './components/NovelCatalog';
import NovelDetails from './components/NovelDetails';
import ReaderView from './components/ReaderView';
import AudioPlayer from './components/AudioPlayer';
import CharacterRoster from './components/CharacterRoster';
import SynthesisProgressBar from './components/SynthesisProgressBar';
import AuthModal from './components/AuthModal';
import AddNovelModal from './components/AddNovelModal';
import UploadChapterModal from './components/UploadChapterModal';
import SettingsModal from './components/SettingsModal';

const EMPTY_ARRAY = [];

export default function App() {
  const { user, role, isAuthenticated, isWriterOrAdmin, logout } = useAuth();

  // Navigation View: 'catalog' | 'details' | 'reader'
  const [view, setView] = useState('catalog');
  const [selectedNovelId, setSelectedNovelId] = useState(null);
  const [currentNovel, setCurrentNovel] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);

  // Chapter prose and manifest data
  const [chapterSegments, setChapterSegments] = useState(EMPTY_ARRAY);
  const [chapterManifest, setChapterManifest] = useState(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [chapterError, setChapterError] = useState(null);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showAddNovelModal, setShowAddNovelModal] = useState(false);
  const [showUploadChapterModal, setShowUploadChapterModal] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);

  // Audio Synchronization Hook (60fps loop with binary search)
  const audioSync = useAudioSync(chapterManifest?.timeline ?? EMPTY_ARRAY);

  // 4NF Playback Progress Hook (auto-resume & throttled persistence)
  const playbackProgress = usePlaybackProgress({
    novelId: currentNovel?.id,
    chapterId: currentChapter?.id,
    user,
    audioSync,
    timeline: chapterManifest?.timeline ?? EMPTY_ARRAY,
  });

  // Real-time WebSocket Synthesis Progress Hook
  const synthesisProgress = useSynthesisProgress(currentChapter?.id);

  // Fetch status on mount
  useEffect(() => {
    api.status.models().then(setModelStatus).catch(() => {});
  }, []);

  // Open novel details
  const handleSelectNovel = (novelId) => {
    setSelectedNovelId(novelId);
    setView('details');
  };

  // Open chapter in Reader
  const handleSelectChapter = async (novel, chapter) => {
    setCurrentNovel(novel);
    setCurrentChapter(chapter);
    setView('reader');
    setIsLoadingChapter(true);
    setChapterError(null);
    setChapterSegments(EMPTY_ARRAY);
    setChapterManifest(null);

    try {
      // 1. Fetch chapter details & MongoDB segments
      const details = await api.chapters.get(chapter.id);
      let segments = details.segments || [];
      if (segments.length === 0 && (details.status === 'draft' || chapter?.status === 'draft' || !details.status)) {
        try {
          const parsedRes = await api.chapters.parse(chapter.id);
          if (parsedRes?.segments) {
            segments = parsedRes.segments;
          }
        } catch (_) {}
      }
      setChapterSegments(segments);

      // 2. Determine manifest and audio stream URL
      // Adheres to Rule 2: stream URL mapping
      let manifest = details.manifest || null;
      if (!manifest) {
        try {
          manifest = await api.chapters.getManifest(chapter.id);
        } catch (_) {}
      }

      if (manifest) {
        const streamUrl =
          manifest.audio_url ||
          manifest.audio_stream_url ||
          `/api/stream/${chapter.id}`;
        setChapterManifest({
          ...manifest,
          audio_stream_url: streamUrl,
        });
      } else {
        // Fallback placeholder manifest with local stream proxy
        setChapterManifest({
          audio_stream_url: `/api/stream/${chapter.id}`,
          total_duration_ms: chapter.total_duration_ms || 0,
          timeline: segments.map((s, idx) => ({
            order: s.order || idx + 1,
            segment_id: s.segment_id !== undefined ? s.segment_id : idx + 1,
            start_ms: s.start_ms || 0,
            end_ms: s.end_ms || 0,
            character_id: s.character_id,
            voice_id: s.voice_id || 'en-GB-RyanNeural',
          })),
        });
      }
    } catch (err) {
      setChapterError(err.message || 'Failed to load chapter audio and segments.');
    } finally {
      setIsLoadingChapter(false);
    }
  };

  // Trigger re-synthesis of chapter
  const handleSynthesizeCurrentChapter = async () => {
    if (!currentChapter?.id) return;
    try {
      if (chapterSegments.length === 0) {
        const parsedRes = await api.chapters.parse(currentChapter.id);
        if (parsedRes?.segments) {
          setChapterSegments(parsedRes.segments);
        }
      }
      const synthRes = await api.chapters.synthesize(currentChapter.id);
      if (synthRes?.manifest) {
        setChapterManifest({
          ...synthRes.manifest,
          audio_stream_url: `${synthRes.manifest.audio_url || `/api/stream/${currentChapter.id}`}?t=${Date.now()}`,
        });
      }
      try {
        const refreshed = await api.chapters.get(currentChapter.id);
        if (refreshed?.segments) {
          setChapterSegments(refreshed.segments);
        }
      } catch (_) {}
    } catch (err) {
      setChapterError(err.message || 'Failed to trigger chapter synthesis.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Global Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & View Switcher */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setView('catalog');
                setShowRoster(false);
              }}
              className="flex items-center gap-2 group text-left outline-none"
            >
              <span className="text-2xl transform group-hover:scale-110 transition duration-300">
                🎙️
              </span>
              <div>
                <span className="text-lg font-black tracking-tight text-gray-900 group-hover:text-indigo-600 transition">
                  SyncTone
                </span>
                <span className="hidden sm:inline-block ml-1.5 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                  Dual-TTS 4NF
                </span>
              </div>
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="hidden md:flex items-center gap-2 text-xs text-gray-500 font-medium">
              <button
                onClick={() => setView('catalog')}
                className={`hover:text-indigo-600 transition ${
                  view === 'catalog' ? 'text-indigo-600 font-bold' : ''
                }`}
              >
                Library
              </button>
              {view !== 'catalog' && currentNovel && (
                <>
                  <span>/</span>
                  <button
                    onClick={() => setView('details')}
                    className={`hover:text-indigo-600 transition line-clamp-1 max-w-[140px] ${
                      view === 'details' ? 'text-indigo-600 font-bold' : ''
                    }`}
                  >
                    {currentNovel.title}
                  </button>
                </>
              )}
              {view === 'reader' && currentChapter && (
                <>
                  <span>/</span>
                  <span className="text-gray-900 font-bold line-clamp-1 max-w-[140px]">
                    {currentChapter.title}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {view === 'reader' && (
              <button
                onClick={() => setShowRoster(!showRoster)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 ${
                  showRoster
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>👥</span>
                <span className="hidden sm:inline">Cast Roster</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition"
              title="TTS Engines & Status"
            >
              ⚙️
            </button>

            {/* User Session State */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-gray-900">{user.username}</div>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                    {role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-indigo-600 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setShowAuthModal(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Playback Resume Toast */}
        {view === 'reader' && playbackProgress.resumedAtMs !== null && (
          <div className="mb-4 p-3.5 bg-indigo-900 text-white rounded-2xl shadow-lg flex items-center justify-between text-xs animate-slideDown">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⏱️</span>
              <span>
                Resumed playback from previous session at{' '}
                <strong>
                  {Math.floor(playbackProgress.resumedAtMs / 60000)}:
                  {Math.floor((playbackProgress.resumedAtMs % 60000) / 1000)
                    .toString()
                    .padStart(2, '0')}
                </strong>
                .
              </span>
            </div>
            <button
              onClick={playbackProgress.dismissResumeBanner}
              className="text-indigo-200 hover:text-white px-2 py-1 rounded"
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* Live Synthesis Progress */}
        {view === 'reader' && synthesisProgress.status !== 'idle' && (
          <div className="mb-6">
            <SynthesisProgressBar
              status={synthesisProgress.status}
              percentComplete={synthesisProgress.percentComplete}
              currentSegment={synthesisProgress.currentSegment}
              totalSegments={synthesisProgress.totalSegments}
              message={synthesisProgress.message}
              error={synthesisProgress.error}
              isConnected={synthesisProgress.isConnected}
              onDismiss={synthesisProgress.reset}
            />
          </div>
        )}

        {/* VIEW 1: NOVEL CATALOG */}
        {view === 'catalog' && (
          <NovelCatalog
            onSelectNovel={handleSelectNovel}
            onOpenAddNovel={() => setShowAddNovelModal(true)}
          />
        )}

        {/* VIEW 2: NOVEL DETAILS */}
        {view === 'details' && selectedNovelId && (
          <NovelDetails
            novelId={selectedNovelId}
            onBack={() => setView('catalog')}
            onSelectChapter={handleSelectChapter}
            onOpenUploadChapter={(novel) => {
              setCurrentNovel(novel);
              setShowUploadChapterModal(true);
            }}
          />
        )}

        {/* VIEW 3: SYNCHRONIZED READER */}
        {view === 'reader' && (
          <div className="space-y-6 pb-28">
            {/* Chapter Header Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold mb-1">
                  <span>{currentNovel?.title || 'SyncTone Novel'}</span>
                  <span>•</span>
                  <span>Chapter {currentChapter?.chapter_number || 1}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {currentChapter?.title || 'Chapter Reading'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {chapterSegments.length} segments • Click any dialogue or narration to seek
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {isWriterOrAdmin && (
                  <button
                    onClick={handleSynthesizeCurrentChapter}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>🎙️</span> Re-Synthesize
                  </button>
                )}
                <button
                  onClick={() => setView('details')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
                >
                  Directory
                </button>
              </div>
            </div>

            {/* Error Message */}
            {chapterError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                ❌ {chapterError}
              </div>
            )}

            {/* Loading Indicator */}
            {isLoadingChapter ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 text-sm animate-pulse space-y-3">
                <div className="text-3xl">📖</div>
                <p>Loading chapter prose and synchronized timeline...</p>
              </div>
            ) : (
              /* Synchronized 60fps Reader Text View */
              <ReaderView
                segments={chapterSegments}
                activeSegmentId={audioSync.activeSegmentId}
                onSegmentClick={(segmentId) => {
                  audioSync.seekToSegment(segmentId);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Docked Sticky Bottom Audio Player */}
      {view === 'reader' && chapterManifest && (
        <AudioPlayer
          audioRef={audioSync.audioRef}
          audioUrl={chapterManifest.audio_stream_url}
          isPlaying={audioSync.isPlaying}
          currentTimeMs={audioSync.currentTimeMs}
          totalDurationMs={chapterManifest.total_duration_ms || currentChapter?.total_duration_ms || 0}
          onToggle={audioSync.toggle}
          onSetPlaybackRate={audioSync.setPlaybackRate}
          onSeek={audioSync.seekToTimeMs}
          onPlay={audioSync.handlePlay}
          onPause={audioSync.handlePause}
          onEnded={audioSync.handleEnded}
          onLoadedMetadata={audioSync.handleLoadedMetadata}
        />
      )}

      {/* Slide-out Character Cast Roster Drawer */}
      {showRoster && (
        <CharacterRoster
          chapterId={currentChapter?.id || ''}
          segments={chapterSegments}
          onClose={() => setShowRoster(false)}
          onVoiceChange={(charId, newVoiceId) => {
            setChapterSegments((prev) =>
              prev.map((s) =>
                s.character_id === charId || s.speaker_id === charId
                  ? { ...s, assigned_voice_id: newVoiceId, voice_id: newVoiceId }
                  : s
              )
            );
          }}
        />
      )}

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Add Novel Modal (Writer / Admin Role Gated) */}
      <AddNovelModal
        isOpen={showAddNovelModal}
        onClose={() => setShowAddNovelModal(false)}
        onNovelCreated={(newNovel) => {
          setSelectedNovelId(newNovel.id);
          setView('details');
        }}
      />

      {/* Upload Chapter Modal */}
      <UploadChapterModal
        isOpen={showUploadChapterModal}
        novel={currentNovel}
        onClose={() => setShowUploadChapterModal(false)}
        onChapterUploaded={(newChapter) => {
          handleSelectChapter(currentNovel, newChapter);
        }}
      />

      {/* TTS Settings Modal */}
      {showSettings && (
        <SettingsModal
          modelStatus={modelStatus}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
