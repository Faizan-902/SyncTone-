import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { getSpeakerColor } from '../utils/speakerColors';
import {
  IconUsers,
  IconLock,
  IconX,
  IconCheck,
  IconMic,
} from './icons';

const PARADEE_VOICE_OPTIONS = [
  { id: 'bm_fable', label: 'Fable — British Narrator/Lead (bm_fable)' },
  { id: 'bf_isabella', label: 'Isabella — British Female Lead (bf_isabella)' },
  { id: 'am_puck', label: 'Puck — Dynamic Male Lead (am_puck)' },
  { id: 'af_heart', label: 'Heart — Warm Female Lead (af_heart)' },
];

const MACHINE_EXTRA_VOICE_OPTIONS = [
  { id: 'mac_reed', label: 'Reed — British Male Extra (mac_reed)' },
  { id: 'mac_moira', label: 'Moira — Irish Female Extra (mac_moira)' },
  { id: 'mac_rocko', label: 'Rocko — Deep Male Extra (mac_rocko)' },
  { id: 'mac_shelley', label: 'Shelley — Clear Female Extra (mac_shelley)' },
  { id: 'mac_grandpa', label: 'Grandpa — Elder Male Extra (mac_grandpa)' },
  { id: 'mac_flo', label: 'Flo — Mature Female Extra (mac_flo)' },
  { id: 'mac_daniel', label: 'Daniel — Classic UK Male (mac_daniel)' },
  { id: 'mac_serena', label: 'Serena — Classic UK Female (mac_serena)' },
];

function getVoiceTierBadge(voiceId = '', rankIdx = 0) {
  if (['bm_fable', 'bf_isabella', 'am_puck', 'af_heart'].includes(voiceId)) {
    return { label: 'PARADEE-8M', color: 'text-[var(--text-main)] border-[var(--border-strong)] bg-[var(--bg-surface)]' };
  }
  if (String(voiceId).startsWith('mac_')) {
    return { label: 'MACHINE EXTRA', color: 'text-[var(--text-sub)] border-[var(--border-subtle)] bg-[var(--bg-surface)]' };
  }
  if (rankIdx < 3) {
    return { label: 'PRIMARY CAST', color: 'text-[var(--text-main)] border-[var(--border-strong)] bg-[var(--bg-surface)]' };
  }
  return { label: 'EXTRA ENSEMBLE', color: 'text-[var(--text-sub)] border-[var(--border-subtle)] bg-[var(--bg-surface)]' };
}

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
            voiceId: seg.assigned_voice_id || seg.voice_id || 'en-GB-ThomasNeural',
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
    if (!newVoiceId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setUpdatingId(characterId);

    // Save previous for rollback
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
      // Safe compensation & reconciliation on failure
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
      className="fixed inset-y-0 right-0 w-88 max-w-full bg-[var(--bg-surface)] shadow-2xl border-l border-[var(--border-subtle)] z-50 flex flex-col animate-slideLeft transition-colors duration-200"
      role="dialog"
      aria-label="Character Roster"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div>
          <h2 className="text-sm font-bold font-sans uppercase tracking-tight text-[var(--text-main)] flex items-center gap-2">
            <IconUsers className="w-4 h-4 text-[var(--text-main)]" />
            <span>Character Roster</span>
          </h2>
          <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
            {characters.length} character{characters.length === 1 ? '' : 's'} detected in this chapter
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-[1px] hover:bg-[var(--bg-hover)] transition cursor-pointer"
          aria-label="Close roster"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[1px] text-[var(--text-main)] text-xs font-mono flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-[var(--text-main)] font-bold ml-2 cursor-pointer">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-3 p-3 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[1px] text-[var(--text-main)] text-xs font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <IconCheck className="w-3.5 h-3.5" />
            <span>{successMessage}</span>
          </span>
          <button onClick={() => setSuccessMessage(null)} className="text-[var(--text-main)] font-bold ml-2 cursor-pointer">
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {characters.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-xs font-mono">
            <IconMic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No speaking characters detected in this chapter.
          </div>
        ) : (
          characters.map((char, idx) => {
            const isUpdating = updatingId === char.id;
            const tierBadge = getVoiceTierBadge(char.voiceId, idx);

            return (
              <div
                key={char.id}
                className="p-4 bg-[var(--bg-card)] rounded-[1px] border border-[var(--border-subtle)] space-y-3"
              >
                {/* Character Name & Dialogue count */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold font-sans uppercase tracking-tight text-xs text-[var(--text-main)] flex items-center gap-1.5 min-w-0 truncate">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--text-main)]" />
                    <span className="truncate">{char.name}</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[1px] border ${tierBadge.color}`}>
                      {tierBadge.label}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded-[1px] border border-[var(--border-subtle)]">
                      {char.segmentCount} line{char.segmentCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Sample Quote */}
                {char.sampleQuote && (
                  <p className="text-xs text-[var(--text-sub)] italic bg-[var(--bg-surface)] p-2.5 rounded-[1px] border border-[var(--border-subtle)] line-clamp-2 font-serif">
                    "{char.sampleQuote.replace(/^["“”]|["“”]$/g, '')}"
                  </p>
                )}

                {/* Voice Selection / Read-Only View */}
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      VOICE:
                    </label>

                    {isWriterOrAdmin ? (
                      <select
                        value={char.voiceId}
                        disabled={isUpdating}
                        onChange={(e) => handleVoiceSelect(char.id, e.target.value)}
                        className="text-xs px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[1px] focus:outline-none focus:border-[var(--text-main)] transition font-mono text-[var(--text-main)] disabled:opacity-50 min-w-0 max-w-[210px] truncate"
                      >
                        <optgroup label="Edge / Kokoro & Archetypes">
                          {Object.entries(availableVoices).map(([archetype, voiceId]) => (
                            <option key={archetype} value={voiceId}>
                              {archetype} ({voiceId})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Paradee-8M Neural (Primary 4)">
                          {PARADEE_VOICE_OPTIONS.map((opt) => (
                            <option key={`paradee_${opt.id}`} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Machine Extra Voices (5th+ Cast)">
                          {MACHINE_EXTRA_VOICE_OPTIONS.map((opt) => (
                            <option key={`machine_${opt.id}`} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    ) : (
                      <span className="text-xs font-mono text-[var(--text-sub)] bg-[var(--bg-surface)] px-2 py-1 rounded-[1px] border border-[var(--border-subtle)] flex items-center gap-1">
                        <IconLock className="w-3 h-3 text-[var(--text-main)]" />
                        <span>{char.voiceId}</span>
                      </span>
                    )}
                  </div>

                  {!isWriterOrAdmin && (
                    <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1 text-right">
                      Sign in as writer/admin to override voices.
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
