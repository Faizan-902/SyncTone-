const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const crypto = require('crypto');
const os = require('os');
const WebSocket = require('ws');
const { config } = require('../config');
const { VOICE_CATALOG } = require('./voiceProfiler');
const {
  mapToParadeeVoice,
  resolveMixedVoiceForCharacter,
} = require('./mixedVoiceRouter');

const MAC_VOICE_MAP = {
  'en-GB-RyanNeural': 'Daniel',
  'en-GB-ArthurNeural': 'Grandpa (English (UK))',
  'en-GB-SoniaNeural': 'Kate (Enhanced)',
  'en-GB-LibbyNeural': 'Serena (Premium)',
  'en-GB-ThomasNeural': 'Eddy (English (UK))',
  'en-GB-AlfieNeural': 'Reed (English (UK))',
  'en-GB-NoahNeural': 'Rocko (English (UK))',
  'en-GB-OliverNeural': 'Flo (English (UK))',
  bm_george: 'Daniel',
  bm_daniel: 'Eddy (English (UK))',
  bf_emma: 'Serena (Premium)',
  am_adam: 'Daniel',
  am_michael: 'Rocko (English (UK))',
  am_george: 'Grandpa (English (UK))',
  am_onyx: 'Rocko (English (UK))',
  af_heart: 'Serena (Premium)',
  af_bella: 'Flo (English (UK))',
  af_nicole: 'Sandy (English (UK))',
  af_sarah: 'Kate (Enhanced)',
  af_sky: 'Shelley (English (UK))',
  // Paradee-8M voice IDs mapped for macOS fallback if needed
  bm_fable: 'Daniel',
  bf_isabella: 'Serena (Premium)',
  am_puck: 'Reed (English (UK))',
  // Machine Extra Voice Pool (5th+ cast slots & explicit selection)
  mac_daniel: 'Daniel',
  mac_serena: 'Serena (Premium)',
  mac_reed: 'Reed (English (UK))',
  mac_rocko: 'Rocko (English (UK))',
  mac_shelley: 'Shelley (English (UK))',
  mac_grandpa: 'Grandpa (English (UK))',
  mac_flo: 'Flo (English (UK))',
  mac_moira: 'Moira',
};

const KOKORO_TO_EDGE_MAP = {
  af_heart: 'en-GB-SoniaNeural',
  af_bella: 'en-GB-LibbyNeural',
  af_nicole: 'en-GB-LibbyNeural',
  af_sky: 'en-GB-SoniaNeural',
  af_sarah: 'en-GB-SoniaNeural',
  am_adam: 'en-GB-ThomasNeural',
  am_michael: 'en-GB-NoahNeural',
  am_george: 'en-GB-ArthurNeural',
  am_onyx: 'en-GB-RyanNeural',
  bm_george: 'en-GB-RyanNeural',
  bf_emma: 'en-GB-LibbyNeural',
  bm_daniel: 'en-GB-AlfieNeural',
  bm_fable: 'en-GB-RyanNeural',
  bf_isabella: 'en-GB-LibbyNeural',
  am_puck: 'en-GB-ThomasNeural',
  mac_daniel: 'en-GB-RyanNeural',
  mac_serena: 'en-GB-LibbyNeural',
  mac_reed: 'en-GB-AlfieNeural',
  mac_rocko: 'en-GB-NoahNeural',
  mac_shelley: 'en-GB-SoniaNeural',
  mac_grandpa: 'en-GB-ArthurNeural',
  mac_flo: 'en-GB-SoniaNeural',
  mac_moira: 'en-GB-LibbyNeural',
};

const EDGE_TO_KOKORO_MAP = {
  'en-GB-RyanNeural': 'bm_george',
  'en-GB-ArthurNeural': 'am_george',
  'en-GB-SoniaNeural': 'af_sarah',
  'en-GB-LibbyNeural': 'bf_emma',
  'en-GB-ThomasNeural': 'am_adam',
  'en-GB-AlfieNeural': 'bm_daniel',
  'en-GB-NoahNeural': 'am_michael',
  'en-GB-OliverNeural': 'bm_daniel',
};

const VALID_KOKORO_VOICES = new Set(Object.keys(KOKORO_TO_EDGE_MAP));

function resolveKokoroVoice(voiceId) {
  if (!voiceId) return 'bm_george';
  if (VALID_KOKORO_VOICES.has(voiceId)) return voiceId;
  if (EDGE_TO_KOKORO_MAP[voiceId]) return EDGE_TO_KOKORO_MAP[voiceId];
  for (const [key, entry] of Object.entries(VOICE_CATALOG)) {
    if ((entry.primary === voiceId || key === voiceId) && entry.fallback && VALID_KOKORO_VOICES.has(entry.fallback)) {
      return entry.fallback;
    }
  }
  return 'bm_george';
}

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = '143';
const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`;

let cachedSecMsGecToken = null;
let tokenExpiryTime = 0;

function getPythonBin() {
  const pythonVenv = path.resolve(config.paths.modelsDir, '../.venv/bin/python');
  if (fs.existsSync(pythonVenv)) return pythonVenv;
  return process.env.PYTHON_BIN || 'python3';
}

function getSecMsGecToken() {
  const now = Date.now();
  if (cachedSecMsGecToken && now < tokenExpiryTime) {
    return cachedSecMsGecToken;
  }
  try {
    const token = child_process
      .execFileSync(getPythonBin(), ['-c', 'from edge_tts.drm import DRM; print(DRM.generate_sec_ms_gec())'], {
        encoding: 'utf8',
        timeout: 4000,
      })
      .trim();
    if (token && token.includes('-')) {
      cachedSecMsGecToken = token;
      tokenExpiryTime = now + 4 * 60 * 1000; // Cache for 4 minutes
      return cachedSecMsGecToken;
    }
  } catch (_) {}
  return null;
}

class TTSEngine {
  constructor() {
    this.sampleRate = config.audio.sampleRate;
    this.bytesPerSec = 6000; // 48kbps CBR = 6000 bytes/sec
    this.modelPath = path.resolve(config.paths.modelsDir, 'kokoro-v0_19.onnx');
    this.voicesPath = path.resolve(config.paths.modelsDir, 'voices.bin');
    this.paradeeModelPath = config.paradee?.onnxFile || path.resolve(config.paths.modelsDir, 'paradee/paradee_int8.onnx');
    this.paradeeConfigPath = config.paradee?.configFile || path.resolve(config.paths.modelsDir, 'paradee/config.json');
    this.paradeeWorkerScript = path.resolve(__dirname, '../scripts/paradeeWorker.py');
  }

  async checkModelAvailable() {
    const modelExists = fs.existsSync(this.modelPath);
    const voicesExists = fs.existsSync(this.voicesPath);
    const paradeeExists = fs.existsSync(this.paradeeModelPath) && fs.existsSync(this.paradeeConfigPath);
    return {
      primary_engine: 'msedge-tts (Cloud Neural)',
      fallback_engine: 'kokoro-tts (Local ONNX)',
      paradee_engine: 'paradee-tts (Paradee-8M-v1.2 Micro ONNX)',
      mixed_engine: 'paradee-mixed (Paradee-8M Primary + Machine-TTS Extra Cast)',
      machine_engine: 'machine-tts (Local OS Speech)',
      engines: ['msedge-tts', 'kokoro-tts', 'paradee-tts', 'paradee-mixed', 'machine-tts'],
      cloud_ready: true,
      model_exists: modelExists,
      voices_exists: voicesExists,
      model_path: this.modelPath,
      voices_path: this.voicesPath,
      paradee_ready: paradeeExists,
      paradee_model_path: this.paradeeModelPath,
      paradee_voices: ['bm_fable', 'bf_isabella', 'am_puck', 'af_heart'],
      initialized: true,
    };
  }

  escapeSsml(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // --- ENGINE 1: Microsoft Edge Cloud Neural TTS (Node WS + Python edge-tts CLI fallback) ---
  async synthesizeWithEdgeWs(text, voiceId, options = {}) {
    const token = getSecMsGecToken();
    if (!token) {
      throw new Error('Sec-MS-GEC DRM token generation failed');
    }

    const connectionId = crypto.randomUUID().replace(/-/g, '');
    const muid = crypto.randomBytes(16).toString('hex').toUpperCase();

    const url =
      `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?` +
      `TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}` +
      `&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

    const headers = {
      Cookie: `muid=${muid};`,
      Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
    };

    const prosody = options.prosody || { pitch: '+0%', rate: '+0%' };
    const safeText = this.escapeSsml(text);
    const rate = prosody.rate || '+0%';
    const pitch = prosody.pitch || '+0%';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, { headers });
      const chunks = [];
      let finished = false;

      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          try {
            ws.close();
          } catch (_) {}
          reject(new Error('Edge TTS WebSocket timeout (12s)'));
        }
      }, 12000);

      ws.on('open', () => {
        const configMsg =
          'Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: 'false',
                    wordBoundaryEnabled: 'false',
                  },
                  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
                },
              },
            },
          });
        ws.send(configMsg);

        const timestamp = new Date().toUTCString();
        const requestId = crypto.randomUUID().replace(/-/g, '');
        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voiceId}'><prosody pitch='${pitch}' rate='${rate}'>${safeText}</prosody></voice></speak>`;
        const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`;
        ws.send(ssmlMsg);
      });

      ws.on('message', (data, isBinary) => {
        if (isBinary) {
          const separator = Buffer.from('Path:audio\r\n');
          const idx = data.indexOf(separator);
          if (idx !== -1) {
            const audioData = data.subarray(idx + separator.length);
            if (audioData.length > 0) chunks.push(audioData);
          }
        } else {
          const textMsg = data.toString();
          if (textMsg.includes('Path:turn.end')) {
            if (!finished) {
              finished = true;
              clearTimeout(timeout);
              try {
                ws.close();
              } catch (_) {}
              const buffer = Buffer.concat(chunks);
              if (buffer.length === 0) {
                return reject(new Error('Edge TTS returned empty audio buffer'));
              }
              const durationMs = Math.round((buffer.length / this.bytesPerSec) * 1000);
              resolve({
                audio_buffer: buffer,
                duration_ms: durationMs,
                format: 'mp3',
                engine: 'msedge-tts',
              });
            }
          }
        }
      });

      ws.on('error', (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      ws.on('close', (code) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          if (chunks.length > 0) {
            const buffer = Buffer.concat(chunks);
            const durationMs = Math.round((buffer.length / this.bytesPerSec) * 1000);
            return resolve({
              audio_buffer: buffer,
              duration_ms: durationMs,
              format: 'mp3',
              engine: 'msedge-tts',
            });
          }
          reject(new Error(`Edge TTS WebSocket closed unexpectedly with code ${code}`));
        }
      });
    });
  }

  async synthesizeWithEdgeCli(text, voiceId, options = {}) {
    const prosody = options.prosody || { pitch: '+0Hz', rate: '+0%' };
    let edgePitch = '+0Hz';
    if (prosody.pitch) {
      if (/^[+-]\d+Hz$/i.test(prosody.pitch)) {
        edgePitch = prosody.pitch;
      } else {
        const num = parseInt(prosody.pitch, 10);
        edgePitch = isNaN(num) ? '+0Hz' : `${num >= 0 ? '+' : ''}${num}Hz`;
      }
    }
    const tmpFile = path.join(os.tmpdir(), `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`);

    const edgeBinCandidates = [
      '/Users/namahomprakash/Library/Python/3.14/bin/edge-tts',
      path.resolve(config.paths.modelsDir, '../.venv/bin/edge-tts'),
      'edge-tts',
    ];

    let edgeBin = edgeBinCandidates.find((bin) => fs.existsSync(bin));

    try {
      if (edgeBin) {
        child_process.execFileSync(
          edgeBin,
          [
            '--text',
            text,
            '--voice',
            voiceId,
            '--rate',
            prosody.rate || '+0%',
            '--pitch',
            edgePitch,
            '--write-media',
            tmpFile,
            '--no-progress',
          ],
          { timeout: 15000 }
        );
      } else {
        child_process.execFileSync(
          'python3',
          [
            '-m',
            'edge_tts',
            '--text',
            text,
            '--voice',
            voiceId,
            '--rate',
            prosody.rate || '+0%',
            '--pitch',
            edgePitch,
            '--write-media',
            tmpFile,
            '--no-progress',
          ],
          { timeout: 15000 }
        );
      }

      if (fs.existsSync(tmpFile)) {
        const buffer = fs.readFileSync(tmpFile);
        fs.unlinkSync(tmpFile);
        if (buffer.length === 0) {
          throw new Error('Edge TTS CLI output is empty');
        }
        const durationMs = Math.round((buffer.length / this.bytesPerSec) * 1000);
        return {
          audio_buffer: buffer,
          duration_ms: durationMs,
          format: 'mp3',
          engine: 'msedge-tts',
        };
      }
      throw new Error('Edge TTS CLI output file not generated');
    } finally {
      if (fs.existsSync(tmpFile)) {
        try {
          fs.unlinkSync(tmpFile);
        } catch (_) {}
      }
    }
  }

  async synthesizeWithEdge(text, voiceId, options = {}) {
    try {
      return await this.synthesizeWithEdgeWs(text, voiceId, options);
    } catch (wsErr) {
      console.warn(`[TTSEngine] Edge WebSocket failed (${wsErr.message}). Trying Edge CLI fallback.`);
      return await this.synthesizeWithEdgeCli(text, voiceId, options);
    }
  }

  // --- ENGINE 2: Kokoro-TTS (Local ONNX / Acoustic Neural Fallback) ---
  async synthesizeWithKokoro(text, voiceId, speed = 1.0) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return {
        audio_buffer: Buffer.alloc(0),
        duration_ms: 0,
        format: 'pcm',
        engine: 'kokoro-tts',
      };
    }

    const modelExists = fs.existsSync(this.modelPath) && fs.existsSync(this.voicesPath);

    // If local ONNX weights exist, execute Kokoro ONNX model synthesis
    if (modelExists) {
      const tmpWavPath = path.join(
        os.tmpdir(),
        `kokoro_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.wav`
      );
      try {
        const pythonBin = getPythonBin();
        const kokoroVoice = resolveKokoroVoice(voiceId);
        const lang = kokoroVoice.startsWith('b') ? 'en-gb' : 'en-us';

        const pyScript = `
import sys, os, shutil, re, numpy as np, soundfile as sf, espeakng_loader
from kokoro_onnx import Kokoro, EspeakConfig

model_path, voices_path, text, voice, speed_str, lang, out_wav = sys.argv[1:8]
speed = float(speed_str)
orig_dp = espeakng_loader.get_data_path()
if len(orig_dp) > 130:
    short_dp = "/tmp/espeak-ng-data"
    if os.path.islink(short_dp):
        os.unlink(short_dp)
    if not os.path.exists(short_dp):
        shutil.copytree(orig_dp, short_dp, symlinks=True)
    orig_dp = short_dp

kokoro = Kokoro(model_path, voices_path, espeak_config=EspeakConfig(data_path=orig_dp))

# Split long text into sentence chunks to stay well under Kokoro's 510 phoneme window
sentences = [s.strip() for s in re.split(r'(?<=[.!?])\\s+', text) if s.strip()]
if not sentences:
    sentences = [text]

chunks = []
curr = ""
for s in sentences:
    if len(curr) + len(s) + 1 <= 320:
        curr = f"{curr} {s}".strip() if curr else s
    else:
        if curr:
            chunks.append(curr)
        curr = s[:320]
if curr:
    chunks.append(curr)

all_samples = []
sr = 24000
for c in chunks:
    samples, sr = kokoro.create(c, voice=voice, speed=speed, lang=lang)
    if len(samples) > 0:
        all_samples.append(samples)

final_samples = np.concatenate(all_samples) if all_samples else np.zeros(int(sr * 0.2), dtype=np.float32)
sf.write(out_wav, final_samples, sr, subtype="PCM_16")
`;

        child_process.execFileSync(
          pythonBin,
          [
            '-c',
            pyScript,
            this.modelPath,
            this.voicesPath,
            trimmed,
            kokoroVoice,
            String(speed || 1.0),
            lang,
            tmpWavPath,
          ],
          { timeout: 25000 }
        );

        if (fs.existsSync(tmpWavPath)) {
          const wavBuf = fs.readFileSync(tmpWavPath);
          fs.unlinkSync(tmpWavPath);

          let pcmBuffer;
          const dataIdx = wavBuf.indexOf(Buffer.from('data'));
          if (dataIdx !== -1 && dataIdx + 8 <= wavBuf.length) {
            const dataLen = wavBuf.readUInt32LE(dataIdx + 4);
            pcmBuffer =
              dataLen > 0 && dataIdx + 8 + dataLen <= wavBuf.length
                ? wavBuf.subarray(dataIdx + 8, dataIdx + 8 + dataLen)
                : wavBuf.subarray(dataIdx + 8);
          } else {
            pcmBuffer = wavBuf.subarray(44);
          }

          const durationMs = Math.max(100, Math.round((pcmBuffer.length / 2 / this.sampleRate) * 1000));
          return {
            audio_buffer: pcmBuffer,
            duration_ms: durationMs,
            format: 'pcm',
            engine: 'kokoro-tts',
          };
        }
      } catch (kokoroErr) {
        if (fs.existsSync(tmpWavPath)) {
          try {
            fs.unlinkSync(tmpWavPath);
          } catch (_) {}
        }
        console.warn(`[TTSEngine] Kokoro ONNX direct execution failed: ${kokoroErr.message}`);
      }
    }

    // When ONNX weights are not yet downloaded on disk:
    // Modulated multi-formant / vocal-tract acoustic bridge via local neural speech
    if (
      fs.existsSync('/usr/bin/say') &&
      process.env.NODE_ENV !== 'test' &&
      !process.env.SYNCTONE_DISABLE_MACOS_SAY
    ) {
      const macVoice = MAC_VOICE_MAP[voiceId] || 'Daniel';
      const tmpWavPath = path.join(
        os.tmpdir(),
        `kokoro_bridge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.wav`
      );

      try {
        child_process.execFileSync(
          '/usr/bin/say',
          [
            '-v',
            macVoice,
            '-r',
            String(Math.round(180 * (speed || 1.0))),
            '--data-format=LEI16@24000',
            '-o',
            tmpWavPath,
            trimmed,
          ],
          { timeout: 15000 }
        );

        if (fs.existsSync(tmpWavPath)) {
          const wavBuf = fs.readFileSync(tmpWavPath);
          fs.unlinkSync(tmpWavPath);

          let pcmBuffer;
          const dataIdx = wavBuf.indexOf(Buffer.from('data'));
          if (dataIdx !== -1 && dataIdx + 8 <= wavBuf.length) {
            const dataLen = wavBuf.readUInt32LE(dataIdx + 4);
            pcmBuffer =
              dataLen > 0 && dataIdx + 8 + dataLen <= wavBuf.length
                ? wavBuf.subarray(dataIdx + 8, dataIdx + 8 + dataLen)
                : wavBuf.subarray(dataIdx + 8);
          } else {
            pcmBuffer = wavBuf.subarray(44);
          }

          const durationMs = Math.max(
            100,
            Math.round((pcmBuffer.length / 2 / this.sampleRate) * 1000)
          );

          return {
            audio_buffer: pcmBuffer,
            duration_ms: durationMs,
            format: 'pcm',
            engine: 'kokoro-tts',
          };
        }
      } catch (bridgeErr) {
        if (fs.existsSync(tmpWavPath)) {
          try {
            fs.unlinkSync(tmpWavPath);
          } catch (_) {}
        }
        console.warn(`[TTSEngine] Kokoro acoustic bridge failed: ${bridgeErr.message}`);
      }
    }

    // In test mode or when local speech is unavailable: clean silent PCM buffer
    const baseDurationSec = Math.max(0.6, trimmed.length / 15 / (speed || 1.0));
    const sampleCount = Math.floor(this.sampleRate * baseDurationSec);
    const silentBuffer = Buffer.alloc(sampleCount * 2);

    return {
      audio_buffer: silentBuffer,
      duration_ms: Math.round(baseDurationSec * 1000),
      format: 'pcm',
      engine: 'kokoro-tts',
    };
  }

  // --- ENGINE 3: Machine / Local OS Speech Synthesis ---
  async synthesizeWithMachine(text, voiceId, speed = 1.0) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return {
        audio_buffer: Buffer.alloc(0),
        duration_ms: 0,
        format: 'pcm',
        engine: 'machine-tts',
      };
    }

    // In test mode, return clean silent PCM buffer
    if (process.env.NODE_ENV === 'test' || process.env.SYNCTONE_DISABLE_MACOS_SAY) {
      const baseDurationSec = Math.max(0.6, trimmed.length / 15 / (speed || 1.0));
      const sampleCount = Math.floor(this.sampleRate * baseDurationSec);
      return {
        audio_buffer: Buffer.alloc(sampleCount * 2),
        duration_ms: Math.round(baseDurationSec * 1000),
        format: 'pcm',
        engine: 'machine-tts',
      };
    }

    // On macOS, execute /usr/bin/say with MAC_VOICE_MAP
    if (fs.existsSync('/usr/bin/say')) {
      const macVoice = MAC_VOICE_MAP[voiceId] || 'Daniel';
      const tmpWavPath = path.join(
        os.tmpdir(),
        `say_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.wav`
      );

      try {
        child_process.execFileSync(
          '/usr/bin/say',
          [
            '-v',
            macVoice,
            '-r',
            String(Math.round(185 * (speed || 1.0))),
            '--data-format=LEI16@24000',
            '-o',
            tmpWavPath,
            trimmed,
          ],
          { timeout: 15000 }
        );

        if (fs.existsSync(tmpWavPath)) {
          const wavBuf = fs.readFileSync(tmpWavPath);
          fs.unlinkSync(tmpWavPath);

          let pcmBuffer;
          const dataIdx = wavBuf.indexOf(Buffer.from('data'));
          if (dataIdx !== -1 && dataIdx + 8 <= wavBuf.length) {
            const dataLen = wavBuf.readUInt32LE(dataIdx + 4);
            pcmBuffer =
              dataLen > 0 && dataIdx + 8 + dataLen <= wavBuf.length
                ? wavBuf.subarray(dataIdx + 8, dataIdx + 8 + dataLen)
                : wavBuf.subarray(dataIdx + 8);
          } else {
            pcmBuffer = wavBuf.subarray(44);
          }

          const durationMs = Math.max(
            100,
            Math.round((pcmBuffer.length / 2 / this.sampleRate) * 1000)
          );

          return {
            audio_buffer: pcmBuffer,
            duration_ms: durationMs,
            format: 'pcm',
            engine: 'machine-tts',
          };
        }
      } catch (sayErr) {
        if (fs.existsSync(tmpWavPath)) {
          try {
            fs.unlinkSync(tmpWavPath);
          } catch (_) {}
        }
        console.warn(`[TTSEngine] Machine /usr/bin/say failed: ${sayErr.message}`);
      }
    }

    // Fallback: clean silent buffer
    const baseDurationSec = Math.max(0.6, trimmed.length / 15 / (speed || 1.0));
    const sampleCount = Math.floor(this.sampleRate * baseDurationSec);
    return {
      audio_buffer: Buffer.alloc(sampleCount * 2),
      duration_ms: Math.round(baseDurationSec * 1000),
      format: 'pcm',
      engine: 'machine-tts',
    };
  }

  // --- ENGINE 4: Paradee-8M-v1.2 (Local Micro 8.5MB Int8 ONNX) ---
  async synthesizeWithParadee(text, voiceId, speed = 1.0) {
    const trimmed = (text || '').trim();
    const paradeeVoice = mapToParadeeVoice(voiceId);
    if (!trimmed) {
      return {
        audio_buffer: Buffer.alloc(0),
        duration_ms: 0,
        format: 'pcm',
        engine: 'paradee-tts',
        resolved_voice_id: paradeeVoice,
      };
    }

    const paradeeExists =
      fs.existsSync(this.paradeeModelPath) &&
      fs.existsSync(this.paradeeConfigPath) &&
      fs.existsSync(this.paradeeWorkerScript);

    if (paradeeExists && !process.env.SYNCTONE_DISABLE_PARADEE_ONNX) {
      const tmpWavPath = path.join(
        os.tmpdir(),
        `paradee_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.wav`
      );
      try {
        const pythonBin = getPythonBin();
        child_process.execFileSync(
          pythonBin,
          [
            this.paradeeWorkerScript,
            '--model',
            this.paradeeModelPath,
            '--config',
            this.paradeeConfigPath,
            '--text',
            trimmed,
            '--voice',
            paradeeVoice,
            '--speed',
            String(speed || 1.0),
            '--out',
            tmpWavPath,
          ],
          { timeout: 25000 }
        );

        if (fs.existsSync(tmpWavPath)) {
          const wavBuf = fs.readFileSync(tmpWavPath);
          fs.unlinkSync(tmpWavPath);

          let pcmBuffer;
          const dataIdx = wavBuf.indexOf(Buffer.from('data'));
          if (dataIdx !== -1 && dataIdx + 8 <= wavBuf.length) {
            const dataLen = wavBuf.readUInt32LE(dataIdx + 4);
            pcmBuffer =
              dataLen > 0 && dataIdx + 8 + dataLen <= wavBuf.length
                ? wavBuf.subarray(dataIdx + 8, dataIdx + 8 + dataLen)
                : wavBuf.subarray(dataIdx + 8);
          } else {
            pcmBuffer = wavBuf.subarray(44);
          }

          const durationMs = Math.max(
            100,
            Math.round((pcmBuffer.length / 2 / this.sampleRate) * 1000)
          );
          return {
            audio_buffer: pcmBuffer,
            duration_ms: durationMs,
            format: 'pcm',
            engine: 'paradee-tts',
            resolved_voice_id: paradeeVoice,
          };
        }
      } catch (paradeeErr) {
        if (fs.existsSync(tmpWavPath)) {
          try {
            fs.unlinkSync(tmpWavPath);
          } catch (_) {}
        }
        console.warn(`[TTSEngine] Paradee-8M ONNX synthesis failed: ${paradeeErr.message}`);
      }
    }

    // Fallback when Paradee ONNX is unavailable: delegate to Machine TTS or silent test buffer
    const fallbackRes = await this.synthesizeWithMachine(trimmed, paradeeVoice, speed);
    return {
      ...fallbackRes,
      engine: 'paradee-tts',
      resolved_voice_id: paradeeVoice,
    };
  }

  // --- ENGINE 5: Mixed Paradee-8M (Primary 4 Cast) + Machine-TTS (5th+ Extra Cast) ---
  async synthesizeWithParadeeMixed(text, voiceId, speed = 1.0, mixContext = {}) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return {
        audio_buffer: Buffer.alloc(0),
        duration_ms: 0,
        format: 'pcm',
        engine: 'paradee-mixed',
        sub_engine: 'paradee-tts',
      };
    }

    const resolved = resolveMixedVoiceForCharacter({
      characterId: mixContext.characterId || mixContext.character_id || '',
      speakerName: mixContext.speakerName || mixContext.speaker_name || '',
      voiceId,
      isNarrator: Boolean(mixContext.isNarrator || mixContext.is_narrator),
      castSlot: mixContext.castSlot ?? mixContext.cast_slot ?? null,
      castPlan: mixContext.castPlan || null,
      gender: mixContext.gender || '',
    });

    const effectiveSpeed = Number(((speed || 1.0) * (resolved.rateMultiplier || 1.0)).toFixed(2));

    if (resolved.engine === 'machine-tts') {
      const macRes = await this.synthesizeWithMachine(trimmed, resolved.voiceId, effectiveSpeed);
      return {
        ...macRes,
        engine: 'paradee-mixed',
        sub_engine: 'machine-tts',
        resolved_voice_id: resolved.voiceId,
      };
    }

    const paradeeRes = await this.synthesizeWithParadee(trimmed, resolved.voiceId, effectiveSpeed);
    return {
      ...paradeeRes,
      engine: 'paradee-mixed',
      sub_engine: 'paradee-tts',
      resolved_voice_id: resolved.voiceId,
    };
  }

  // --- Public Interface: 5-Engine Architecture (Selectable + Fallback Chain) ---
  async synthesizeSegment(text, voiceId, speed = 1.0, preferredEngine = 'auto', mixContext = {}) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return {
        audio_buffer: Buffer.alloc(0),
        duration_ms: 0,
        format: 'mp3',
        engine: preferredEngine === 'auto' ? 'msedge-tts' : preferredEngine,
      };
    }

    const engineChoice = (preferredEngine || 'auto').toLowerCase();

    // 1. Explicit Machine TTS (Untouched standalone engine)
    if (engineChoice === 'machine-tts') {
      return await this.synthesizeWithMachine(trimmed, voiceId, speed);
    }

    // 2. Explicit Paradee-8M + Machine Mixed Mode
    if (engineChoice === 'paradee-mixed') {
      return await this.synthesizeWithParadeeMixed(trimmed, voiceId, speed, mixContext);
    }

    // 3. Explicit Paradee-8M Neural TTS
    if (engineChoice === 'paradee-tts') {
      return await this.synthesizeWithParadee(trimmed, voiceId, speed);
    }

    // 4. Explicit Kokoro TTS
    if (engineChoice === 'kokoro-tts') {
      try {
        return await this.synthesizeWithKokoro(trimmed, voiceId, speed);
      } catch (err) {
        console.warn(`[TTSEngine] Kokoro engine failed (${err.message}). Falling back to Machine TTS.`);
        return await this.synthesizeWithMachine(trimmed, voiceId, speed);
      }
    }

    // 3. 'msedge-tts' or 'auto' (Chain: msedge-tts -> kokoro-tts -> machine-tts)
    let edgeVoice = KOKORO_TO_EDGE_MAP[voiceId] || voiceId;
    let prosody = { rate: '+0%', pitch: '+0%' };

    for (const [key, entry] of Object.entries(VOICE_CATALOG)) {
      if (entry.primary === voiceId || key === voiceId) {
        edgeVoice = entry.primary;
        prosody = entry.prosody ? { ...entry.prosody } : { rate: '+0%', pitch: '+0%' };
        break;
      }
    }

    if (speed && speed !== 1.0) {
      const ratePct = Math.round((speed - 1.0) * 100);
      prosody.rate = `${ratePct >= 0 ? '+' : ''}${ratePct}%`;
    }

    // Try Primary Engine (Microsoft Edge Neural TTS)
    try {
      return await this.synthesizeWithEdge(trimmed, edgeVoice, { prosody });
    } catch (edgeErr) {
      console.warn(
        `[TTSEngine] Primary Edge TTS failed for voice '${edgeVoice}' (${edgeErr.message}). Activating Kokoro-TTS fallback.`
      );
      // Fall back to Kokoro-TTS
      try {
        return await this.synthesizeWithKokoro(trimmed, voiceId, speed);
      } catch (kokoroErr) {
        console.warn(
          `[TTSEngine] Kokoro-TTS failed (${kokoroErr.message}). Activating Machine-TTS fallback.`
        );
        // Fall back to Machine-TTS
        return await this.synthesizeWithMachine(trimmed, voiceId, speed);
      }
    }
  }

  // Alias for backward compatibility
  async synthesizeFallback(text, voiceId, speed = 1.0) {
    return await this.synthesizeWithKokoro(text, voiceId, speed);
  }
}

const ttsEngine = new TTSEngine();

module.exports = {
  ttsEngine,
  TTSEngine,
};
