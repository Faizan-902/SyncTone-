import React, { useState, useEffect } from 'react';

export default function CharacterRoster({ chapterId, segments, onClose, onVoiceChange }) {
  const [characters, setCharacters] = useState([]);
  const [availableVoices, setAvailableVoices] = useState({});

  useEffect(() => {
    const charMap = new Map();
    for (const seg of segments) {
      if (seg.speaker_id && seg.speaker_id !== 'narrator' && seg.speaker_id !== 'unresolved') {
        const existing = charMap.get(seg.speaker_id);
        if (existing) {
          existing.segmentCount++;
        } else {
          charMap.set(seg.speaker_id, {
            id: seg.speaker_id,
            name: seg.speaker_name,
            voiceId: seg.assigned_voice_id,
            segmentCount: 1,
          });
        }
      }
    }
    setCharacters(Array.from(charMap.values()));

    fetch('/api/voices')
      .then((r) => r.json())
      .then((data) => setAvailableVoices(data.available_voices || {}))
      .catch(() => {});
  }, [segments]);

  const handleVoiceChange = async (characterId, newVoiceId) => {
    try {
      await fetch('/api/voices/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          new_voice_id: newVoiceId,
          chapter_id: chapterId,
        }),
      });

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === characterId ? { ...c, voiceId: newVoiceId } : c,
        ),
      );

      if (onVoiceChange) {
        onVoiceChange(characterId, newVoiceId);
      }
    } catch (err) {
      console.error('Failed to assign voice:', err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">👥 Characters</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {characters.length === 0 ? (
          <p className="text-sm text-gray-500">No characters detected yet.</p>
        ) : (
          characters.map((char) => (
            <div
              key={char.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">{char.name}</span>
                <span className="text-xs text-gray-400">
                  {char.segmentCount} line{char.segmentCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Voice:</label>
                <select
                  value={char.voiceId}
                  onChange={(e) => handleVoiceChange(char.id, e.target.value)}
                  className="flex-1 text-xs px-2 py-1 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                >
                  {Object.entries(availableVoices).map(([archetype, voiceId]) => (
                    <option key={archetype} value={voiceId}>
                      {archetype} ({voiceId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
