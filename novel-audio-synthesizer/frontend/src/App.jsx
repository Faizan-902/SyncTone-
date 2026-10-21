import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAudioSync } from './hooks/useAudioSync';
import { usePlaybackProgress } from './hooks/usePlaybackProgress';
import { useSynthesisProgress } from './hooks/useSynthesisProgress';
import { api } from './services/api';

import SidebarNav from './components/SidebarNav';
import TopHeader from './components/TopHeader';
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
  const { isWriterOrAdmin } = useAuth();

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
  const { user } = useAuth();
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
      const segments = details.segments || [];
      setChapterSegments(segments);

      // 2. Determine manifest and audio stream URL
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
      await api.chapters.synthesize(currentChapter.id);
    } catch (err) {
      setChapterError(err.message || 'Failed to trigger chapter synthesis.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-300">
      {/* 1. Desktop Left Rail & Mobile Bottom Bar Navigation */}
      <SidebarNav
        currentView={view}
        onNavigate={(newView) => {
          setView(newView);
          setShowRoster(false);
        }}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setShowAuthModal(true);
        }}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAddNovel={() => setShowAddNovelModal(true)}
      />

      {/* 2. Main Content Wrapper (Offset for desktop left rail) */}
      <div className="md:pl-20 flex-1 flex flex-col min-h-screen">
        {/* Global Glass Top Header */}
        <TopHeader
          view={view}
          currentNovel={currentNovel}
          currentChapter={currentChapter}
          onNavigate={(newView) => {
            setView(newView);
            setShowRoster(false);
          }}
          showRoster={showRoster}
          onToggleRoster={() => setShowRoster(!showRoster)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setShowAuthModal(true);
          }}
        />

        {/* Main Content Body Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32">
          {/* Playback Resume Banner */}
          {view === 'reader' && playbackProgress.resumedAtMs !== null && (
            <div className="mb-4 p-4 bg-brand-950 border border-brand-500/40 text-brand-100 rounded-2xl shadow-xl flex items-center justify-between text-xs animate-slideDown">
              <div className="flex items-center gap-3">
                <span className="text-xl">⏱️</span>
                <span>
                  Resumed playback from previous session at{' '}
                  <strong className="text-white font-mono">
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
                className="text-brand-300 hover:text-white px-3 py-1 bg-brand-900/60 hover:bg-brand-900 rounded-xl transition"
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
              <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-300">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">
                    <span>{currentNovel?.title || 'SyncTone Novel'}</span>
                    <span>•</span>
                    <span>Chapter {currentChapter?.chapter_number || 1}</span>
                  </div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] font-display tracking-tight">
                    {currentChapter?.title || 'Chapter Reading'}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {chapterSegments.length} segments • Click any dialogue or narration to seek
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {isWriterOrAdmin && (
                    <button
                      onClick={handleSynthesizeCurrentChapter}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
                    >
                      <span>🎙️</span> Re-Synthesize
                    </button>
                  )}
                  <button
                    onClick={() => setView('details')}
                    className="px-4 py-2.5 bg-[var(--bg-surface)] hover:border-brand-500 text-[var(--text-main)] text-xs font-bold rounded-xl border border-[var(--border-subtle)] transition"
                  >
                    Directory
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {chapterError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-2xl shadow-sm">
                  ❌ {chapterError}
                </div>
              )}

              {/* Loading Indicator */}
              {isLoadingChapter ? (
                <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] p-12 text-center text-[var(--text-muted)] text-sm animate-pulse space-y-3 shadow-xl">
                  <div className="text-4xl">📖</div>
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

        {/* Docked Floating Glass Bottom Audio Player */}
        {view === 'reader' && chapterManifest && (
          <AudioPlayer
            audioRef={audioSync.audioRef}
            audioUrl={chapterManifest.audio_stream_url}
            isPlaying={audioSync.isPlaying}
            currentTimeMs={audioSync.currentTimeMs}
            totalDurationMs={chapterManifest.total_duration_ms || currentChapter?.total_duration_ms || 0}
            onToggle={audioSync.toggle}
            onSetPlaybackRate={audioSync.setPlaybackRate}
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

        {/* Auth Modal (Login / Register / Guest Access) */}
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
    </div>
  );
}
