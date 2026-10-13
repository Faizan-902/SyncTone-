const fs = require('fs');
const path = require('path');
const { config } = require('../config');

const VOICE_PALETTE = {
  narrator: 'af_heart', // Neutral American female
  young_male: 'am_adam', // Young American male
  deep_male: 'am_onyx', // Deep American male
  calm_female: 'af_sky', // Calm American female
  energetic_female: 'af_bella', // Energetic American female
  british_male: 'bm_george', // British male
};

const KEYWORD_MAP = {
  captain: 'deep_male',
  commander: 'deep_male',
  general: 'deep_male',
  king: 'deep_male',
  lord: 'deep_male',
  beast: 'deep_male',
  giant: 'deep_male',
  warrior: 'deep_male',
  knight: 'deep_male',
  man: 'young_male',
  boy: 'young_male',
  prince: 'young_male',
  lad: 'young_male',
  sir: 'british_male',
  gentleman: 'british_male',
  butler: 'british_male',
  lady: 'calm_female',
  woman: 'calm_female',
  queen: 'calm_female',
  mother: 'calm_female',
  maiden: 'calm_female',
  girl: 'energetic_female',
  princess: 'energetic_female',
  child: 'energetic_female',
  lass: 'energetic_female',
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

class VoiceProfiler {
  constructor() {
    this.persistPath = path.resolve(config.paths.outputDir, 'voice_registry.json');
    this.registry = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf-8');
        this.registry = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[VoiceProfiler] Could not load registry:', err.message);
    }
  }

  save() {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.persistPath, JSON.stringify(this.registry, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[VoiceProfiler] Could not save registry:', err.message);
    }
  }

  resolveCharacterVoice(name, contextSnippet = '') {
    const charId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (this.registry[charId]) {
      return this.registry[charId];
    }

    if (charId === 'narrator' || name === 'Narrator') {
      return VOICE_PALETTE.narrator;
    }

    const combined = `${name} ${contextSnippet}`.toLowerCase();
    for (const [kw, archetype] of Object.entries(KEYWORD_MAP)) {
      if (combined.includes(kw)) {
        const voiceId = VOICE_PALETTE[archetype];
        this.registry[charId] = voiceId;
        this.save();
        return voiceId;
      }
    }

    const available = [
      VOICE_PALETTE.young_male,
      VOICE_PALETTE.calm_female,
      VOICE_PALETTE.deep_male,
      VOICE_PALETTE.energetic_female,
      VOICE_PALETTE.british_male,
    ];
    const index = simpleHash(charId) % available.length;
    const voiceId = available[index];
    this.registry[charId] = voiceId;
    this.save();
    return voiceId;
  }

  applyVoicesToSegments(segments) {
    return segments.map((seg) => {
      if (seg.type === 'narration' || seg.speaker_id === 'narrator') {
        return { ...seg, assigned_voice_id: VOICE_PALETTE.narrator };
      }
      const voiceId = this.resolveCharacterVoice(seg.speaker_name, seg.text);
      return { ...seg, assigned_voice_id: voiceId };
    });
  }

  getAvailableVoices() {
    return { ...VOICE_PALETTE };
  }

  getAllAssignments() {
    return { ...this.registry };
  }

  assignVoice(characterId, newVoiceId) {
    this.registry[characterId] = newVoiceId;
    this.save();
  }
}

const voiceProfiler = new VoiceProfiler();

module.exports = {
  voiceProfiler,
  VOICE_PALETTE,
};
