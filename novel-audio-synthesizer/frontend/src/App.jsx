import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import {
  BrowserRouter,
  useInRouterContext,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAudioSync } from './hooks/useAudioSync';
import { usePlaybackProgress } from './hooks/usePlaybackProgress';
import { useSynthesisProgress } from './hooks/useSynthesisProgress';
import { api } from './services/api';

import SidebarNav from './components/SidebarNav';
import TopHeader from './components/TopHeader';
import NovelCatalog from './components/NovelCatalog';
import ErrorBoundary from './components/ErrorBoundary';
import { IconClock, IconX } from './components/icons';
import { executeViewTransition } from './tokens/motion';

// Lazy route-level views
const NovelDetails = React.lazy(() => import('./components/NovelDetails'));
const ReaderView = React.lazy(() => import('./components/ReaderView'));
const UploadView = React.lazy(() => import('./components/UploadView'));
const ProfileView = React.lazy(() => import('./components/ProfileView'));
const AdminView = React.lazy(() => import('./components/AdminView'));
const AudioPlayer = React.lazy(() => import('./components/AudioPlayer'));
const SynthesisProgressBar = React.lazy(() => import('./components/SynthesisProgressBar'));

// Lazy modals
const AuthModal = React.lazy(() => import('./components/AuthModal'));
const AddNovelModal = React.lazy(() => import('./components/AddNovelModal'));
const UploadChapterModal = React.lazy(() => import('./components/UploadChapterModal'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const CharacterRoster = React.lazy(() => import('./components/CharacterRoster'));

// Route & modal preloader triggers for hover/focus/pointerdown
export const preloadNovelDetails = () => import('./components/NovelDetails');
export const preloadReaderView = () => import('./components/ReaderView');
export const preloadAuthModal = () => import('./components/AuthModal');
export const preloadAddNovelModal = () => import('./components/AddNovelModal');
export const preloadUploadChapterModal = () => import('./components/UploadChapterModal');
export const preloadSettingsModal = () => import('./components/SettingsModal');
export const preloadCharacterRoster = () => import('./components/CharacterRoster');

const EMPTY_ARRAY = [];

function RouteSkeleton() {
  return (
    <div className="w-full flex-1 min-h-[50vh] bg-[var(--bg-page)]" aria-busy="true" />
  );
}

function ModalSkeleton() {
  return null;
}

function SimError() {
  throw new Error('Simulated system fault for visual audit');
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isAuthenticated, isWriterOrAdmin } = useAuth();

  // Selected Novel & Chapter state
  const [selectedNovelId, setSelectedNovelId] = useState(null);
  const [currentNovel, setCurrentNovel] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);

  // Chapter prose and manifest data
  const [chapterSegments, setChapterSegments] = useState(EMPTY_ARRAY);
  const [chapterManifest, setChapterManifest] = useState(null);
  const [hasStudioAudio, setHasStudioAudio] = useState(false);
  const [novelChapters, setNovelChapters] = useState(EMPTY_ARRAY);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [chapterError, setChapterError] = useState(null);

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showAddNovelModal, setShowAddNovelModal] = useState(false);
  const [showUploadChapterModal, setShowUploadChapterModal] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [useTtsSanitizer, setUseTtsSanitizer] = useState(false);
  const [defaultParserEngine, setDefaultParserEngine] = useState(() => {
    try {
      return localStorage.getItem('synctone_parser_engine') || 'heuristic';
    } catch (_) {
      return 'heuristic';
    }
  });

  const handleSelectParserEngine = useCallback((engine) => {
    setDefaultParserEngine(engine);
    try {
      localStorage.setItem('synctone_parser_engine', engine);
    } catch (_) {}
  }, []);

  const handleProbeStatus = useCallback(async () => {
    try {
      const res = await api.status.models({ probe: true });
      if (res) setModelStatus(res);
      return res;
    } catch (_) {
      return null;
    }
  }, []);

  // Sanitized timeline when TTS Clean is active
  const [sanitizedTimeline, setSanitizedTimeline] = useState(null);
  useEffect(() => {
    if (!useTtsSanitizer || !chapterManifest?.timeline) {
      setSanitizedTimeline(null);
      return;
    }
    let cancelled = false;
    import('./utils/ttsSanitizer').then(({ sanitizeSegmentsWithTtsDomCleaner }) => {
      if (!cancelled) {
        setSanitizedTimeline(sanitizeSegmentsWithTtsDomCleaner(chapterManifest.timeline));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chapterManifest?.timeline, useTtsSanitizer]);

  const effectiveTimeline = useMemo(() => {
    if (useTtsSanitizer && sanitizedTimeline) return sanitizedTimeline;
    return chapterManifest?.timeline ?? EMPTY_ARRAY;
  }, [chapterManifest?.timeline, useTtsSanitizer, sanitizedTimeline]);

  // Audio Synchronization Hook with chapter auto-advance callback
  const onChapterEndedRef = useRef(null);
  const handleChapterEnded = useCallback(() => {
    onChapterEndedRef.current?.();
  }, []);

  const audioSync = useAudioSync(effectiveTimeline, { onChapterEnded: handleChapterEnded });

  // Playback Progress Hook (auto-resume & throttled persistence)
  const playbackProgress = usePlaybackProgress({
    novelId: currentNovel?.id,
    chapterId: currentChapter?.id,
    user,
    audioSync,
    timeline: effectiveTimeline,
  });

  // Real-time WebSocket Synthesis Progress Hook
  const synthesisProgress = useSynthesisProgress(currentChapter?.id);

  // Fetch TTS / LLM model engine status when settings is opened or on mount
  useEffect(() => {
    api.status.models().then(setModelStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (showSettings) {
      api.status
        .models()
        .then((res) => setModelStatus(res))
        .catch(() => {});
    }
  }, [showSettings]);

  // Derive current view from location.pathname
  const pathname = location.pathname;
  let view = 'catalog';
  let routeNovelId = null;
  let routeChapterId = null;

  if (pathname.startsWith('/novel/') || pathname.startsWith('/novels/')) {
    view = 'details';
    routeNovelId = pathname.replace(/^\/novels?\//, '').split('/')[0];
  } else if (pathname.startsWith('/reader/')) {
    view = 'reader';
    routeChapterId = pathname.replace('/reader/', '').split('/')[0];
  } else if (pathname === '/upload') {
    view = 'upload';
  } else if (pathname === '/profile') {
    view = 'profile';
  } else if (pathname === '/admin') {
    view = 'admin';
  } else if (pathname === '/settings') {
    view = 'catalog';
  } else if (pathname.startsWith('/test/')) {
    view = 'test';
  }

  // Safe scroll helper
  const safeScrollToTop = (behavior = 'instant') => {
    try {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior });
      }
    } catch (_) {}
  };

  // Centralized navigation handler with real routing
  const handleNavigate = useCallback((targetView, paramId = null) => {
    executeViewTransition(() => {
      setShowRoster(false);
      safeScrollToTop('instant');

      if (targetView === 'catalog') {
        setSelectedNovelId(null);
        navigate('/');
      } else if (targetView === 'details') {
        const id = paramId || selectedNovelId || currentNovel?.id;
        if (id) {
          setSelectedNovelId(id);
          navigate(`/novel/${id}`);
        } else {
          navigate('/');
        }
      } else if (targetView === 'reader') {
        const chId = paramId || currentChapter?.id;
        if (chId) {
          navigate(`/reader/${chId}`);
        }
      } else if (targetView === 'upload') {
        navigate('/upload');
      } else if (targetView === 'profile') {
        navigate('/profile');
      } else if (targetView === 'admin') {
        navigate('/admin');
      } else if (targetView === 'settings') {
        setShowSettings(true);
        navigate('/settings');
      }
    });
  }, [navigate, selectedNovelId, currentNovel?.id, currentChapter?.id]);

  // Sync /settings route with settings modal and deep-link modal triggers
  useEffect(() => {
    if (pathname === '/settings') {
      setShowSettings(true);
    }
    const params = new URLSearchParams(location.search);
    const modal = params.get('modal');
    if (modal === 'auth' || params.has('auth')) {
      setAuthMode(params.get('auth') === 'register' ? 'register' : 'login');
      setShowAuthModal(true);
    } else if (modal === 'add-novel') {
      setShowAddNovelModal(true);
    } else if (modal === 'upload-chapter') {
      setShowUploadChapterModal(true);
    } else if (modal === 'settings') {
      setShowSettings(true);
    } else if (modal === 'roster') {
      setShowRoster(true);
    }
  }, [pathname, location.search]);

  // Sync routeNovelId with selectedNovelId
  useEffect(() => {
    if (view === 'details' && routeNovelId && routeNovelId !== selectedNovelId) {
      setSelectedNovelId(routeNovelId);
    }
  }, [view, routeNovelId, selectedNovelId]);

  // Load chapter helper (used for route navigation and deep links)
  const loadChapterById = useCallback(async (chapterId, novel = null) => {
    setIsLoadingChapter(true);
    setChapterError(null);
    setChapterSegments(EMPTY_ARRAY);
    setChapterManifest(null);

    try {
      // 0. Fetch novel chapter list for Next Chapter navigation
      if (novel?.id) {
        api.novels
          .get(novel.id)
          .then((nData) => {
            if (Array.isArray(nData?.chapters)) {
              setNovelChapters(nData.chapters);
            }
          })
          .catch(() => {});
      }

      const details = await api.chapters.get(chapterId);
      setCurrentChapter((prev) => ({ ...(prev || {}), ...details }));
      const studioReady = Boolean(details.has_studio_audio);
      setHasStudioAudio(studioReady);
      if (!studioReady && audioSync.playbackMode === 'studio') {
        audioSync.togglePlaybackMode('tts');
      }

      if (!novel && details.novel_id) {
        try {
          const fetchedNovel = await api.novels.get(details.novel_id);
          setCurrentNovel(fetchedNovel);
          setSelectedNovelId(fetchedNovel.id);
          if (Array.isArray(fetchedNovel?.chapters)) {
            setNovelChapters(fetchedNovel.chapters);
          }
        } catch (_) {}
      } else if (novel) {
        setCurrentNovel(novel);
        setSelectedNovelId(novel.id);
      }

      let segments = details.segments || [];
      if (segments.length === 0 && (details.status === 'draft' || !details.status)) {
        try {
          const parsedRes = await api.chapters.parse(chapterId);
          if (parsedRes?.segments) {
            segments = parsedRes.segments;
          }
        } catch (_) {}
      }
      setChapterSegments(segments);

      let manifest = details.manifest || null;
      if (!manifest) {
        try {
          manifest = await api.chapters.getManifest(chapterId);
        } catch (_) {}
      }

      if (manifest) {
        const streamUrl =
          manifest.audio_url ||
          manifest.audio_stream_url ||
          `/api/stream/${chapterId}`;
        const enrichedTimeline = (manifest.timeline || []).map((t, idx) => {
          const seg =
            segments.find(
              (s) =>
                (s.segment_id !== undefined ? s.segment_id : s.order) ===
                (t.segment_id !== undefined ? t.segment_id : t.order)
            ) || segments[idx];
          return {
            ...t,
            text: t.text || seg?.text || '',
            speaker_name: t.speaker_name || seg?.speaker_name || '',
            voice_id: t.voice_id || seg?.voice_id || 'en-GB-RyanNeural',
            character_id: t.character_id || seg?.character_id || 'narrator',
            type: t.type || seg?.type || 'narration',
          };
        });
        setChapterManifest({
          ...manifest,
          audio_stream_url: streamUrl,
          timeline: enrichedTimeline,
        });
      } else {
        setChapterManifest({
          audio_stream_url: `/api/stream/${chapterId}`,
          total_duration_ms: details.total_duration_ms || 0,
          timeline: segments.map((s, idx) => ({
            order: s.order || idx + 1,
            segment_id: s.segment_id !== undefined ? s.segment_id : idx + 1,
            start_ms: s.start_ms || 0,
            end_ms: s.end_ms || 0,
            character_id: s.character_id,
            voice_id: s.voice_id || 'en-GB-RyanNeural',
            text: s.text || '',
            speaker_name: s.speaker_name || '',
            type: s.type || 'narration',
          })),
        });
      }
    } catch (err) {
      setChapterError(err.message || 'Failed to load chapter audio and segments.');
    } finally {
      setIsLoadingChapter(false);
    }
  }, []);

  // Sync routeChapterId when navigating deep link to /reader/:chapterId
  useEffect(() => {
    if (view === 'reader' && routeChapterId) {
      if (currentChapter?.id !== routeChapterId) {
        loadChapterById(routeChapterId, currentNovel);
      }
    }
  }, [view, routeChapterId, currentChapter?.id, currentNovel, loadChapterById]);

  // Open novel details
  const handleSelectNovel = (novelId) => {
    setShowRoster(false);
    handleNavigate('details', novelId);
  };

  // Open chapter in Reader
  const handleSelectChapter = async (novel, chapter) => {
    executeViewTransition(() => {
      setCurrentNovel(novel);
      if (novel?.id) {
        setSelectedNovelId(novel.id);
      }
      setCurrentChapter(chapter);
      safeScrollToTop('instant');
      navigate(`/reader/${chapter.id}`);
    });
    loadChapterById(chapter.id, novel);
  };

  // Auto-advance to next chapter when current chapter completes
  useEffect(() => {
    onChapterEndedRef.current = () => {
      if (!currentChapter || novelChapters.length === 0) return;
      const idx = novelChapters.findIndex((c) => c.id === currentChapter.id);
      const nextCh =
        idx >= 0 && idx + 1 < novelChapters.length
          ? novelChapters[idx + 1]
          : novelChapters.find(
              (c) => Number(c.chapter_number) === Number(currentChapter.chapter_number) + 1
            );
      if (nextCh) {
        handleSelectChapter(currentNovel, nextCh);
      }
    };
  }, [currentChapter, novelChapters, currentNovel, handleSelectChapter]);

  // Seamless Archive Navigation: opens catalog and scrolls directly to library shelves
  const handleOpenArchive = useCallback(() => {
    const scrollToArchive = () => {
      const el = document.getElementById('archive-catalog') || document.querySelector('.volume-card') || document.querySelector('input[aria-label="Search novels"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };

    if (view === 'catalog') {
      if (!scrollToArchive()) {
        setTimeout(scrollToArchive, 100);
        setTimeout(scrollToArchive, 300);
      }
    } else {
      handleNavigate('catalog');
      setTimeout(scrollToArchive, 100);
      setTimeout(scrollToArchive, 300);
      setTimeout(scrollToArchive, 600);
    }
  }, [view, handleNavigate]);

  // Seamless Reader Launch: opens current chapter, or novel chapter 1, or flagship novel chapter 1
  const handleOpenReaderQuick = useCallback(async () => {
    if (currentChapter?.id) {
      handleNavigate('reader', currentChapter.id);
      return;
    }
    if (currentNovel?.id) {
      try {
        const nData = await api.novels.get(currentNovel.id);
        const ch1 = (nData.chapters || []).find((c) => c.chapter_number === 1) || nData.chapters?.[0];
        if (ch1) {
          handleSelectChapter(currentNovel, ch1);
          return;
        }
      } catch (_) {}
    }
    // Launch flagship volume with active audio
    try {
      const data = await api.novels.list();
      const targetNovel = (data.novels || []).find((n) => n.chapter_count > 0) || data.novels?.[0];
      if (targetNovel) {
        const nData = await api.novels.get(targetNovel.id);
        const ch1 = (nData.chapters || []).find((c) => c.chapter_number === 1) || nData.chapters?.[0];
        if (ch1) {
          handleSelectChapter(targetNovel, ch1);
          return;
        }
        handleNavigate('details', targetNovel.id);
        return;
      }
    } catch (_) {}
    handleNavigate('catalog');
  }, [currentChapter, currentNovel, handleNavigate, handleSelectChapter]);

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(typeof mode === 'string' ? mode : 'login');
    setShowAuthModal(true);
  };

  const handleNovelDeleted = (deletedId) => {
    if (selectedNovelId === deletedId) {
      setSelectedNovelId(null);
    }
    if (currentNovel?.id === deletedId) {
      setCurrentNovel(null);
      setCurrentChapter(null);
      setChapterSegments(EMPTY_ARRAY);
      setChapterManifest(null);
    }
    handleNavigate('catalog');
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
      const synthRes = await api.chapters.synthesize(currentChapter.id, audioSync.ttsEngine);
      const manifest = synthRes?.manifest || synthRes;
      if (manifest && (manifest.timeline || manifest.audio_url || manifest.total_duration_ms)) {
        setHasStudioAudio(true);
        setChapterManifest({
          ...manifest,
          audio_stream_url: `${manifest.audio_url || `/api/stream/${currentChapter.id}`}?t=${Date.now()}`,
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
    <ErrorBoundary friendlyMessage="Something unexpected happened. Please refresh the page.">
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-200">
        {/* Main Viewport Container */}
        <div className="flex-1 flex flex-col min-h-screen">
          <TopHeader
            view={view}
            currentNovel={currentNovel}
            currentChapter={currentChapter}
            onNavigate={handleNavigate}
            onOpenArchive={handleOpenArchive}
            onOpenReader={handleOpenReaderQuick}
            showRoster={showRoster}
            onToggleRoster={() => setShowRoster((prev) => !prev)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAuth={handleOpenAuth}
            onOpenAddNovel={() => setShowAddNovelModal(true)}
          />

          {/* Navigation Rail (Desktop) & Bottom Bar (Mobile) */}
          <SidebarNav
            currentView={view}
            onNavigate={handleNavigate}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAuth={handleOpenAuth}
            onOpenAddNovel={() => setShowAddNovelModal(true)}
          />

          {/* Content Body Area */}
          <main key={view} className={`flex-1 w-full motion-view-route ${view === 'reader' ? 'p-0' : 'px-4 sm:px-8 py-6'}`}>
            {/* Playback Resume Toast */}
            {view === 'reader' && playbackProgress.resumedAtMs !== null && (
              <div className="mx-4 sm:mx-8 mb-4 p-3.5 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] shadow-xl flex items-center justify-between text-xs animate-slideDown">
                <div className="flex items-center gap-2.5">
                  <IconClock className="w-4 h-4" />
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
                  className="p-1.5 rounded-full hover:bg-black/10 transition active:scale-95 cursor-pointer"
                  aria-label="Dismiss resume notification"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Live Synthesis Progress Banner */}
            {view === 'reader' && synthesisProgress.status !== 'idle' && (
              <Suspense fallback={null}>
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
              </Suspense>
            )}

            {/* TEST VIEWS */}
            {pathname === '/test/error-boundary' && (
              <ErrorBoundary friendlyMessage="Simulated system fault for visual audit.">
                <SimError />
              </ErrorBoundary>
            )}

            {pathname === '/test/synthesis-progress' && (
              <div className="p-8 max-w-2xl mx-auto">
                <Suspense fallback={null}>
                  <SynthesisProgressBar
                    status="synthesizing"
                    percentComplete={68}
                    currentSegment={14}
                    totalSegments={20}
                    message="Generating multi-voice chapter audio..."
                    isConnected={true}
                  />
                </Suspense>
              </div>
            )}

            {/* VIEW 1: NOVEL CATALOG (Home) */}
            {view === 'catalog' && (
              <NovelCatalog
                onSelectNovel={handleSelectNovel}
                onSelectChapter={handleSelectChapter}
                onOpenAddNovel={() => setShowAddNovelModal(true)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenAuth={handleOpenAuth}
                onNovelDeleted={handleNovelDeleted}
              />
            )}

            {/* VIEW 2: NOVEL DETAILS */}
            {view === 'details' && (selectedNovelId || routeNovelId || currentNovel?.id) && (
              <ErrorBoundary friendlyMessage="Couldn't load novel details.">
                <Suspense fallback={<RouteSkeleton />}>
                  <NovelDetails
                    novelId={selectedNovelId || routeNovelId || currentNovel?.id}
                    onBack={() => handleNavigate('catalog')}
                    onSelectChapter={handleSelectChapter}
                    onOpenUploadChapter={(novel) => {
                      setCurrentNovel(novel);
                      setShowUploadChapterModal(true);
                    }}
                    onNovelDeleted={handleNovelDeleted}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {/* VIEW 3: SYNCHRONIZED READER */}
            {view === 'reader' && (
              <div className="w-full">
                {chapterError && (
                  <div className="mx-4 my-2 p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-xs">
                    {chapterError}
                  </div>
                )}

                {isLoadingChapter ? (
                  <div className="rounded-2xl theme-surface border theme-border p-12 text-center theme-muted text-sm animate-pulse space-y-3 max-w-3xl mx-auto">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto" />
                    <p>Loading chapter prose and synchronized timeline...</p>
                  </div>
                ) : (
                  <ErrorBoundary friendlyMessage="Couldn't load the reader. Try opening the chapter again.">
                    <Suspense fallback={<RouteSkeleton />}>
                      <ReaderView
                        segments={chapterSegments}
                        activeSegmentId={audioSync.activeSegmentId}
                        segmentProgress={audioSync.segmentProgress}
                        isPlaying={audioSync.isPlaying}
                        onSegmentClick={(segmentId) => {
                          audioSync.seekToSegment(segmentId);
                        }}
                        currentNovel={currentNovel}
                        currentChapter={currentChapter}
                        chapters={novelChapters}
                        onSelectChapter={(chapterId) => {
                          const targetCh = novelChapters.find((c) => c.id === chapterId);
                          if (targetCh) {
                            handleSelectChapter(currentNovel, targetCh);
                          }
                        }}
                        useTtsSanitizer={useTtsSanitizer}
                        onToggleTtsSanitizer={() => setUseTtsSanitizer((prev) => !prev)}
                        onRetry={() => {
                          if (currentChapter) {
                            handleSelectChapter(currentNovel, currentChapter);
                          }
                        }}
                        onNextChapter={(() => {
                          if (!currentChapter || novelChapters.length === 0) return null;
                          const idx = novelChapters.findIndex((c) => c.id === currentChapter.id);
                          const nextCh =
                            idx >= 0 && idx + 1 < novelChapters.length
                              ? novelChapters[idx + 1]
                              : novelChapters.find(
                                  (c) => Number(c.chapter_number) === Number(currentChapter.chapter_number) + 1
                                );
                          return nextCh ? () => handleSelectChapter(currentNovel, nextCh) : null;
                        })()}
                        onBack={() => {
                          if (selectedNovelId || currentNovel?.id) {
                            handleNavigate('details', selectedNovelId || currentNovel?.id);
                          } else {
                            handleNavigate('catalog');
                          }
                        }}
                      />
                    </Suspense>
                  </ErrorBoundary>
                )}
              </div>
            )}

            {/* VIEW 4: UPLOAD VIEW */}
            {view === 'upload' && (
              <ErrorBoundary friendlyMessage="Couldn't load upload studio.">
                <Suspense fallback={<RouteSkeleton />}>
                  <UploadView
                    onOpenUploadModal={() => setShowAddNovelModal(true)}
                    onOpenAuth={handleOpenAuth}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {/* VIEW 5: PROFILE VIEW */}
            {view === 'profile' && (
              <ErrorBoundary friendlyMessage="Couldn't load profile.">
                <Suspense fallback={<RouteSkeleton />}>
                  <ProfileView
                    onOpenAuth={handleOpenAuth}
                    onNavigateHome={() => handleNavigate('catalog')}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {/* VIEW 6: ADMIN VIEW */}
            {view === 'admin' && (
              <ErrorBoundary friendlyMessage="Couldn't load administration.">
                <Suspense fallback={<RouteSkeleton />}>
                  <AdminView
                    onNavigateHome={() => handleNavigate('catalog')}
                    onOpenSettings={() => setShowSettings(true)}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </main>

          {/* Sticky Bottom Audio Player */}
          {view === 'reader' && chapterManifest && (
            <ErrorBoundary friendlyMessage="Audio player encountered an issue.">
              <Suspense fallback={null}>
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
                  onError={audioSync.handleAudioError}
                  onLoadedMetadata={audioSync.handleLoadedMetadata}
                  currentNovel={currentNovel}
                  currentChapter={currentChapter}
                  playbackMode={audioSync.playbackMode}
                  onTogglePlaybackMode={(mode) => {
                    const explicitMode = mode === 'tts' || mode === 'studio' ? mode : null;
                    const targetMode = explicitMode || (audioSync.playbackMode === 'tts' ? 'studio' : 'tts');
                    if (targetMode === 'studio' && !hasStudioAudio) {
                      handleSynthesizeCurrentChapter()
                        .then(() => {
                          audioSync.togglePlaybackMode('studio');
                        })
                        .catch(() => {});
                      return;
                    }
                    audioSync.togglePlaybackMode(targetMode);
                  }}
                  ttsEngine={audioSync.ttsEngine}
                  onChangeTtsEngine={audioSync.setTtsEngine}
                  onSeekSegment={(dir) => {
                    const currentIdx = chapterSegments.findIndex(
                      (s) => (s.segment_id ?? s.order) === audioSync.activeSegmentId
                    );
                    const targetIdx = Math.max(0, Math.min(chapterSegments.length - 1, (currentIdx >= 0 ? currentIdx : 0) + dir));
                    const targetSeg = chapterSegments[targetIdx];
                    if (targetSeg) {
                      audioSync.seekToSegment(targetSeg.segment_id ?? targetSeg.order);
                    }
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Character Cast Roster Drawer */}
          {showRoster && view === 'reader' && (
            <Suspense fallback={null}>
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
            </Suspense>
          )}

          {/* Lazy Modals with Obsidian Skeleton Fallback */}
          {showAuthModal && (
            <Suspense fallback={<ModalSkeleton maxWidth="max-w-3xl" onClose={() => setShowAuthModal(false)} />}>
              <AuthModal
                isOpen={showAuthModal}
                initialMode={authMode}
                onClose={() => setShowAuthModal(false)}
              />
            </Suspense>
          )}

          {showAddNovelModal && (
            <Suspense fallback={<ModalSkeleton maxWidth="max-w-xl" onClose={() => setShowAddNovelModal(false)} />}>
              <AddNovelModal
                isOpen={showAddNovelModal}
                onClose={() => setShowAddNovelModal(false)}
                onOpenAuth={handleOpenAuth}
                onSelectChapter={handleSelectChapter}
                initialParserEngine={defaultParserEngine}
                onNovelCreated={(newNovel, firstChapter) => {
                  if (firstChapter) {
                    handleSelectChapter(newNovel, firstChapter);
                  } else {
                    handleNavigate('details', newNovel.id);
                  }
                }}
              />
            </Suspense>
          )}

          {showUploadChapterModal && (
            <Suspense fallback={<ModalSkeleton maxWidth="max-w-xl" onClose={() => setShowUploadChapterModal(false)} />}>
              <UploadChapterModal
                isOpen={showUploadChapterModal}
                novel={currentNovel}
                onClose={() => setShowUploadChapterModal(false)}
                onChapterUploaded={(newChapter) => {
                  handleSelectChapter(currentNovel, newChapter);
                }}
              />
            </Suspense>
          )}

          {showSettings && (
            <Suspense
              fallback={
                <ModalSkeleton
                  maxWidth="max-w-lg"
                  onClose={() => {
                    setShowSettings(false);
                    if (pathname === '/settings') navigate('/');
                  }}
                />
              }
            >
              <SettingsModal
                modelStatus={modelStatus}
                ttsEngine={audioSync.ttsEngine}
                onSelectTtsEngine={audioSync.setTtsEngine}
                defaultParserEngine={defaultParserEngine}
                onSelectParserEngine={handleSelectParserEngine}
                onProbeStatus={handleProbeStatus}
                onClose={() => {
                  setShowSettings(false);
                  if (pathname === '/settings') navigate('/');
                }}
              />
            </Suspense>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  const inRouter = useInRouterContext();
  if (!inRouter) {
    return (
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    );
  }
  return <AppContent />;
}
