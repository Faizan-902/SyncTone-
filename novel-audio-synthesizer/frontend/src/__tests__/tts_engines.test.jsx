import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { useAudioSync } from '../hooks/useAudioSync';
import AudioPlayer from '../components/AudioPlayer';
import SettingsModal from '../components/SettingsModal';
import { ThemeProvider } from '../context/ThemeContext';

describe('3-Engine TTS Architecture & UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAudioSync provides ttsEngine state and setTtsEngine dispatcher defaulting to msedge-tts', () => {
    const { result } = renderHook(() => useAudioSync([]));

    expect(result.current.ttsEngine).toBe('msedge-tts');
    expect(typeof result.current.setTtsEngine).toBe('function');

    act(() => {
      result.current.setTtsEngine('kokoro-tts');
    });
    expect(result.current.ttsEngine).toBe('kokoro-tts');

    act(() => {
      result.current.setTtsEngine('machine-tts');
    });
    expect(result.current.ttsEngine).toBe('machine-tts');
  });

  it('AudioPlayer renders the 3-engine selector with all 3 selectable engines', () => {
    const handleChangeEngine = vi.fn();

    render(
      <AudioPlayer
        isPlaying={false}
        currentTimeMs={0}
        totalDurationMs={10000}
        onToggle={vi.fn()}
        ttsEngine="msedge-tts"
        onChangeTtsEngine={handleChangeEngine}
      />
    );

    const select = screen.getByRole('combobox', { name: /select tts engine/i });
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('msedge-tts');

    expect(screen.getByRole('option', { name: /microsoft tts/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /kokoro-tts/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /machine tts/i })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'kokoro-tts' } });
    expect(handleChangeEngine).toHaveBeenCalledWith('kokoro-tts');

    fireEvent.change(select, { target: { value: 'machine-tts' } });
    expect(handleChangeEngine).toHaveBeenCalledWith('machine-tts');
  });

  it('SettingsModal displays narration voices and their live status without technical jargon', () => {
    const mockModelStatus = {
      tts: {
        primary_engine: 'msedge-tts (Cloud Neural)',
        fallback_engine: 'kokoro-tts (Local ONNX)',
        machine_engine: 'machine-tts (Local OS Speech)',
        engines: ['msedge-tts', 'kokoro-tts', 'machine-tts'],
        model_exists: false,
      },
    };

    render(
      <ThemeProvider>
        <SettingsModal onClose={vi.fn()} modelStatus={mockModelStatus} />
      </ThemeProvider>
    );

    expect(screen.getByText(/1\. Studio Cast Voices/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Expressive Offline Voices/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Device Speech/i)).toBeInTheDocument();
    expect(screen.getByText(/Voice Cast & Narration/i)).toBeInTheDocument();
    expect(screen.getByText(/This voice isn't available right now\. Try another one\./i)).toBeInTheDocument();
    expect(screen.getByText(/Unavailable/i)).toBeInTheDocument();
  });

  it('useAudioSync supports paradee-tts and paradee-mixed and computes mixedCastMap for Narrator + top 3 characters and 5th+ extras', () => {
    const mockTimeline = [
      { segment_id: 1, type: 'narration', character_id: 'narrator', text: 'Once upon a time.' },
      { segment_id: 2, type: 'dialogue', character_id: 'alice', gender: 'female', text: 'Hello!' },
      { segment_id: 3, type: 'dialogue', character_id: 'alice', gender: 'female', text: 'How are you?' },
      { segment_id: 4, type: 'dialogue', character_id: 'alice', gender: 'female', text: 'Nice day.' },
      { segment_id: 5, type: 'dialogue', character_id: 'alice', gender: 'female', text: 'Indeed.' },
      { segment_id: 6, type: 'dialogue', character_id: 'bob', gender: 'male', text: 'Good morning.' },
      { segment_id: 7, type: 'dialogue', character_id: 'bob', gender: 'male', text: 'Yes it is.' },
      { segment_id: 8, type: 'dialogue', character_id: 'bob', gender: 'male', text: 'Let us go.' },
      { segment_id: 9, type: 'dialogue', character_id: 'claire', gender: 'female', text: 'Wait for me!' },
      { segment_id: 10, type: 'dialogue', character_id: 'claire', gender: 'female', text: 'I am ready.' },
      { segment_id: 11, type: 'dialogue', character_id: 'dave', gender: 'male', text: 'See you later.' },
    ];

    const { result } = renderHook(() => useAudioSync(mockTimeline));

    act(() => {
      result.current.setTtsEngine('paradee-tts');
    });
    expect(result.current.ttsEngine).toBe('paradee-tts');

    act(() => {
      result.current.setTtsEngine('paradee-mixed');
    });
    expect(result.current.ttsEngine).toBe('paradee-mixed');

    const castMap = result.current.mixedCastMap;
    expect(castMap.get('narrator')).toEqual({
      engine: 'paradee-tts',
      voiceId: 'bm_fable',
      slot: 1,
    });
    expect(castMap.get('alice')).toEqual({
      engine: 'paradee-tts',
      voiceId: 'bf_isabella',
      slot: 2,
    });
    expect(castMap.get('bob')).toEqual({
      engine: 'paradee-tts',
      voiceId: 'am_puck',
      slot: 3,
    });
    expect(castMap.get('claire')).toEqual({
      engine: 'paradee-tts',
      voiceId: 'af_heart',
      slot: 4,
    });

    const daveCast = castMap.get('dave');
    expect(daveCast.engine).toBe('machine-tts');
    expect(daveCast.voiceId).toMatch(/^mac_/);
    expect(daveCast.slot).toBe(5);
  });

  it('AudioPlayer renders Paradee-8M and Paradee + Machine (Mixed) options in the Select TTS Engine dropdown', () => {
    const handleChangeEngine = vi.fn();

    render(
      <AudioPlayer
        isPlaying={false}
        currentTimeMs={0}
        totalDurationMs={10000}
        onToggle={vi.fn()}
        ttsEngine="msedge-tts"
        onChangeTtsEngine={handleChangeEngine}
      />
    );

    const select = screen.getByRole('combobox', { name: /select tts engine/i });
    expect(screen.getByRole('option', { name: /microsoft tts/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /kokoro-tts/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /paradee-8m/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /paradee \+ machine \(mixed\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^machine tts$/i })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'paradee-tts' } });
    expect(handleChangeEngine).toHaveBeenCalledWith('paradee-tts');

    fireEvent.change(select, { target: { value: 'paradee-mixed' } });
    expect(handleChangeEngine).toHaveBeenCalledWith('paradee-mixed');
  });

  it('SettingsModal renders Paradee-8M Micro ONNX, Paradee + Machine Mixed Cast Mode, and AI Manuscript Parsers', () => {
    const mockModelStatus = {
      tts: {
        model_exists: false,
      },
      paradee: {
        model_exists: true,
      },
      parsers: {
        gemini: { configured: true },
        'unlimited-ocr': { reachable: false },
      },
    };

    render(
      <ThemeProvider>
        <SettingsModal onClose={vi.fn()} modelStatus={mockModelStatus} />
      </ThemeProvider>
    );

    expect(screen.getByText(/4\. Paradee-8M Micro ONNX/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Paradee \+ Machine Mixed Cast Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Manuscript Parsers/i)).toBeInTheDocument();
    expect(screen.getByText(/Paradee Ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Hybrid Ready/i)).toBeInTheDocument();
  });
});
