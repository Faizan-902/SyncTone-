import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { IconShield, IconSoundwave, IconUsers, IconBook } from './icons';

export default function AdminView({ onNavigateHome, onOpenSettings }) {
  const { role } = useAuth();
  const [modelsStatus, setModelsStatus] = useState(null);
  const [novels, setNovels] = useState(null);

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;

    api.status
      .models()
      .then((res) => {
        if (!cancelled && res) setModelsStatus(res);
      })
      .catch(() => {});

    api.novels
      .list('all')
      .then((res) => {
        if (!cancelled) {
          setNovels(Array.isArray(res?.novels) ? res.novels : []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [role]);

  if (role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)]">
          <IconShield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-main)] font-serif mb-2">Restricted Access</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          This area is available only to system administrators. If you believe this is an error, please sign in with an administrator account.
        </p>
        <button
          onClick={onNavigateHome}
          className="px-6 py-2.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold hover:opacity-90 transition-all duration-200 shadow-md hover:scale-[1.03] active:scale-[0.96] cursor-pointer"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const tts = modelsStatus?.tts || {};
  const kokoroReady = Boolean(modelsStatus?.kokoro?.available || (tts.model_exists && tts.voices_exists));
  const edgeReady = Boolean(tts.cloud_ready);
  const activeParser = modelsStatus?.parser_config?.activeEngine || 'heuristic';
  const parserLabelMap = {
    heuristic: 'Heuristic',
    gemini: 'Gemini AI',
    ollama: 'Ollama LLM',
    'unlimited-ocr': 'Vision OCR',
  };
  const activeParserLabel = parserLabelMap[activeParser] || String(activeParser).toUpperCase();

  const totalNovelsCount = Array.isArray(novels) ? novels.length : null;
  const verifiedCount = Array.isArray(novels)
    ? novels.filter((n) => n.channel === 'verified').length
    : 0;
  const communityCount = Array.isArray(novels)
    ? novels.filter((n) => n.channel === 'community').length
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] font-serif">Studio Administration</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            System overview, voice synthesis status, and library management.
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          className="px-5 py-2 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold hover:opacity-90 transition-all duration-200 shadow-md hover:scale-[1.03] active:scale-[0.96] cursor-pointer"
        >
          Voice Settings
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-[var(--accent-surface)] text-[var(--text-main)] border border-[var(--border-subtle)]">
              <IconSoundwave className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Voice Synthesis</p>
              <p className="text-base font-bold text-[var(--text-main)]">
                {modelsStatus
                  ? kokoroReady && edgeReady
                    ? 'Kokoro + Edge Ready'
                    : kokoroReady
                    ? 'Kokoro ONNX Ready'
                    : edgeReady
                    ? 'Edge TTS Active'
                    : 'Fallback Ready'
                  : 'Checking...'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-sub)] font-mono">
            {modelsStatus
              ? `Kokoro ONNX: ${kokoroReady ? 'Ready' : 'Offline'} • Edge TTS: ${edgeReady ? 'Active' : 'Fallback'}`
              : 'Edge Neural and Kokoro voices status loading.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-[var(--accent-surface)] text-[var(--text-main)] border border-[var(--border-subtle)]">
              <IconBook className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Library Publications</p>
              <p className="text-base font-bold text-[var(--text-main)]">
                {totalNovelsCount !== null
                  ? `${totalNovelsCount} ${totalNovelsCount === 1 ? 'Novel' : 'Novels'}`
                  : 'All Channels'}
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-sub)] font-mono">
            {totalNovelsCount !== null
              ? `${verifiedCount} Verified • ${communityCount} Community`
              : 'Verified classics and community manuscripts.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-[var(--accent-surface)] text-[var(--text-main)] border border-[var(--border-subtle)]">
              <IconUsers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Access Control</p>
              <p className="text-base font-bold text-[var(--text-main)]">Enforced</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-sub)] font-mono">
            {modelsStatus
              ? `Active Parser: ${activeParserLabel}`
              : 'Role-based permissions with secure session cookies.'}
          </p>
        </div>
      </div>
    </div>
  );
}

