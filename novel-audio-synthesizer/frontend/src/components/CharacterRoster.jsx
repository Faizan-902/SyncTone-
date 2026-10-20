import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { getSpeakerColor } from '../utils/speakerColors';

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
      className="fixed inset-y-0 right-0 w-88 max-w-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col animate-slideLeft"
      role="dialog"
      aria-label="Character Roster"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/70">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>👥</span> Character Roster
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {characters.length} character{characters.length === 1 ? '' : 's'} detected in this chapter
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
          aria-label="Close roster"
        >
          ✕
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
          <span>❌ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold ml-2">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <span>✔ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {characters.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <span className="text-3xl block mb-2">🎭</span>
            No speaking characters detected in this chapter.
          </div>
        ) : (
          characters.map((char) => {
            const color = getSpeakerColor(char.id);
            const isUpdating = updatingId === char.id;

            return (
              <div
                key={char.id}
                className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/70 space-y-3 transition"
              >
                {/* Character Name & Dialogue count */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${color.border.replace('border', 'bg')}`} />
                    {char.name}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                    {char.segmentCount} line{char.segmentCount === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Sample Quote */}
                {char.sampleQuote && (
                  <p className="text-xs text-gray-600 italic bg-white p-2.5 rounded-xl border border-gray-100 line-clamp-2">
                    "{char.sampleQuote.replace(/^["“”]|["“”]$/g, '')}"
                  </p>
                )}

                {/* Voice Selection / Read-Only View */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Voice:
                    </label>

                    {isWriterOrAdmin ? (
                      <select
                        value={char.voiceId}
                        disabled={isUpdating}
                        onChange={(e) => handleVoiceSelect(char.id, e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-none font-medium text-gray-800 disabled:opacity-50"
                      >
                        {Object.entries(availableVoices).map(([archetype, voiceId]) => (
                          <option key={archetype} value={voiceId}>
                            {archetype} ({voiceId})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-semibold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 flex items-center gap-1">
                        <span>🔒</span>
                        <span>{char.voiceId}</span>
                      </span>
                    )}
                  </div>

                  {!isWriterOrAdmin && (
                    <p className="text-[10px] text-gray-400 mt-1 text-right">
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
