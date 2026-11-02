/**
 * SyncTone — Earthy Luxury Speaker Color Palette & Utility
 *
 * Provides high-contrast, accessible color tokens for multi-voice dialogue
 * highlighting and narrator passages in the synchronized reader.
 */

export const SPEAKER_PALETTE = [
  // 1. Warm Bronze
  {
    hex: '#A88462',
    bg: 'bg-[#A88462]/10',
    border: 'border-[#A88462]',
    text: 'text-[#A88462]',
    badge: 'bg-[#A88462]/15 text-[#A88462] border-[#A88462]/30',
    ring: 'ring-[#A88462]',
  },
  // 2. Walnut Brown
  {
    hex: '#6B4A2E',
    bg: 'bg-[#6B4A2E]/10',
    border: 'border-[#6B4A2E]',
    text: 'text-[#6B4A2E]',
    badge: 'bg-[#6B4A2E]/15 text-[#6B4A2E] border-[#6B4A2E]/30',
    ring: 'ring-[#6B4A2E]',
  },
  // 3. Forest Olive
  {
    hex: '#5FA052',
    bg: 'bg-[#5FA052]/10',
    border: 'border-[#5FA052]',
    text: 'text-[#5FA052]',
    badge: 'bg-[#5FA052]/15 text-[#5FA052] border-[#5FA052]/30',
    ring: 'ring-[#5FA052]',
  },
  // 4. Warm Ochre
  {
    hex: '#C68A3C',
    bg: 'bg-[#C68A3C]/10',
    border: 'border-[#C68A3C]',
    text: 'text-[#C68A3C]',
    badge: 'bg-[#C68A3C]/15 text-[#C68A3C] border-[#C68A3C]/30',
    ring: 'ring-[#C68A3C]',
  },
  // 5. Soft Sand
  {
    hex: '#D5C4AE',
    bg: 'bg-[#D5C4AE]/15',
    border: 'border-[#D5C4AE]',
    text: 'text-[#D5C4AE]',
    badge: 'bg-[#D5C4AE]/20 text-[#D5C4AE] border-[#D5C4AE]/35',
    ring: 'ring-[#D5C4AE]',
  },
  // 6. Deep Espresso
  {
    hex: '#1A120E',
    bg: 'bg-[#1A120E]/20',
    border: 'border-[#1A120E]',
    text: 'text-[#D5C4AE]',
    badge: 'bg-[#1A120E]/30 text-[#D5C4AE] border-[#40362E]',
    ring: 'ring-[#1A120E]',
  },
  // 7. Terracotta
  {
    hex: '#BA4E3D',
    bg: 'bg-[#BA4E3D]/10',
    border: 'border-[#BA4E3D]',
    text: 'text-[#BA4E3D]',
    badge: 'bg-[#BA4E3D]/15 text-[#BA4E3D] border-[#BA4E3D]/30',
    ring: 'ring-[#BA4E3D]',
  },
  // 8. Charcoal
  {
    hex: '#4A4A46',
    bg: 'bg-[#4A4A46]/15',
    border: 'border-[#4A4A46]',
    text: 'text-[#D5C4AE]',
    badge: 'bg-[#4A4A46]/20 text-[#D5C4AE] border-[#4A4A46]/40',
    ring: 'ring-[#4A4A46]',
  },
];

export const NARRATOR_COLOR = {
  hex: '#D5C4AE',
  bg: 'bg-[#D5C4AE]/10',
  border: 'border-[#40362E]',
  text: 'text-[#D5C4AE]',
  badge: 'bg-[#3A2418] text-[#D5C4AE] border-[#40362E]',
  ring: 'ring-[#A88462]',
};

export function getSpeakerColor(speakerId) {
  if (!speakerId || speakerId === 'narrator') {
    return NARRATOR_COLOR;
  }
  let hash = 0;
  const str = String(speakerId).toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return SPEAKER_PALETTE[Math.abs(hash) % SPEAKER_PALETTE.length];
}
