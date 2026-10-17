import React, { useState, useEffect } from 'react';
import { useChapterData } from './hooks/useChapterData';
import { useAudioSync } from './hooks/useAudioSync';
import ReaderView from './components/ReaderView';
import AudioPlayer from './components/AudioPlayer';
import CharacterRoster from './components/CharacterRoster';
import SettingsModal from './components/SettingsModal';

const EMPTY_TIMELINE = [];

export default function App() {
  const [stage, setStage] = useState('upload'); // 'upload' | 'parsed' | 'playing'
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [modelStatus, setModelStatus] = useState(null);
  const [showRoster, setShowRoster] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [chapterState, chapterActions] = useChapterData();
  const audioSync = useAudioSync(chapterState.manifest?.timeline ?? EMPTY_TIMELINE);

  // Check model availability on mount
  useEffect(() => {
    chapterActions.checkModels().then(setModelStatus);
  }, []);

  const handleUploadAndParse = async () => {
    if (!textInput.trim()) return;

    const chapterId = await chapterActions.uploadText(
      textInput,
      titleInput || 'Untitled Chapter',
    );
    if (!chapterId) return;

    const parsed = await chapterActions.parseChapter(chapterId);
    if (parsed) {
      setStage('parsed');
    }
  };

  const handleSynthesize = async () => {
    if (!chapterState.chapterId) return;
    const manifest = await chapterActions.synthesizeChapter(chapterState.chapterId);
    if (manifest) {
      setStage('playing');
    }
  };

  const handleReset = () => {
    chapterActions.reset();
    setTextInput('');
    setTitleInput('');
    setStage('upload');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            📖 Novel Audio Synthesizer
          </h1>
          <div className="flex gap-2">
            {stage !== 'upload' && (
              <button
                onClick={() => setShowRoster(!showRoster)}
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
              >
                👥 Characters
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              ⚙️
            </button>
            {stage !== 'upload' && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
              >
                ↩ New
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Error display */}
        {chapterState.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ❌ {chapterState.error}
          </div>
        )}

        {/* Loading indicator */}
        {chapterState.isLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {chapterState.progress}
          </div>
        )}

        {/* Engine status indicator */}
        {modelStatus && (
          <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Primary Engine: Edge Neural TTS (British Harry Potter Cast)
            </div>
            <span className="text-emerald-600">Kokoro-82M Fallback</span>
          </div>
        )}

        {/* Stage 1: Upload */}
        {stage === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chapter Title
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Enter chapter title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chapter Text
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={"Paste your chapter text here...\n\nThe parser will detect dialogue (quoted text) and narration, and attribute speakers automatically."}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-serif leading-relaxed"
              />
            </div>
            <button
              onClick={handleUploadAndParse}
              disabled={chapterState.isLoading || !textInput.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Parse & Attribute Chapter
            </button>
          </div>
        )}

        {/* Stage 2 & 3: Parsed / Playing */}
        {(stage === 'parsed' || stage === 'playing') && chapterState.parsed && (
          <div className="space-y-6 pb-24">
            {/* Action bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {chapterState.parsed.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {chapterState.parsed.segments.length} segments •{' '}
                  {chapterState.parsed.segments.filter((s) => s.type === 'dialogue').length}{' '}
                  dialogue lines
                </p>
              </div>
              {(stage === 'parsed' || stage === 'playing') && (
                <button
                  onClick={handleSynthesize}
                  disabled={chapterState.isLoading}
                  className="py-2 px-5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {stage === 'playing' ? '🔊 Re-Synthesize Audio' : '🔊 Synthesize Audio'}
                </button>
              )}
            </div>

            {/* Reader view with active segment highlighting */}
            <ReaderView
              segments={chapterState.parsed.segments}
              activeSegmentId={audioSync.activeSegmentId}
              onSegmentClick={(segmentId) => {
                if (stage === 'playing') {
                  audioSync.seekToSegment(segmentId);
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Audio player bar (visible when playing) */}
      {stage === 'playing' && chapterState.manifest && (
        <AudioPlayer
          audioRef={audioSync.audioRef}
          audioUrl={chapterState.manifest.audio_stream_url}
          isPlaying={audioSync.isPlaying}
          currentTimeMs={audioSync.currentTimeMs}
          totalDurationMs={chapterState.manifest.total_duration_ms}
          onToggle={audioSync.toggle}
          onSetPlaybackRate={audioSync.setPlaybackRate}
          onPlay={audioSync.handlePlay}
          onPause={audioSync.handlePause}
          onEnded={audioSync.handleEnded}
          onLoadedMetadata={audioSync.handleLoadedMetadata}
        />
      )}

      {/* Character roster sidebar */}
      {showRoster && chapterState.parsed && (
        <CharacterRoster
          chapterId={chapterState.chapterId || ''}
          segments={chapterState.parsed.segments}
          onClose={() => setShowRoster(false)}
          onVoiceChange={(charId, newVoiceId) => {
            chapterActions.setState((prev) => {
              if (!prev.parsed?.segments) return prev;
              const updatedSegments = prev.parsed.segments.map((s) =>
                s.speaker_id === charId ? { ...s, assigned_voice_id: newVoiceId } : s
              );
              return {
                ...prev,
                parsed: { ...prev.parsed, segments: updatedSegments },
              };
            });
          }}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          modelStatus={modelStatus}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
