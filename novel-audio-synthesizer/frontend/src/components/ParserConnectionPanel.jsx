import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { IconRefresh, IconSparkles } from './icons';

export const PARSER_ENGINE_STORAGE_KEY = 'synctone_parser_engine';
export const PARSER_CONFIG_STORAGE_KEY = 'synctone_parser_config';

export const DEFAULT_PARSER_CONFIG = {
  heuristic: {
    sensitivity: 'balanced',
    turnTaking: true,
    quoteStyle: 'auto',
  },
  gemini: {
    apiKey: '',
    model: 'gemini-2.5-flash',
    temperature: 0.1,
  },
  ollama: {
    url: 'http://localhost:11434',
    model: 'llama3:8b',
  },
  ocr: {
    baseUrl: 'http://localhost:8000/v1',
    model: 'baidu/Unlimited-OCR',
  },
};

export const KNOWN_OLLAMA_MODELS = ['mistral', 'llama3:8b', 'qwen2.5'];
export const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

export function normalizeParserConfig(raw = {}) {
  const src =
    raw && typeof raw === 'object'
      ? raw.config && typeof raw.config === 'object'
        ? raw.config
        : raw
      : {};
  const ocrSrc = src.ocr || src['unlimited-ocr'] || src.unlimited_ocr || {};
  return {
    heuristic: {
      sensitivity: src.heuristic?.sensitivity || DEFAULT_PARSER_CONFIG.heuristic.sensitivity,
      turnTaking:
        src.heuristic?.turnTaking !== undefined
          ? Boolean(src.heuristic.turnTaking)
          : DEFAULT_PARSER_CONFIG.heuristic.turnTaking,
      quoteStyle: src.heuristic?.quoteStyle || DEFAULT_PARSER_CONFIG.heuristic.quoteStyle,
    },
    gemini: {
      apiKey: typeof src.gemini?.apiKey === 'string' ? src.gemini.apiKey : '',
      hasKey: Boolean(
        src.geminiConfigured || src.gemini?.hasKey || src.gemini?.configured || src.gemini?.apiKey
      ),
      model: src.gemini?.model || DEFAULT_PARSER_CONFIG.gemini.model,
      temperature:
        src.gemini?.temperature !== undefined && src.gemini?.temperature !== ''
          ? Number(src.gemini.temperature)
          : DEFAULT_PARSER_CONFIG.gemini.temperature,
    },
    ollama: {
      url: src.ollama?.url || DEFAULT_PARSER_CONFIG.ollama.url,
      model: src.ollama?.model || DEFAULT_PARSER_CONFIG.ollama.model,
    },
    ocr: {
      baseUrl: ocrSrc.baseUrl || ocrSrc.url || DEFAULT_PARSER_CONFIG.ocr.baseUrl,
      model: ocrSrc.model || DEFAULT_PARSER_CONFIG.ocr.model,
    },
  };
}

export function readStoredParserConfig() {
  try {
    if (typeof localStorage === 'undefined') return normalizeParserConfig();
    const raw = localStorage.getItem(PARSER_CONFIG_STORAGE_KEY);
    return raw ? normalizeParserConfig(JSON.parse(raw)) : normalizeParserConfig();
  } catch (_) {
    return normalizeParserConfig();
  }
}

export default function ParserConnectionPanel({
  engine = 'heuristic',
  config = null,
  onEngineChange,
  onConfigChange,
  compact = false,
  className = '',
}) {
  const [localConfig, setLocalConfig] = useState(() =>
    config ? normalizeParserConfig(config) : readStoredParserConfig()
  );
  const [modelStatus, setModelStatus] = useState(null);
  const [probingStatus, setProbingStatus] = useState(false);
  const [testingParser, setTestingParser] = useState(false);
  const [discoveredOllamaModels, setDiscoveredOllamaModels] = useState([]);
  const [actionStatus, setActionStatus] = useState(null);

  const activeParser = engine || 'heuristic';

  useEffect(() => {
    if (config && typeof config === 'object') {
      setLocalConfig(normalizeParserConfig(config));
    }
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    try {
      const maybeCfg = api.status?.getParserConfig?.();
      if (maybeCfg && typeof maybeCfg.then === 'function') {
        maybeCfg
          .then((res) => {
            if (cancelled || !res) return;
            setLocalConfig((prev) => {
              const merged = normalizeParserConfig(res);
              if (!merged.gemini.apiKey && prev.gemini.apiKey) {
                merged.gemini.apiKey = prev.gemini.apiKey;
              }
              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(PARSER_CONFIG_STORAGE_KEY, JSON.stringify(merged));
                }
              } catch (_) {}
              onConfigChange?.(merged);
              return merged;
            });
            if (Array.isArray(res?.ollamaModels)) {
              setDiscoveredOllamaModels(res.ollamaModels);
            }
          })
          .catch(() => {});
      }

      const maybeStatus = api.status?.models?.();
      if (maybeStatus && typeof maybeStatus.then === 'function') {
        maybeStatus
          .then((res) => {
            if (!cancelled && res) setModelStatus(res);
          })
          .catch(() => {});
      }
    } catch (_) {}

    return () => {
      cancelled = true;
    };
  }, []);

  const ollamaModelOptions = useMemo(() => {
    const combined = [
      ...KNOWN_OLLAMA_MODELS,
      ...discoveredOllamaModels,
      localConfig.ollama.model,
    ]
      .filter(Boolean)
      .map((m) => String(m).trim());
    return Array.from(new Set(combined));
  }, [discoveredOllamaModels, localConfig.ollama.model]);

  const persistParserConfig = useCallback(
    async (nextConfig, engineOverride = null) => {
      const normalized = normalizeParserConfig(nextConfig);
      const selectedEngine = engineOverride || activeParser;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(PARSER_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
        }
      } catch (_) {}
      try {
        const maybeSave = api.status?.updateParserConfig?.({
          activeEngine: selectedEngine,
          heuristic: normalized.heuristic,
          gemini: normalized.gemini,
          ollama: normalized.ollama,
          ocr: normalized.ocr,
          'unlimited-ocr': normalized.ocr,
        });
        if (maybeSave && typeof maybeSave.then === 'function') {
          await maybeSave;
        }
        return true;
      } catch (_) {
        return false;
      }
    },
    [activeParser]
  );

  const handleSelectEngine = useCallback(
    (nextEngine) => {
      setActionStatus(null);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(PARSER_ENGINE_STORAGE_KEY, nextEngine);
        }
      } catch (_) {}
      onEngineChange?.(nextEngine);
      try {
        const maybeSave = api.status?.updateParserConfig?.({ activeEngine: nextEngine });
        if (maybeSave && typeof maybeSave.catch === 'function') {
          maybeSave.catch(() => {});
        }
      } catch (_) {}
    },
    [onEngineChange]
  );

  const updateParserSection = useCallback(
    (section, patch, autoPersist = false) => {
      setLocalConfig((prev) => {
        const next = normalizeParserConfig({
          ...prev,
          [section]: {
            ...prev[section],
            ...patch,
          },
        });
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(PARSER_CONFIG_STORAGE_KEY, JSON.stringify(next));
          }
        } catch (_) {}
        onConfigChange?.(next);
        if (autoPersist) {
          persistParserConfig(next);
        }
        return next;
      });
    },
    [onConfigChange, persistParserConfig]
  );

  const handleProbeAll = useCallback(async () => {
    setProbingStatus(true);
    setActionStatus({ state: 'busy', message: 'Probing parser backends...' });
    try {
      const maybeProbe = api.status?.models?.({ probe: true });
      const res =
        maybeProbe && typeof maybeProbe.then === 'function' ? await maybeProbe : null;
      if (res) {
        setModelStatus(res);
        setActionStatus({ state: 'ok', message: 'Backend parser status refreshed.' });
      } else {
        setActionStatus({ state: 'error', message: 'Status endpoint unavailable in this environment.' });
      }
    } catch (err) {
      setActionStatus({
        state: 'error',
        message: err?.message || 'Unable to probe parser backends.',
      });
    } finally {
      setProbingStatus(false);
    }
  }, []);

  const handleSaveAndTestParser = useCallback(
    async (targetEngine) => {
      setTestingParser(true);
      setActionStatus({ state: 'busy', message: `Saving and testing ${targetEngine}...` });
      try {
        const persisted = await persistParserConfig(localConfig, targetEngine);
        const targetSection =
          targetEngine === 'gemini'
            ? localConfig.gemini
            : targetEngine === 'ollama'
              ? localConfig.ollama
              : targetEngine === 'unlimited-ocr' || targetEngine === 'ocr'
                ? localConfig.ocr
                : localConfig.heuristic;

        let testRes = null;
        if (typeof api.status?.testParserConnection === 'function') {
          testRes = await api.status.testParserConnection({
            engine: targetEngine,
            config: targetSection,
          });
        } else {
          const maybeProbe = api.status?.models?.({ probe: true });
          const probe =
            maybeProbe && typeof maybeProbe.then === 'function' ? await maybeProbe : null;
          if (probe) {
            setModelStatus(probe);
            testRes = { ok: true, message: 'Config saved and status probed.' };
          }
        }

        if (Array.isArray(testRes?.models)) {
          const modelNames = testRes.models
            .map((m) => (typeof m === 'string' ? m : m?.name || m?.id))
            .filter(Boolean);
          if (modelNames.length > 0 && targetEngine === 'ollama') {
            setDiscoveredOllamaModels(modelNames);
          }
        }

        const maybeStatus = api.status?.models?.({ probe: true });
        if (maybeStatus && typeof maybeStatus.then === 'function') {
          maybeStatus
            .then((res) => {
              if (res) setModelStatus(res);
            })
            .catch(() => {});
        }

        const isOk = testRes
          ? testRes.ok !== false && testRes.connected !== false && testRes.reachable !== false
          : persisted;
        const defaultMsg = isOk
          ? `Connected & saved${persisted ? '' : ' locally'}.`
          : 'Saved locally, but connection check reported offline.';
        setActionStatus({
          state: isOk ? 'ok' : 'error',
          message: testRes?.message || testRes?.error || testRes?.detail || defaultMsg,
        });
      } catch (err) {
        setActionStatus({
          state: 'error',
          message: err?.message || 'Saved locally, connection probe failed.',
        });
      } finally {
        setTestingParser(false);
      }
    },
    [localConfig, persistParserConfig]
  );

  const geminiReady = Boolean(
    modelStatus?.parsers?.gemini?.configured ||
      localConfig.gemini.hasKey ||
      (localConfig.gemini.apiKey && localConfig.gemini.apiKey.trim())
  );
  const ocrReachable = Boolean(
    modelStatus?.parsers?.['unlimited-ocr']?.reachable || modelStatus?.parsers?.unlimited_ocr?.reachable
  );
  const ollamaAvailable = Boolean(
    modelStatus?.parsers?.ollama?.available || modelStatus?.llm?.available
  );

  const cards = [
    {
      id: 'heuristic',
      title: 'Heuristic',
      statusText: 'Local Ready',
      ready: true,
    },
    {
      id: 'gemini',
      title: 'Gemini AI',
      statusText: geminiReady ? 'API Ready' : 'Key Needed',
      ready: geminiReady,
    },
    {
      id: 'unlimited-ocr',
      title: 'Vision OCR',
      statusText: ocrReachable ? 'vLLM Online' : 'vLLM Offline',
      ready: ocrReachable,
    },
    {
      id: 'ollama',
      title: 'Ollama',
      statusText: ollamaAvailable ? 'Local LLM' : 'Offline',
      ready: ollamaAvailable,
    },
  ];

  return (
    <div
      className={`rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] ${
        compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IconSparkles className="w-3.5 h-3.5 text-[var(--text-main)]" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-main)]">
            Parser Connection &amp; Attribution Controls
          </span>
        </div>

        <button
          type="button"
          onClick={handleProbeAll}
          disabled={probingStatus}
          className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold uppercase tracking-wider bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <IconRefresh className={`w-3 h-3 ${probingStatus ? 'animate-spin' : ''}`} />
          <span>{probingStatus ? 'Probing...' : 'Check / Probe'}</span>
        </button>
      </div>

      {/* 4-Card AI Manuscript Parser Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {cards.map((card) => {
          const isSelected = activeParser === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleSelectEngine(card.id)}
              aria-pressed={isSelected}
              className={`text-left ${
                compact ? 'p-2' : 'p-2.5'
              } rounded-xl bg-[var(--bg-surface)] border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[var(--text-main)] ring-1 ring-[var(--text-main)] bg-[var(--accent-surface)]'
                  : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <p className="font-bold text-[var(--text-main)] text-[10px] truncate">{card.title}</p>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)] shrink-0" />
                )}
              </div>
              <p
                className={`text-[9px] font-mono mt-0.5 truncate ${
                  card.ready ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {card.statusText}
              </p>
            </button>
          );
        })}
      </div>

      {/* Inline Parser Configuration & Connection Test Subpanel */}
      <div
        className={`${
          compact ? 'p-2.5 space-y-2' : 'p-3 space-y-2.5'
        } rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]`}
      >
        {activeParser === 'heuristic' && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-bold font-mono text-[10px] uppercase tracking-wider text-[var(--text-main)]">
                Heuristic Attribution Settings
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Instant Local Rules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="space-y-1 block">
                <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                  Attribution Mode
                </span>
                <select
                  aria-label="Attribution Mode"
                  value={localConfig.heuristic.sensitivity}
                  onChange={(e) =>
                    updateParserSection('heuristic', { sensitivity: e.target.value }, true)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
                >
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive Turn-Taking</option>
                  <option value="strict">Strict Speech Tags</option>
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                  Quote Detection
                </span>
                <select
                  aria-label="Quote Detection"
                  value={localConfig.heuristic.quoteStyle}
                  onChange={(e) =>
                    updateParserSection('heuristic', { quoteStyle: e.target.value }, true)
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
                >
                  <option value="auto">Auto</option>
                  <option value="double">Double Quotes</option>
                  <option value="single">Single &amp; Double</option>
                </select>
              </label>
            </div>

            <label className="flex items-center justify-between gap-2 pt-0.5 cursor-pointer">
              <span className="text-[11px] font-mono text-[var(--text-main)]">
                Conversational Turn-Taking
              </span>
              <input
                type="checkbox"
                aria-label="Conversational Turn-Taking"
                checked={Boolean(localConfig.heuristic.turnTaking)}
                onChange={(e) =>
                  updateParserSection('heuristic', { turnTaking: e.target.checked }, true)
                }
                className="w-4 h-4 accent-[var(--text-main)] cursor-pointer"
              />
            </label>
          </>
        )}

        {activeParser === 'gemini' && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-bold font-mono text-[10px] uppercase tracking-wider text-[var(--text-main)]">
                Gemini AI Configuration
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">Cloud Dialogue LLM</span>
            </div>

            <label className="space-y-1 block">
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                Gemini API Key
              </span>
              <input
                type="password"
                aria-label="Gemini API Key"
                value={localConfig.gemini.apiKey}
                onChange={(e) => updateParserSection('gemini', { apiKey: e.target.value })}
                placeholder={
                  localConfig.gemini.hasKey ? 'AIza... (configured on server)' : 'AIza...'
                }
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="space-y-1 block">
                <span className="block text-[10px] font-mono text-[var(--text-muted)]">Model</span>
                <select
                  aria-label="Gemini Model"
                  value={localConfig.gemini.model}
                  onChange={(e) => updateParserSection('gemini', { model: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                  Temperature ({Number(localConfig.gemini.temperature ?? 0.1).toFixed(1)})
                </span>
                <input
                  type="range"
                  aria-label="Gemini Temperature"
                  min="0"
                  max="0.7"
                  step="0.1"
                  value={localConfig.gemini.temperature ?? 0.1}
                  onChange={(e) =>
                    updateParserSection('gemini', { temperature: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[var(--text-main)] cursor-pointer mt-1.5"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => handleSaveAndTestParser('gemini')}
              disabled={testingParser}
              className="w-full py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold uppercase bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] border border-[var(--border-strong)] transition cursor-pointer disabled:opacity-50"
            >
              {testingParser ? 'Testing Gemini...' : 'Save & Test Gemini'}
            </button>
          </>
        )}

        {activeParser === 'ollama' && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-bold font-mono text-[10px] uppercase tracking-wider text-[var(--text-main)]">
                Ollama Local LLM
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                Private Offline Attribution
              </span>
            </div>

            <label className="space-y-1 block">
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                Endpoint URL
              </span>
              <input
                type="text"
                aria-label="Ollama Endpoint URL"
                value={localConfig.ollama.url}
                onChange={(e) => updateParserSection('ollama', { url: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="space-y-1 block">
                <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                  Model Preset
                </span>
                <select
                  aria-label="Ollama Model"
                  value={localConfig.ollama.model}
                  onChange={(e) => updateParserSection('ollama', { model: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
                >
                  {ollamaModelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                  Custom Model Tag
                </span>
                <input
                  type="text"
                  aria-label="Ollama Model ID"
                  value={localConfig.ollama.model}
                  onChange={(e) => updateParserSection('ollama', { model: e.target.value })}
                  placeholder="llama3:8b"
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => handleSaveAndTestParser('ollama')}
              disabled={testingParser}
              className="w-full py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold uppercase bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] border border-[var(--border-strong)] transition cursor-pointer disabled:opacity-50"
            >
              {testingParser ? 'Probing Ollama...' : 'Save & Probe Ollama'}
            </button>
          </>
        )}

        {activeParser === 'unlimited-ocr' && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-bold font-mono text-[10px] uppercase tracking-wider text-[var(--text-main)]">
                Vision OCR Server
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                Scanned PDFs &amp; Layouts
              </span>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-snug">
              Self-hosted OpenAI/vLLM Vision OCR for scanned PDFs
            </p>

            <label className="space-y-1 block">
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                Endpoint URL
              </span>
              <input
                type="text"
                aria-label="Vision OCR Endpoint URL"
                value={localConfig.ocr.baseUrl}
                onChange={(e) => updateParserSection('ocr', { baseUrl: e.target.value })}
                placeholder="http://localhost:8000/v1"
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
              />
            </label>

            <label className="space-y-1 block">
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">Model ID</span>
              <input
                type="text"
                aria-label="Vision OCR Model ID"
                value={localConfig.ocr.model}
                onChange={(e) => updateParserSection('ocr', { model: e.target.value })}
                placeholder="baidu/Unlimited-OCR"
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-strong)]"
              />
            </label>

            <button
              type="button"
              onClick={() => handleSaveAndTestParser('unlimited-ocr')}
              disabled={testingParser}
              className="w-full py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold uppercase bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] border border-[var(--border-strong)] transition cursor-pointer disabled:opacity-50"
            >
              {testingParser ? 'Probing OCR...' : 'Save & Probe OCR'}
            </button>
          </>
        )}

        {actionStatus && (
          <p
            role="status"
            className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border ${
              actionStatus.state === 'ok'
                ? 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-strong)]'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
          >
            {actionStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
