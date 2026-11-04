import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { IconSettings, IconX } from './icons';

export default function SettingsModal({ onClose, modelStatus }) {
  const { theme, setTheme, fontFamily, setFontFamily, fontSize, increaseFontSize, decreaseFontSize } = useTheme();

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
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30">
                Active
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {/* Voice 1: Studio Cast */}
              <div className="p-2.5 rounded-xl theme-card border border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="font-bold theme-heading">1. Studio Cast Voices</span>
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    High fidelity • Multi-character cast
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] font-bold border border-[var(--success)]/20">
                  Ready
                </span>
              </div>

              {/* Voice 2: Expressive Offline Voices */}
              <div className="p-2.5 rounded-xl theme-card border border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        modelStatus?.tts?.model_exists ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                      }`}
                    />
                    <span className="font-bold theme-heading">2. Expressive Offline Voices</span>
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    {modelStatus?.tts?.model_exists
                      ? 'Local voice package installed'
                      : "This voice isn't available right now. Try another one."}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    modelStatus?.tts?.model_exists
                      ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20'
                      : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20'
                  }`}
                >
                  {modelStatus?.tts?.model_exists ? 'Ready' : 'Unavailable'}
                </span>
              </div>

              {/* Voice 3: Device Speech */}
              <div className="p-2.5 rounded-xl theme-card border border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--info)]" />
                    <span className="font-bold theme-heading">3. Device Speech</span>
                  </div>
                  <p className="theme-muted text-[10px] mt-0.5 font-mono">
                    Built-in device speech for instant listening anywhere
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--info)]/10 text-[var(--info)] font-bold border border-[var(--info)]/20">
                  Ready
                </span>
              </div>
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
