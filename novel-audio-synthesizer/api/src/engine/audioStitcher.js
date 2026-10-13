const fs = require('fs');
const path = require('path');
const { config } = require('../config');

class AudioStitcher {
  constructor() {
    this.sampleRate = config.audio.sampleRate;
    this.pauseMs = config.audio.interSpeakerPauseMs;
  }

  createWavHeader(dataByteLength) {
    const header = Buffer.alloc(44);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (this.sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataByteLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(this.sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataByteLength, 40);

    return header;
  }

  createSilenceBuffer(durationMs) {
    const sampleCount = Math.floor((this.sampleRate * durationMs) / 1000);
    return Buffer.alloc(sampleCount * 2);
  }

  stitch(segments, chapterId) {
    const outputDir = config.paths.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timeline = [];
    const pcmChunks = [];
    let currentMs = 0;
    let prevVoice = null;

    for (const seg of segments) {
      if (prevVoice !== null && seg.voice_id !== prevVoice) {
        const silence = this.createSilenceBuffer(this.pauseMs);
        pcmChunks.push(silence);
        currentMs += this.pauseMs;
      }

      const startMs = currentMs;
      const endMs = startMs + seg.duration_ms;

      pcmChunks.push(seg.pcm_buffer);
      currentMs = endMs;

      timeline.push({
        segment_id: seg.segment_id,
        start_ms: startMs,
        end_ms: endMs,
        speaker_name: seg.speaker_name,
        voice_id: seg.voice_id,
      });

      prevVoice = seg.voice_id;
    }

    const allPcm = Buffer.concat(pcmChunks);
    const wavHeader = this.createWavHeader(allPcm.length);
    const fullWav = Buffer.concat([wavHeader, allPcm]);

    const audioFilePath = path.join(outputDir, `${chapterId}.wav`);
    fs.writeFileSync(audioFilePath, fullWav);

    return {
      chapter_id: chapterId,
      audio_stream_url: `/api/stream/${chapterId}`,
      audio_format: 'wav',
      total_duration_ms: currentMs,
      timeline,
    };
  }
}

const audioStitcher = new AudioStitcher();

module.exports = {
  audioStitcher,
};
