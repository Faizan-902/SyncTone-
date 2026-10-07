/**
 * SettingsModal — Shows model status and app settings.
 */

import React from 'react';
import type { ModelStatus } from '../types';

interface SettingsModalProps {
  modelStatus: ModelStatus | null;
  onClose: () => void;
}

export default function SettingsModal({ modelStatus, onClose }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Model Status */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            Model Status
          </h3>

          {modelStatus ? (
            <div className="space-y-3">
              {/* TTS Status */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      modelStatus.tts.model_exists ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-medium">TTS Engine (Kokoro)</span>
                </div>
                <div className="text-xs text-gray-500 ml-4 space-y-0.5">
                  <div>
                    Model: {modelStatus.tts.model_exists ? '✅ Found' : '❌ Missing'}
                  </div>
                  <div>
                    Voices: {modelStatus.tts.voices_exists ? '✅ Found' : '❌ Missing'}
                  </div>
                  <div className="text-gray-400 truncate" title={modelStatus.tts.model_path}>
                    Path: {modelStatus.tts.model_path}
                  </div>
                </div>
              </div>

              {/* LLM Status */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      modelStatus.llm.available ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm font-medium">LLM (Ollama)</span>
                </div>
                <div className="text-xs text-gray-500 ml-4 space-y-0.5">
                  <div>
                    Status: {modelStatus.llm.available ? '✅ Connected' : '⚠️ Not available'}
                  </div>
                  <div>Model: {modelStatus.llm.model}</div>
                  <div>URL: {modelStatus.llm.url}</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Checking model status...</p>
          )}

          {/* Instructions */}
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <p className="font-medium mb-1">Missing models?</p>
            <p>
              The app requires Kokoro TTS model files in the{' '}
              <code className="bg-blue-100 px-1 rounded">models_cache/</code> directory
              and Ollama running locally for dialogue attribution.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
