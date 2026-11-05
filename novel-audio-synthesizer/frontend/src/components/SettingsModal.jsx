import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { IconSettings, IconX } from './icons';
import { api } from '../services/api';

export default function SettingsModal({
  onClose,
  modelStatus: initialModelStatus,
  ttsEngine: propTtsEngine,
  onSelectTtsEngine,
  defaultParserEngine: propDefaultParserEngine,
  onSelectParserEngine,
  onProbeStatus,
}) {
  const { theme, setTheme, fontFamily, setFontFamily, fontSize, increaseFontSize, decreaseFontSize } = useTheme();

  const [modelStatus, setModelStatus] = useState(initialModelStatus || null);
  const [probing, setProbing] = useState(false);
  const [deviceVoiceCount, setDeviceVoiceCount] = useState(0);

  const [localTtsEngine, setLocalTtsEngine] = useState(() => {
    try {
      return localStorage.getItem('synctone_tts_engine') || 'msedge-tts';
    } catch (_) {
      return 'msedge-tts';
    }
  });

  const [localParserEngine, setLocalParserEngine] = useState(() => {
    try {
      return localStorage.getItem('synctone_parser_engine') || 'heuristic';
    } catch (_) {
      return 'heuristic';
    }
  });

  const activeEngine = propTtsEngine || localTtsEngine;
  const activeParser = propDefaultParserEngine || localParserEngine;

  useEffect(() => {
    if (initialModelStatus) {
      setModelStatus(initialModelStatus);
    }
  }, [initialModelStatus]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        try {
          const v = window.speechSynthesis.getVoices();
          setDeviceVoiceCount(v ? v.length : 0);
        } catch (_) {}
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const handleSelectEngine = useCallback(
    (engine) => {
      setLocalTtsEngine(engine);
      try {
        localStorage.setItem('synctone_tts_engine', engine);
      } catch (_) {}
      onSelectTtsEngine?.(engine);
    },
    [onSelectTtsEngine]
  );

  const handleSelectParser = useCallback(
    (parser) => {
      setLocalParserEngine(parser);
      try {
        localStorage.setItem('synctone_parser_engine', parser);
      } catch (_) {}
      onSelectParserEngine?.(parser);
    },
    [onSelectParserEngine]
  );

  const handleProbeAll = useCallback(async () => {
    setProbing(true);
    try {
      if (onProbeStatus) {
        const res = await onProbeStatus();
        if (res) setModelStatus(res);
      } else {
        const res = await api.status.models({ probe: true });
        if (res) setModelStatus(res);
      }
    } catch (_) {
    } finally {
      setProbing(false);
    }
  }, [onProbeStatus]);

  const kokoroAvailable = Boolean(modelStatus?.kokoro?.available || modelStatus?.tts?.model_exists);
  const paradeeAvailable = Boolean(modelStatus?.paradee?.model_exists || modelStatus?.paradee?.available || modelStatus?.tts?.paradee_ready);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-scrim-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div className="theme-surface rounded-2xl shadow-2xl border border-[var(--border-subtle)] max-w-md w-full p-6 space-y-6 modal-panel-enter max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <h2 id="settings-dialog-title" className="text-base font-bold theme-heading flex items-center gap-2">
            <IconSettings className="w-4 h-4 text-[var(--accent-text)]" />
            <span>Reading & Audio Preferences</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg theme-muted hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
            aria-label="Close settings"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Voice Cast & Narration Status */}
          <div className="py-2 border-b border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold theme-heading">Voice Cast & Narration</p>
                <p className="theme-muted text-[11px]">Multi-voice storytelling & offline support</p>
              </div>
              <button
                type="button"
                onClick={handleProbeAll}
                disabled={probing}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--success)]/20 hover:bg-[var(--success)]/30 text-[var(--success)] border border-[var(--success)]/30 transition cursor-pointer flex items-center gap-1"
                title="Probe real engine readiness"
              >
                {probing ? 'Probing...' : 'Check / Test'}
              </button>
            </div>

            <div className="space-y-2 mt-2">
              {/* Voice 1: Studio Cast */}
              <button
                type="button"
                onClick={() => handleSelectEngine('msedge-tts')}
                className={`w-full text-left p-2.5 rounded-xl theme-card border transition cursor-pointer flex items-center justify-between ${
                  activeEngine === 'msedge-tts'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="font-bold theme-heading">1. Studio Cast Voices</span>
                    {activeEngine === 'msedge-tts' && (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[var(--accent-text)]/15 text-[var(--accent-text)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    High fidelity • Multi-character cast
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] font-bold border border-[var(--success)]/20">
                  {modelStatus?.tts?.edge_available !== false ? 'Cloud Ready' : 'Ready'}
                </span>
              </button>

              {/* Voice 2: Expressive Offline Voices */}
              <button
                type="button"
                onClick={() => handleSelectEngine('kokoro-tts')}
                className={`w-full text-left p-2.5 rounded-xl theme-card border transition cursor-pointer flex items-center justify-between ${
                  activeEngine === 'kokoro-tts'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        kokoroAvailable ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                      }`}
                    />
                    <span className="font-bold theme-heading">2. Expressive Offline Voices</span>
                    {activeEngine === 'kokoro-tts' && (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[var(--accent-text)]/15 text-[var(--accent-text)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    {kokoroAvailable
                      ? 'Local voice package installed'
                      : "This voice isn't available right now. Try another one."}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    kokoroAvailable
                      ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
                      : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20'
                  }`}
                >
                  {kokoroAvailable ? 'Ready' : 'Unavailable'}
                </span>
              </button>

              {/* Voice 3: Device Speech */}
              <button
                type="button"
                onClick={() => handleSelectEngine('machine-tts')}
                className={`w-full text-left p-2.5 rounded-xl theme-card border transition cursor-pointer flex items-center justify-between ${
                  activeEngine === 'machine-tts'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--info)]" />
                    <span className="font-bold theme-heading">3. Device Speech</span>
                    {activeEngine === 'machine-tts' && (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[var(--accent-text)]/15 text-[var(--accent-text)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    Built-in device speech for instant listening anywhere
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--info)]/10 text-[var(--info)] font-bold border border-[var(--info)]/20">
                  {deviceVoiceCount > 0 ? `Device Ready (${deviceVoiceCount})` : 'Device Ready'}
                </span>
              </button>

              {/* Engine 4: Paradee-8M Micro ONNX */}
              <button
                type="button"
                onClick={() => handleSelectEngine('paradee-tts')}
                className={`w-full text-left p-2.5 rounded-xl theme-card border transition cursor-pointer flex items-center justify-between ${
                  activeEngine === 'paradee-tts'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        paradeeAvailable ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-bold theme-heading">4. Paradee-8M Micro ONNX</span>
                    {activeEngine === 'paradee-tts' && (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[var(--accent-text)]/15 text-[var(--accent-text)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    sahilmahendrakar/Paradee-8M-v1.2 • 8.5MB int8 • 4 Neural Voices
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    paradeeAvailable
                      ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                      : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                  }`}
                >
                  {paradeeAvailable ? 'Paradee Ready' : 'OS Fallback'}
                </span>
              </button>

              {/* Engine 5: Paradee + Machine Mixed Cast Mode */}
              <button
                type="button"
                onClick={() => handleSelectEngine('paradee-mixed')}
                className={`w-full text-left p-2.5 rounded-xl theme-card border transition cursor-pointer flex items-center justify-between ${
                  activeEngine === 'paradee-mixed'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="font-bold theme-heading">5. Paradee + Machine Mixed Cast Mode</span>
                    {activeEngine === 'paradee-mixed' && (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[var(--accent-text)]/15 text-[var(--accent-text)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    Paradee-8M (Narrator + Top 3 Cast) + Machine-TTS (5th+ Extras)
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-400/10 text-purple-300 font-bold border border-purple-400/20">
                  Hybrid Ready
                </span>
              </button>
            </div>
          </div>

          {/* 3-Tier AI Manuscript Parsers Status */}
          <div className="py-2 border-b border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold theme-heading">AI Manuscript Parsers</p>
                <p className="theme-muted text-[11px]">3-Tier Book Extraction & Dialogue Attribution</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pluggable
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleSelectParser('heuristic')}
                className={`text-left p-2 rounded-lg theme-card border transition cursor-pointer ${
                  activeParser === 'heuristic'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold theme-heading text-[10px]">Heuristic</p>
                  {activeParser === 'heuristic' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-text)]" />
                  )}
                </div>
                <p className="text-[9px] font-mono text-emerald-400 mt-0.5">Local Ready</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectParser('gemini')}
                className={`text-left p-2 rounded-lg theme-card border transition cursor-pointer ${
                  activeParser === 'gemini'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold theme-heading text-[10px]">Gemini AI</p>
                  {activeParser === 'gemini' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-text)]" />
                  )}
                </div>
                <p
                  className={`text-[9px] font-mono mt-0.5 ${
                    modelStatus?.parsers?.gemini?.configured ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {modelStatus?.parsers?.gemini?.configured ? 'API Ready' : 'Fallback Mode'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectParser('unlimited-ocr')}
                className={`text-left p-2 rounded-lg theme-card border transition cursor-pointer ${
                  activeParser === 'unlimited-ocr'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold theme-heading text-[10px]">Unlimited-OCR</p>
                  {activeParser === 'unlimited-ocr' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-text)]" />
                  )}
                </div>
                <p
                  className={`text-[9px] font-mono mt-0.5 ${
                    modelStatus?.parsers?.['unlimited-ocr']?.reachable || modelStatus?.parsers?.unlimited_ocr?.reachable
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {modelStatus?.parsers?.['unlimited-ocr']?.reachable || modelStatus?.parsers?.unlimited_ocr?.reachable
                    ? 'vLLM Online'
                    : 'vLLM Offline'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectParser('ollama')}
                className={`text-left p-2 rounded-lg theme-card border transition cursor-pointer ${
                  activeParser === 'ollama'
                    ? 'border-[var(--accent-text)] ring-1 ring-[var(--accent-text)] bg-[var(--bg-hover)]'
                    : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold theme-heading text-[10px]">Ollama</p>
                  {activeParser === 'ollama' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-text)]" />
                  )}
                </div>
                <p
                  className={`text-[9px] font-mono mt-0.5 ${
                    modelStatus?.parsers?.ollama?.available || modelStatus?.llm?.available
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {modelStatus?.parsers?.ollama?.available || modelStatus?.llm?.available
                    ? 'Local LLM'
                    : 'Offline'}
                </p>
              </button>
            </div>
          </div>

          {/* Theme Option */}
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <div>
              <p className="font-semibold theme-heading">Color Theme</p>
              <p className="theme-muted text-[11px]">Choose light or dark appearance</p>
            </div>
            <div className="flex p-0.5 rounded-lg theme-card border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  theme === 'dark' ? 'bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs' : 'theme-muted'
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  theme === 'light' ? 'bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs' : 'theme-muted'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* Typography */}
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <div>
              <p className="font-semibold theme-heading">Book Font</p>
              <p className="theme-muted text-[11px]">Choose serif literature or clean sans</p>
            </div>
            <div className="flex p-0.5 rounded-lg theme-card border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setFontFamily('serif')}
                className={`px-3 py-1 rounded text-xs font-serif font-semibold transition cursor-pointer ${
                  fontFamily === 'serif' ? 'bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs' : 'theme-muted'
                }`}
              >
                Serif
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('sans')}
                className={`px-3 py-1 rounded text-xs font-sans font-semibold transition cursor-pointer ${
                  fontFamily === 'sans' ? 'bg-[var(--cta-primary-bg)] text-[var(--cta-primary-text)] shadow-xs' : 'theme-muted'
                }`}
              >
                Sans
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold theme-heading">Text Size</p>
              <p className="theme-muted text-[11px]">Adjust reading comfort</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={decreaseFontSize}
                className="w-7 h-7 rounded-lg theme-card border border-[var(--border-subtle)] font-bold theme-muted hover:text-[var(--text-main)] transition cursor-pointer"
                aria-label="Decrease font size"
              >
                A-
              </button>
              <span className="font-mono font-bold text-xs theme-heading px-1">{fontSize}px</span>
              <button
                type="button"
                onClick={increaseFontSize}
                className="w-7 h-7 rounded-lg theme-card border border-[var(--border-subtle)] font-bold theme-muted hover:text-[var(--text-main)] transition cursor-pointer"
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-2.5 bg-[var(--cta-primary-bg)] hover:bg-[var(--cta-primary-hover)] text-[var(--cta-primary-text)] font-bold rounded-xl shadow-xs text-xs transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
