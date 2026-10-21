import React from 'react';
import {
  IconSettings,
  IconX,
  IconShield,
  IconSoundwave,
} from './icons';

export default function SettingsModal({ modelStatus, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-[var(--border-subtle)] space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-main)] font-display flex items-center gap-2">
            <IconSettings className="w-4 h-4 text-indigo-400" />
            <span>Neural Synthesizer Architecture</span>
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg"
            aria-label="Close"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-sub)] uppercase tracking-wider font-mono">
            Engines & Fallback Stack
          </h3>

          {modelStatus ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    Primary: Edge Neural TTS (24kHz)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] ml-4 space-y-0.5 font-mono">
                  <div>Status: Active (Cloud WebSocket)</div>
                  <div>Format: 24kHz High Bitrate MP3</div>
                  <div>Voice Cast: Microsoft Neural British & American</div>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      modelStatus?.tts?.model_exists ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    Secondary: Kokoro-82M TTS
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] ml-4 space-y-0.5 font-mono">
                  <div>
                    Model:{' '}
                    {modelStatus?.tts?.model_exists
                      ? 'Installed (ONNX runtime)'
                      : 'Standby / Offline fallback'}
                  </div>
                  <div>Cache: kokoro-tts-backend/models_cache/</div>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      modelStatus?.llm?.available ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    LLM Parser: Ollama
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] ml-4 space-y-0.5 font-mono">
                  <div>
                    Status:{' '}
                    {modelStatus?.llm?.available ? 'Connected' : 'Rule-Based Fallback Standby'}
                  </div>
                  <div>Model: {modelStatus?.llm?.model || 'llama3:8b'}</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Checking synthesizer status...</p>
          )}

          <div className="p-3.5 bg-indigo-500/10 rounded-xl text-[11px] text-indigo-300 border border-indigo-500/20 leading-relaxed font-serif">
            <p className="font-bold mb-1 font-sans text-indigo-200">Dual-TTS 4NF Guarantee</p>
            <p>
              SyncTone seamlessly fails over from Edge Neural cloud synthesizers to local Kokoro-82M ONNX models, maintaining persistent chapter timestamps and lossless state.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
