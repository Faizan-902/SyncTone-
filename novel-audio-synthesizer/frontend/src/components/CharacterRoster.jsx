import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { getSpeakerColor } from '../utils/speakerColors';
import {
  IconUsers,
  IconX,
  IconCheck,
  IconShield,
  IconMic,
} from './icons';

export default function CharacterRoster({
  chapterId,
  segments = [],
  onClose,
  onVoiceChange,
}) {
  const { isWriterOrAdmin } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [availableVoices, setAvailableVoices] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Aggregate detected characters and sample quotes from segments
  useEffect(() => {
    const charMap = new Map();

    for (const seg of segments) {
      const charKey = seg.character_id || seg.speaker_id;
      if (charKey && charKey !== 'narrator' && charKey !== 'unresolved') {
        const existing = charMap.get(charKey);
        if (existing) {
          existing.segmentCount++;
          if (!existing.sampleQuote && seg.type === 'dialogue' && seg.text) {
            existing.sampleQuote = seg.text;
          }
        } else {
          charMap.set(charKey, {
            id: charKey,
            name: seg.speaker_name || charKey,
            voiceId: seg.assigned_voice_id || seg.voice_id || 'en-GB-RyanNeural',
            segmentCount: 1,
            sampleQuote: seg.type === 'dialogue' ? seg.text : '',
          });
        }
      }
    }

    setCharacters(Array.from(charMap.values()));

    // Fetch voice palette from real endpoint
    api.voices
      .list()
      .then((data) => {
        setAvailableVoices(data.available_voices || {});
      })
      .catch((err) => {
        console.warn('[CharacterRoster] Failed to load voice catalog:', err.message);
      });
  }, [segments]);

  const handleVoiceSelect = async (characterId, newVoiceId) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUpdatingId(characterId);

    const prevVoice = characters.find((c) => c.id === characterId)?.voiceId;

    // Optimistic update
    setCharacters((prev) =>
      prev.map((c) => (c.id === characterId ? { ...c, voiceId: newVoiceId } : c))
    );

    try {
      await api.voices.assign({
        character_id: characterId,
        new_voice_id: newVoiceId,
        chapter_id: chapterId,
      });

      setSuccessMessage(`Updated voice for ${characterId} to ${newVoiceId}`);
      if (onVoiceChange) {
        onVoiceChange(characterId, newVoiceId);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err.message || 'Failed to update voice';
      setErrorMessage(msg);
      if (prevVoice) {
        setCharacters((prev) =>
          prev.map((c) => (c.id === characterId ? { ...c, voiceId: prevVoice } : c))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div
      className="fixed inset-y-0 right-0 w-96 max-w-full bg-[var(--bg-surface)]/95 backdrop-blur-2xl shadow-2xl border-l border-[var(--border-subtle)] z-50 flex flex-col transition-colors duration-250"
      role="dialog"
      aria-label="Character Roster"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 font-display">
            <IconUsers className="w-4 h-4 text-indigo-400" />
            <span>Voice Cast Roster</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {characters.length} character{characters.length === 1 ? '' : 's'} in chapter
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-xl hover:bg-[var(--bg-surface)] transition"
          aria-label="Close roster"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="p-0.5">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <IconCheck className="w-3.5 h-3.5" />
            <span>{successMessage}</span>
          </span>
          <button onClick={() => setSuccessMessage(null)} className="p-0.5">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {characters.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-xs">
            <IconUsers className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No speaking characters detected in this chapter.
          </div>
        ) : (
          characters.map((char) => {
            const color = getSpeakerColor(char.id);
            const isUpdating = updatingId === char.id;

            return (
              <div
                key={char.id}
                className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] space-y-3"
              >
                {/* Character Name & Dialogue count */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-main)] text-xs flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${color.border.replace('border', 'bg')}`} />
                    {char.name}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                    {char.segmentCount} {char.segmentCount === 1 ? 'line' : 'lines'}
                  </span>
                </div>

                {/* Sample Quote */}
                {char.sampleQuote && (
                  <p className="text-xs text-[var(--text-sub)] italic bg-[var(--bg-surface)] p-2.5 rounded-lg border border-[var(--border-subtle)] line-clamp-2 font-serif">
                    "{char.sampleQuote.replace(/^["“”]|["“”]$/g, '')}"
                  </p>
                )}

                {/* Voice Selection */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      <IconMic className="w-3 h-3 text-indigo-400" />
                      <span>Voice:</span>
                    </label>

                    {isWriterOrAdmin ? (
                      <select
                        value={char.voiceId}
                        disabled={isUpdating}
                        onChange={(e) => handleVoiceSelect(char.id, e.target.value)}
                        className="text-xs px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-[var(--text-main)] disabled:opacity-50"
                      >
                        {Object.entries(availableVoices).map(([archetype, voiceId]) => (
                          <option key={archetype} value={voiceId}>
                            {archetype} ({voiceId})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] font-mono text-indigo-400 bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                        {char.voiceId}
                      </span>
                    )}
                  </div>

                  {!isWriterOrAdmin && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-right flex items-center justify-end gap-1">
                      <IconShield className="w-3 h-3 text-[var(--text-muted)]" />
                      <span>Sign in as writer/admin to override voices.</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
