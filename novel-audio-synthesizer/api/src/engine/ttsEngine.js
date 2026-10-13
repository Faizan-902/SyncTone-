const fs = require('fs');
const path = require('path');
const { config } = require('../config');

class TTSEngine {
  constructor() {
    this.sampleRate = config.audio.sampleRate;
    this.modelPath = path.resolve(config.paths.modelsDir, 'kokoro-v0_19.onnx');
    this.voicesPath = path.resolve(config.paths.modelsDir, 'voices.bin');
  }

  async checkModelAvailable() {
    const modelExists = fs.existsSync(this.modelPath);
    const voicesExists = fs.existsSync(this.voicesPath);
    return {
      model_exists: modelExists,
      voices_exists: voicesExists,
      model_path: this.modelPath,
      voices_path: this.voicesPath,
      initialized: modelExists && voicesExists,
    };
  }

  async synthesizeSegment(text, voiceId, speed = 1.0) {
    const trimmed = text.trim();
    if (!trimmed) {
      const silenceCount = Math.floor(this.sampleRate * 0.1);
      return {
        pcm_buffer: Buffer.alloc(silenceCount * 2),
        duration_ms: 100,
      };
    }

    const baseDurationSec = Math.max(0.6, trimmed.length / 15 / speed);
    const sampleCount = Math.floor(this.sampleRate * baseDurationSec);
    const buffer = Buffer.alloc(sampleCount * 2);

    const voicePitchMap = {
      af_heart: 220,
      af_sky: 246,
      af_bella: 261,
      am_adam: 130,
      am_onyx: 98,
      bm_george: 146,
    };
    const fundamentalFreq = voicePitchMap[voiceId] || 160;

    for (let i = 0; i < sampleCount; i++) {
      const t = i / this.sampleRate;
      const envelope = Math.sin((Math.PI * i) / sampleCount);
      const s1 = Math.sin(2 * Math.PI * fundamentalFreq * t);
      const s2 = 0.3 * Math.sin(2 * Math.PI * fundamentalFreq * 2 * t);
      const sampleVal = Math.floor((s1 + s2) * envelope * 8000);
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sampleVal)), i * 2);
    }

    const durationMs = Math.round(baseDurationSec * 1000);
    return {
      pcm_buffer: buffer,
      duration_ms: durationMs,
    };
  }
}

const ttsEngine = new TTSEngine();

module.exports = {
  ttsEngine,
};
