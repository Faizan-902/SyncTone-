/**
 * App.tsx — Main application component.
 *
 * Three-stage flow:
 * 1. Upload: User pastes/types chapter text
 * 2. Parse: Text is segmented and attributed
 * 3. Play: Audio is synthesized and played with synchronized text
 */

import React, { useState, useEffect } from 'react';
import { useChapterData } from './hooks/useChapterData';
import { useAudioSync } from './hooks/useAudioSync';
import ReaderView from './components/ReaderView';
import AudioPlayer from './components/AudioPlayer';
import CharacterRoster from './components/CharacterRoster';
import SettingsModal from './components/SettingsModal';
import type { ModelStatus } from './types';

type Stage = 'upload' | 'parsed' | 'playing';

export default function App() {
  const [stage, setStage] = useState<Stage>('upload');
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [showRoster, setShowRoster] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [chapterState, chapterActions] = useChapterData();
  const audioSync = useAudioSync(chapterState.manifest?.timeline ?? []);

  // Check model availability on mount
  useEffect(() => {
    chapterActions.checkModels().then(setModelStatus);
  }, [chapterActions]);

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

        {/* Model status warnings */}
        {modelStatus && !modelStatus.tts.model_exists && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
            ⚠️ TTS model not found. Please download the Kokoro model files to the models_cache/ directory.
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
                placeholder="Paste your chapter text here...\n\nThe parser will detect dialogue (quoted text) and narration, and attribute speakers automatically."
                rows={16}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              />
            </div>
            <button
              onClick={handleUploadAndParse}
              disabled={!textInput.trim() || chapterState.isLoading}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              📝 Parse & Attribute
            </button>
          </div>
        )}

        {/* Stage 2: Parsed — show segments and synthesize button */}
        {stage === 'parsed' && chapterState.parsed && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {chapterState.parsed.title}
              </h2>
              <span className="text-sm text-gray-500">
                {chapterState.parsed.segments.length} segments
              </span>
            </div>

            <ReaderView
              segments={chapterState.parsed.segments}
              activeSegmentId={-1}
              onSegmentClick={() => {}}
            />

            <button
              onClick={handleSynthesize}
              disabled={chapterState.isLoading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              🎙️ Synthesize Audio
            </button>
          </div>
        )}

        {/* Stage 3: Playing — reader + audio player */}
        {stage === 'playing' && chapterState.parsed && chapterState.manifest && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {chapterState.parsed.title}
              </h2>
            </div>

            <ReaderView
              segments={chapterState.parsed.segments}
              activeSegmentId={audioSync.activeSegmentId}
              onSegmentClick={audioSync.seekToSegment}
            />

            <AudioPlayer
              audioRef={audioSync.audioRef}
              audioUrl={chapterState.manifest.audio_stream_url}
              isPlaying={audioSync.isPlaying}
              currentTimeMs={audioSync.currentTimeMs}
              totalDurationMs={chapterState.manifest.total_duration_ms}
              onToggle={audioSync.toggle}
              onSetPlaybackRate={audioSync.setPlaybackRate}
            />
          </div>
        )}
      </main>

      {/* Character Roster Drawer */}
      {showRoster && chapterState.parsed && (
        <CharacterRoster
          chapterId={chapterState.chapterId!}
          segments={chapterState.parsed.segments}
          onClose={() => setShowRoster(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          modelStatus={modelStatus}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
