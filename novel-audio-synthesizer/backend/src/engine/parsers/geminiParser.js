/**
 * SyncTone — Tier 2 Cloud Multimodal AI Parser (Google Gemini Flash)
 *
 * Uses Google's Gemini REST API (`generateContent` with `responseMimeType: "application/json"`)
 * to parse uploaded PDFs, images, or noisy EPUB/text manuscripts into structured
 * chapters, attributed dialogue/narration segments, and a character roster in a single pass.
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../../config');
const { voiceProfiler } = require('../voiceProfiler');

const GEMINI_SYSTEM_PROMPT = `You are SyncTone's literary manuscript parser and multi-voice dialogue attribution engine.
Analyze the provided book/manuscript content and return ONLY valid JSON matching this exact structure:
{
  "title": "Book Title",
  "author": "Author Name",
  "synopsis": "1-2 sentence synopsis of the work",
  "global_tone": "e.g., British Fantasy, Victorian Mystery, Sci-Fi Thriller",
  "characters": [
    {
      "name": "Canonical Character Name",
      "gender": "male | female | neutral",
      "age_band": "young | adult | elder",
      "accent": "british | american",
      "role": "narrator | protagonist | supporting"
    }
  ],
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Chapter Title",
      "segments": [
        {
          "order": 1,
          "type": "narration | dialogue",
          "speaker_name": "Narrator or Canonical Character Name",
          "text": "Exact clean literary text of the segment (artifacts, page numbers, and OCR headers stripped)",
          "confidence": 0.95
        }
      ]
    }
  ]
}

Rules:
1. Strip running headers, page numbers, ISBN blocks, table-of-contents noise, and OCR gibberish.
2. Separate narration from spoken dialogue into sequential segments.
3. Attribute every dialogue segment to the speaking character's canonical name using explicit dialogue tags, conversational turn-taking (A-B-A-B), and vocative address cues.
4. Narration segments must have type="narration" and speaker_name="Narrator".`;

function normalizeSpeakerId(name = '') {
  const cleaned = String(name || 'Narrator')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'narrator';
}

function normalizeGeminiPayload(rawJson, fallbackTitle = 'Untitled Novel') {
  const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  const characters = Array.isArray(parsed?.characters) ? parsed.characters : [];
  const rawChapters = Array.isArray(parsed?.chapters) ? parsed.chapters : [];

  const chapters = rawChapters
    .map((ch, idx) => {
      const rawSegs = Array.isArray(ch?.segments) ? ch.segments : [];
      const segments = rawSegs
        .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 0)
        .map((s, sIdx) => {
          const isNarration =
            String(s.type || '').toLowerCase() === 'narration' ||
            String(s.speaker_name || '').toLowerCase() === 'narrator';
          const speakerName = isNarration ? 'Narrator' : String(s.speaker_name || 'Narrator').trim();
          const speakerId = isNarration ? 'narrator' : normalizeSpeakerId(speakerName);
          const voiceId = isNarration
            ? 'en-GB-RyanNeural'
            : voiceProfiler.resolveCharacterVoice(speakerName, s.text);

          return {
            order: sIdx + 1,
            segment_id: sIdx + 1,
            type: isNarration ? 'narration' : 'dialogue',
            speaker_id: speakerId,
            speaker_name: speakerName,
            character_id: speakerId,
            voice_id: voiceId,
            assigned_voice_id: voiceId,
            text: s.text.trim(),
            confidence: typeof s.confidence === 'number' ? Math.min(1, Math.max(0, s.confidence)) : 0.94,
            source: 'gemini_ai',
            needs_review: false,
          };
        });

      const joinedText =
        typeof ch?.text === 'string' && ch.text.trim().length > 0
          ? ch.text.trim()
          : segments.map((s) => s.text).join('\n\n');

      return {
        chapter_number: Number(ch?.chapter_number) || idx + 1,
        title: String(ch?.title || `Chapter ${idx + 1}`).trim(),
        text: joinedText,
        segments,
      };
    })
    .filter((ch) => ch.text.length > 0 || ch.segments.length > 0);

  return {
    title: String(parsed?.title || fallbackTitle).trim(),
    author: String(parsed?.author || '').trim(),
    synopsis: String(parsed?.synopsis || '').trim(),
    global_tone: String(parsed?.global_tone || 'Dramatic Literary').trim(),
    cover_url: parsed?.cover_url || null,
    parser_engine: 'gemini',
    characters,
    chapters,
  };
}

/**
 * Calls Google Gemini REST API (`generateContent`) with either inline binary PDF/image data
 * or pre-extracted text from local heuristic helper.
 */
async function parseWithGemini(filePath, options = {}) {
  const apiKey = options.apiKey || config.gemini?.apiKey || process.env.GEMINI_API_KEY || '';
  const model = options.model || config.gemini?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = options.timeoutMs || config.gemini?.timeoutMs || 90000;
  const fetchImpl = options.fetchImpl || global.fetch;

  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured on the server.');
    err.code = 'GEMINI_KEY_MISSING';
    throw err;
  }

  const ext = path.extname(filePath).toLowerCase();
  const baseTitle = path.basename(filePath, ext).replace(/[_-]+/g, ' ').trim() || 'Untitled Novel';

  const parts = [{ text: GEMINI_SYSTEM_PROMPT }];
  let localPreExtract = null;

  if (ext === '.pdf' && fs.existsSync(filePath) && fs.statSync(filePath).size <= 18 * 1024 * 1024) {
    const pdfBase64 = fs.readFileSync(filePath).toString('base64');
    parts.push({
      inline_data: {
        mime_type: 'application/pdf',
        data: pdfBase64,
      },
    });
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) && fs.existsSync(filePath)) {
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    parts.push({
      inline_data: {
        mime_type: mimeMap[ext] || 'image/png',
        data: fs.readFileSync(filePath).toString('base64'),
      },
    });
  } else if (typeof options.runLocalExtractor === 'function') {
    localPreExtract = await options.runLocalExtractor(filePath);
    const chapterSample = (localPreExtract?.chapters || [])
      .slice(0, 15)
      .map((c, idx) => `=== CHAPTER ${idx + 1}: ${c.title || ''} ===\n${String(c.text || '').slice(0, 18000)}`)
      .join('\n\n');
    parts.push({
      text: `Book Title Hint: ${localPreExtract?.title || baseTitle}\nAuthor Hint: ${localPreExtract?.author || ''}\n\nManuscript Content:\n${chapterSample}`,
    });
  } else if (fs.existsSync(filePath)) {
    const rawText = fs.readFileSync(filePath, 'utf-8').slice(0, 120000);
    parts.push({
      text: `Book Title Hint: ${baseTitle}\n\nManuscript Content:\n${rawText}`,
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const candidateText =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

  if (!candidateText.trim()) {
    throw new Error('Gemini API returned an empty response.');
  }

  const cleanedJsonText = candidateText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const normalized = normalizeGeminiPayload(cleanedJsonText, localPreExtract?.title || baseTitle);
  if (!normalized.cover_url && localPreExtract?.cover_url) {
    normalized.cover_url = localPreExtract.cover_url;
  }
  return normalized;
}

module.exports = {
  parseWithGemini,
  normalizeGeminiPayload,
  GEMINI_SYSTEM_PROMPT,
};
