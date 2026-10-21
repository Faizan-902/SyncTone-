import React from 'react';

export default function SettingsModal({ modelStatus, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-[var(--border-subtle)] space-y-6 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[var(--text-main)] font-display flex items-center gap-2">
            <span>⚙️</span> Engine Settings
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[var(--text-sub)] uppercase tracking-wider">
            Neural TTS & LLM Stack
          </h3>

          {modelStatus ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-[var(--text-main)]">
                    Primary: Edge Neural TTS (24kHz)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] ml-4 space-y-0.5">
                  <div>Status: ✅ Active (Cloud WebSocket)</div>
                  <div>Cast: British Harry Potter + SOTA Neural Voices</div>
                  <div>Format: 24kHz Constant Bitrate MP3</div>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      modelStatus?.tts?.model_exists ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-[var(--text-main)]">
                    Fallback: Kokoro-82M TTS
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] ml-4 space-y-0.5">
                  <div>
                    Model:{' '}
                    {modelStatus?.tts?.model_exists
                      ? '✅ Installed'
                      : '⚠️ Offline fallback standby'}
                  </div>
                  <div>Location: kokoro-tts-backend/models_cache/</div>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      modelStatus?.llm?.available ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-[var(--text-main)]">
                    LLM Engine (Ollama)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] ml-4 space-y-0.5">
                  <div>
                    Status:{' '}
                    {modelStatus?.llm?.available ? '✅ Connected' : '⚠️ Rule-Based Fallback Standby'}
                  </div>
                  <div>Model: {modelStatus?.llm?.model || 'llama3:8b'}</div>
                  <div>URL: {modelStatus?.llm?.url || 'http://localhost:11434'}</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Checking neural synthesizer status...</p>
          )}

          <div className="p-3.5 bg-brand-500/10 rounded-2xl text-[11px] text-brand-400 border border-brand-500/20 leading-relaxed">
            <p className="font-bold mb-1">Dual-TTS 4NF Guarantee</p>
            <p>
              SyncTone seamlessly fails over from Edge Neural cloud synthesizers to local Kokoro-82M ONNX models, maintaining persistent chapter timestamps and 4NF state.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[var(--bg-surface)] hover:border-brand-500 border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-bold rounded-xl transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
