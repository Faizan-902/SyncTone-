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

  createPcmSilenceBuffer(durationMs) {
    const sampleCount = Math.floor((this.sampleRate * durationMs) / 1000);
    return Buffer.alloc(sampleCount * 2);
  }

  stitch(segments, chapterId) {
    const outputDir = config.paths.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timeline = [];
    const audioChunks = [];
    let currentMs = 0;
    let isAllMp3 = true;

    for (const seg of segments) {
      if (seg.format !== 'mp3') {
        isAllMp3 = false;
      }
    }

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const buffer = seg.audio_buffer || seg.pcm_buffer || Buffer.alloc(0);
      const durationMs = seg.duration_ms || 0;

      const startMs = currentMs;
      const endMs = startMs + durationMs;

      audioChunks.push(buffer);
      currentMs = endMs;

      timeline.push({
        segment_id: seg.segment_id,
        start_ms: startMs,
        end_ms: endMs,
        speaker_name: seg.speaker_name,
        voice_id: seg.voice_id,
      });
    }

    let finalAudioBuffer;
    let audioFormat = 'mp3';
    let outputFilename = `${chapterId}.mp3`;

    if (isAllMp3) {
      finalAudioBuffer = Buffer.concat(audioChunks);
      audioFormat = 'mp3';
      outputFilename = `${chapterId}.mp3`;
    } else {
      // PCM Fallback (WAV)
      const allPcm = Buffer.concat(audioChunks);
      const wavHeader = this.createWavHeader(allPcm.length);
      finalAudioBuffer = Buffer.concat([wavHeader, allPcm]);
      audioFormat = 'wav';
      outputFilename = `${chapterId}.wav`;
    }

    const audioFilePath = path.join(outputDir, outputFilename);
    fs.writeFileSync(audioFilePath, finalAudioBuffer);

    return {
      chapter_id: chapterId,
      audio_stream_url: `/api/stream/${chapterId}`,
      audio_url: `/api/stream/${chapterId}`,
      audio_format: audioFormat,
      total_duration_ms: currentMs,
      timeline,
    };
  }
}

const audioStitcher = new AudioStitcher();

module.exports = {
  audioStitcher,
};
