/**
 * CharacterRoster — Sidebar drawer for character voice management.
 *
 * Lists all detected characters with their assigned voices.
 * Allows manual voice reassignment.
 */

import React, { useState, useEffect } from 'react';
import type { Segment, VoiceInfo } from '../types';

interface CharacterRosterProps {
  chapterId: string;
  segments: Segment[];
  onClose: () => void;
}

interface CharacterEntry {
  id: string;
  name: string;
  voiceId: string;
  segmentCount: number;
}

export default function CharacterRoster({ chapterId, segments, onClose }: CharacterRosterProps) {
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo>({});

  useEffect(() => {
    // Build character list from segments
    const charMap = new Map<string, CharacterEntry>();
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

    // Fetch available voices
    fetch('/api/voices')
      .then((r) => r.json())
      .then((data) => setAvailableVoices(data.available_voices || {}))
      .catch(() => {});
  }, [segments]);

  const handleVoiceChange = async (characterId: string, newVoiceId: string) => {
    try {
      await fetch('/api/voices/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, new_voice_id: newVoiceId }),
      });

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === characterId ? { ...c, voiceId: newVoiceId } : c,
        ),
      );
    } catch (err) {
      console.error('Failed to assign voice:', err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">👥 Characters</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      {/* Character list */}
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
              <select
                value={char.voiceId}
                onChange={(e) => handleVoiceChange(char.id, e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(availableVoices).map(([archetype, voiceId]) => (
                  <option key={voiceId} value={voiceId}>
                    {voiceId} ({archetype})
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      {/* Footer note */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
        Voice changes require re-synthesis to take effect.
      </div>
    </div>
  );
}
