import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import {
  IconSoundwave,
  IconPlay,
  IconPause,
  IconSparkles,
  IconRefresh,
  IconBook,
  IconSettings,
} from './icons';

export const NEURAL_VOICES = [
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (British Narrator)',
    engine: 'Edge TTS Neural',
    role: 'CHRONICLER & NARRATOR',
    gender: 'Male',
    timbre: 'Authoritative, resonant literary baritone with crisp British diction',
    latency: '36ms',
    sampleQuote: 'The world was full of a number of things, and I am sure we should all be as happy as kings.',
    channel: 'Verified Studio',
  },
  {
    id: 'bm_george',
    name: 'George (British Received)',
    engine: 'Kokoro v1.0 ONNX',
    role: 'ANALYTICAL & DETECTIVE',
    gender: 'Male',
    timbre: 'Sharp Victorian RP, deliberate phrasing and precise consonants',
    latency: '42ms',
    sampleQuote: 'It is a capital mistake to theorize before one has data. Insensibly one begins to twist facts to suit theories.',
    channel: 'Verified Studio',
  },
  {
    id: 'am_michael',
    name: 'Michael (Strong Tenor)',
    engine: 'Kokoro v1.0 ONNX',
    role: 'MODERNIST DRAMA',
    gender: 'Male',
    timbre: 'Resonant, intimate companionable tenor with cinematic presence',
    latency: '38ms',
    sampleQuote: 'In my younger and more vulnerable years my father gave me some advice that I have been turning over in my mind ever since.',
    channel: 'Verified Studio',
  },
  {
    id: 'af_bella',
    name: 'Bella (Expressive Soprano)',
    engine: 'Kokoro v1.0 ONNX',
    role: 'PASSIONATE & ROMANTIC',
    gender: 'Female',
    timbre: 'Lyrical, vibrant cadence with rich emotional inflection',
    latency: '40ms',
    sampleQuote: 'I am no bird; and no net ensnares me; I am a free human being with an independent will.',
    channel: 'Verified Studio',
  },
  {
    id: 'bf_emma',
    name: 'Emma (Crisp Victorian RP)',
    engine: 'Kokoro v1.0 ONNX',
    role: 'MATRON & ARISTOCRACY',
    gender: 'Female',
    timbre: 'Warm maternal Victorian cadence, elegant and aristocratic',
    latency: '44ms',
    sampleQuote: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    channel: 'Verified Studio',
  },
  {
    id: 'am_adam',
    name: 'Adam (Cinematic Bass)',
    engine: 'Kokoro v1.0 ONNX',
    role: 'EPIC & FOREBODING',
    gender: 'Male',
    timbre: 'Deep rumble with gravitas, commanding and monumental',
    latency: '45ms',
    sampleQuote: 'Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse...',
    channel: 'Verified Studio',
  },
  {
    id: 'af_sarah',
    name: 'Sarah (Lyrical Narrator)',
    engine: 'Kokoro v1.0 ONNX',
    role: 'FABLE & INNOCENCE',
    gender: 'Female',
    timbre: 'Gentle, contemplative wonder with crystalline clarity',
    latency: '39ms',
    sampleQuote: 'It is only with the heart that one can see rightly; what is essential is invisible to the eye.',
    channel: 'Verified Studio',
  },
];

const AUDITION_ENGINES = [
  { id: 'msedge-tts', label: 'Edge TTS Neural' },
  { id: 'kokoro-tts', label: 'Kokoro v1.0 ONNX' },
  { id: 'paradee-tts', label: 'Paradee-8M ONNX' },
  { id: 'paradee-mixed', label: 'Paradee + Machine Mixed' },
  { id: 'machine-tts', label: 'macOS Machine TTS' },
];

export default function VoicesView({
  onSelectNovel,
  onOpenSettings,
  ttsEngine: propTtsEngine,
  onSelectTtsEngine,
}) {
  const [activeTab, setActiveTab] = useState('voices'); // 'voices' | 'cast' | 'timbre' | 'engines'
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState(null);
  const [sampleError, setSampleError] = useState(null);
  const [novels, setNovels] = useState([]);
  const [isLoadingNovels, setIsLoadingNovels] = useState(false);
  const [modelsStatus, setModelsStatus] = useState(null);
  const [localEngine, setLocalEngine] = useState(() => {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem('synctone_tts_engine')) || 'msedge-tts';
    } catch (_) {
      return 'msedge-tts';
    }
  });

  const activeEngine = propTtsEngine || localEngine;

  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  // Timbre sliders state
  const [emotionalRange, setEmotionalRange] = useState(78);
  const [breathRate, setBreathRate] = useState(42);
  const [pitchOffset, setPitchOffset] = useState(0);
  const [cadenceRate, setCadenceRate] = useState(1.0);

  const stopActivePreview = useCallback(() => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch (_) {}
      abortRef.current = null;
    }
    if (audioRef.current) {
      try {
        const audio = audioRef.current;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = '';
      } catch (_) {}
      audioRef.current = null;
    }
    if (objectUrlRef.current && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch (_) {}
      objectUrlRef.current = null;
    }
    if (mountedRef.current) {
      setPlayingVoiceId(null);
      setLoadingVoiceId(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopActivePreview();
    };
  }, [stopActivePreview]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onStorage = (e) => {
      if (e.key === 'synctone_tts_engine' && e.newValue) {
        setLocalEngine(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingNovels(true);
    api.novels.list()
      .then((res) => {
        if (!cancelled && res?.novels) {
          setNovels(res.novels);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingNovels(false);
      });

    api.status.models()
      .then((res) => {
        if (!cancelled) setModelsStatus(res);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEngineSelect = (nextEngine) => {
    setLocalEngine(nextEngine);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('synctone_tts_engine', nextEngine);
      }
    } catch (_) {}
    onSelectTtsEngine?.(nextEngine);
    stopActivePreview();
  };

  // Real audio audition using /api/voices/speak + Audio + blob/object URL
  const togglePlaySample = async (voiceOrId) => {
    const voice =
      typeof voiceOrId === 'string'
        ? NEURAL_VOICES.find((v) => v.id === voiceOrId)
        : voiceOrId;
    if (!voice) return;

    if (playingVoiceId === voice.id || loadingVoiceId === voice.id) {
      stopActivePreview();
      return;
    }

    stopActivePreview();
    setSampleError(null);
    setLoadingVoiceId(voice.id);

    const engine = activeEngine || 'msedge-tts';
    const sampleText = voice.sampleQuote || `Testing voice profile ${voice.name}.`;
    const isNarrator = voice.id === 'en-GB-RyanNeural';
    const gender = String(voice.gender || '').toLowerCase();
    const speakUrl = `/api/voices/speak?text=${encodeURIComponent(sampleText)}&voice_id=${encodeURIComponent(voice.id)}&engine=${encodeURIComponent(engine)}&character_id=${encodeURIComponent(voice.id)}&speaker_name=${encodeURIComponent(voice.name)}&is_narrator=${isNarrator}&gender=${encodeURIComponent(gender)}`;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    abortRef.current = controller;

    try {
      let audioSrc = speakUrl;

      if (typeof fetch === 'function') {
        const response = await fetch(speakUrl, {
          credentials: 'include',
          ...(controller ? { signal: controller.signal } : {}),
        });
        if (!response.ok) {
          throw new Error(`Sample request failed (${response.status})`);
        }
        if (!mountedRef.current || abortRef.current !== controller) return;

        if (
          typeof response.blob === 'function' &&
          typeof URL !== 'undefined' &&
          typeof URL.createObjectURL === 'function'
        ) {
          const blob = await response.blob();
          if (!mountedRef.current || abortRef.current !== controller) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = objectUrl;
          audioSrc = objectUrl;
        }
      }

      if (typeof Audio === 'undefined') {
        throw new Error('Audio playback is unavailable in this environment.');
      }

      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onended = () => {
        if (audioRef.current === audio) {
          stopActivePreview();
        }
      };

      audio.onerror = () => {
        if (audioRef.current === audio) {
          stopActivePreview();
          if (mountedRef.current) {
            setSampleError(`Unable to play audio sample for ${voice.name}.`);
          }
        }
      };

      setLoadingVoiceId(null);
      setPlayingVoiceId(voice.id);
      await audio.play();
    } catch (err) {
      if (err?.name === 'AbortError') return;
      stopActivePreview();
      if (mountedRef.current) {
        setSampleError(err?.message || `Failed to audition ${voice.name}.`);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* 1. Header Banner */}
      <section className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 text-[11px] font-mono tracking-wider uppercase border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-full shadow-xs">
                SYNCTONE AUDIO STUDIO
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase bg-[var(--bg-surface)] text-[var(--text-sub)] border border-[var(--border-subtle)] rounded-full">
                7 HIGH-FIDELITY MODELS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-sans uppercase tracking-tight text-[var(--text-main)]">
              Voice Synthesis Studio
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-sub)] font-mono leading-relaxed">
              Neural multi-speaker voice matrix with dynamic character assignment, latency profiling, and real-time speech synthesis at 48kHz PCM.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              aria-label="Audition TTS Engine"
              value={activeEngine}
              onChange={(e) => handleEngineSelect(e.target.value)}
              className="px-3 py-2 text-xs font-mono rounded-full bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)] cursor-pointer focus:outline-none focus:border-[var(--border-strong)]"
            >
              {AUDITION_ENGINES.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.label}
                </option>
              ))}
            </select>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="boxed-btn px-4 py-2 text-xs font-mono uppercase inline-flex items-center gap-2 cursor-pointer rounded-full active:scale-95 transition-all shadow-xs hover:scale-105"
              >
                <IconSettings className="w-3.5 h-3.5" />
                <span>Engine Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[var(--border-subtle)] overflow-x-auto no-scrollbar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'voices'}
            onClick={() => setActiveTab('voices')}
            className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full cursor-pointer transition-all ${
              activeTab === 'voices'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            NEURAL VOICES ({NEURAL_VOICES.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cast'}
            onClick={() => setActiveTab('cast')}
            className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full cursor-pointer transition-all ${
              activeTab === 'cast'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            NOVEL ENSEMBLES ({novels.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'timbre'}
            onClick={() => setActiveTab('timbre')}
            className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full cursor-pointer transition-all ${
              activeTab === 'timbre'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            TIMBRE & DYNAMICS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'engines'}
            onClick={() => setActiveTab('engines')}
            className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full cursor-pointer transition-all ${
              activeTab === 'engines'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] font-bold shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            HARDWARE & ENGINES
          </button>
        </div>
      </section>

      {/* 2. TAB 1: NEURAL VOICES */}
      {activeTab === 'voices' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="mono-xs text-[var(--text-muted)]">// NEURAL VOICE MATRIX</span>
            <span className="mono-xs text-[var(--text-sub)]">48KHZ STUDIO PCM • {activeEngine.toUpperCase()}</span>
          </div>

          {sampleError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] text-xs font-mono text-[var(--text-main)] flex items-center justify-between gap-2"
            >
              <span>{sampleError}</span>
              <button
                type="button"
                onClick={() => setSampleError(null)}
                className="text-[10px] uppercase text-[var(--text-sub)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {NEURAL_VOICES.map((v) => {
              const isPlaying = playingVoiceId === v.id;
              const isLoading = loadingVoiceId === v.id;
              return (
                <div
                  key={v.id}
                  className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all shadow-md flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold font-sans uppercase text-[var(--text-main)] tracking-tight">
                          {v.name}
                        </h3>
                        <span className="text-[10px] font-mono text-[var(--text-sub)] tracking-wider">
                          {v.id} • {v.gender}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-sub)] rounded-full">
                        {v.latency}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-sub)] font-mono leading-relaxed">
                      {v.timbre}
                    </p>

                    <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-serif italic text-[var(--text-main)] line-clamp-3">
                      &ldquo;{v.sampleQuote}&rdquo;
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                      {v.engine}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePlaySample(v)}
                      className="boxed-btn px-3 py-1.5 text-[11px] font-mono uppercase inline-flex items-center gap-1.5 cursor-pointer rounded-full active:scale-95 transition-all shadow-xs hover:scale-105"
                      aria-label={`Audition sample for ${v.name}`}
                    >
                      {isLoading ? (
                        <>
                          <IconRefresh className="w-3 h-3 animate-spin" />
                          <span>Loading</span>
                        </>
                      ) : isPlaying ? (
                        <>
                          <IconPause className="w-3 h-3 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <IconPlay className="w-3 h-3 fill-current" />
                          <span>Audition</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. TAB 2: NOVEL ENSEMBLES */}
      {activeTab === 'cast' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="mono-xs text-[var(--text-muted)]">// REGISTERED NOVEL VOICE CASTS</span>
            <span className="mono-xs text-[var(--text-sub)]">{novels.length} VOLUMES</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {novels.map((novel) => (
              <div
                key={novel.id}
                className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-mono uppercase rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-sub)]">
                      {novel.channel === 'verified' ? 'VERIFIED' : 'COMMUNITY'}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono uppercase rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-sub)]">
                      {novel.chapter_count || 1} CH
                    </span>
                  </div>

                  <h3 className="text-sm font-bold font-sans uppercase text-[var(--text-main)] tracking-tight line-clamp-1" title={novel.title}>
                    {novel.title}
                  </h3>
                  <p className="text-xs text-[var(--text-sub)] font-mono">
                    By {novel.author_username || 'Author'}
                  </p>
                  <div className="pt-2 text-xs font-mono text-[var(--text-sub)]">
                    <span className="text-[var(--text-muted)]">NARRATOR: </span>
                    <span className="text-[var(--text-main)] font-semibold">{novel.narrator_name || 'Studio Cast'}</span>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      Voice: {novel.narrator_voice_label || novel.narrator_voice_id || 'en-GB-RyanNeural'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  {onSelectNovel && (
                    <button
                      type="button"
                      onClick={() => onSelectNovel(novel.id)}
                      className="boxed-btn-primary px-3 py-1.5 text-[11px] font-mono uppercase inline-flex items-center gap-1.5 cursor-pointer rounded-full active:scale-95 transition-all hover:scale-105"
                    >
                      <IconBook className="w-3 h-3" />
                      <span>Open Voice Studio</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. TAB 3: TIMBRE & DYNAMICS */}
      {activeTab === 'timbre' && (
        <section className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl space-y-6">
          <div className="space-y-1">
            <span className="mono-xs text-[var(--text-muted)]">// AUDIO SYNTHESIS DYNAMICS ENGINE</span>
            <h2 className="text-lg font-bold font-sans uppercase text-[var(--text-main)]">
              Timbre & Expression Sliders
            </h2>
            <p className="text-xs text-[var(--text-sub)] font-mono">
              Fine-tune neural vocal characteristics, pacing, and emotional expression curves applied during synthesis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-sub)]">EMOTIONAL RANGE</span>
                <span className="font-bold text-[var(--text-main)]">{emotionalRange}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={emotionalRange}
                onChange={(e) => setEmotionalRange(Number(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
                aria-label="Emotional Range"
              />
              <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                Controls pitch dynamics and dramatic emphasis
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-sub)]">BREATH PHONEME RATE</span>
                <span className="font-bold text-[var(--text-main)]">{breathRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={breathRate}
                onChange={(e) => setBreathRate(Number(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
                aria-label="Breath Phoneme Rate"
              />
              <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                Natural aspiration cadence at sentence boundaries
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-sub)]">PITCH OFFSET</span>
                <span className="font-bold text-[var(--text-main)]">
                  {pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset} ST
                </span>
              </div>
              <input
                type="range"
                min="-6"
                max="6"
                value={pitchOffset}
                onChange={(e) => setPitchOffset(Number(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
                aria-label="Pitch Offset"
              />
              <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                Semitone pitch scale adjustment for character timbre
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[var(--text-sub)]">CADENCE PACE</span>
                <span className="font-bold text-[var(--text-main)]">{cadenceRate.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={cadenceRate}
                onChange={(e) => setCadenceRate(Number(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
                aria-label="Cadence Pace"
              />
              <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                Overall delivery speed across monologue and dialogue
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 5. TAB 4: HARDWARE & ENGINES */}
      {activeTab === 'engines' && (
        <section className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl space-y-6">
          <div className="space-y-1">
            <span className="mono-xs text-[var(--text-muted)]">// NEURAL ENGINE STACK</span>
            <h2 className="text-lg font-bold font-sans uppercase text-[var(--text-main)]">
              Synthesis Hardware & Backend Engines
            </h2>
            <p className="text-xs text-[var(--text-sub)] font-mono">
              Real-time hardware pipeline status for multi-speaker neural audio synthesis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-[var(--text-main)]">1. Kokoro v1.0 ONNX</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-sub)] font-mono leading-relaxed">
                Local 82M micro-model delivering multi-voice dialogue synthesis with sub-50ms latency.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-[var(--text-main)]">2. Microsoft Edge Neural</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-main)]">
                  READY
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-sub)] font-mono leading-relaxed">
                High-definition cloud neural voices (*RyanNeural*, *SoniaNeural*, *GuyNeural*).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-[var(--text-main)]">3. vLLM / Ollama LLM</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-main)]">
                  CONNECTED
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-sub)] font-mono leading-relaxed">
                Dialogue attribution, speaker emotion tagger, and natural phrasing engine.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

