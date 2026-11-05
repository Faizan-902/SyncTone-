/**
 * SyncTone — Pluggable 3-Tier Manuscript Parser Dispatcher
 *
 * Tier 1 (`heuristic`): Fast local Python/foliate heuristic extraction (`parseUploadedBook.py`)
 * Tier 2 (`gemini`): Cloud Multimodal AI (`gemini-2.5-flash` structured JSON extraction + attribution)
 * Tier 3 (`unlimited-ocr`): Self-hosted Baidu Unlimited-OCR via vLLM (`UNLIMITED_OCR_URL`)
 */

const { parseWithGemini } = require('./geminiParser');
const { parseWithUnlimitedOcr, checkUnlimitedOcrAvailable } = require('./unlimitedOcrParser');
const { config } = require('../../config');

async function parseUploadedManuscript(filePath, options = {}) {
  const engine = String(options.parserEngine || options.parser_engine || 'heuristic')
    .toLowerCase()
    .trim();
  const runLocalExtractor = options.runLocalExtractor;

  if (engine === 'gemini') {
    try {
      return await parseWithGemini(filePath, options);
    } catch (geminiErr) {
      if (options.strict) {
        throw geminiErr;
      }
      console.warn(
        `[Parsers] Gemini parser failed (${geminiErr.message}). Falling back to local heuristic extractor.`
      );
      if (typeof runLocalExtractor === 'function') {
        const fallbackData = await runLocalExtractor(filePath);
        return {
          ...fallbackData,
          parser_engine: 'heuristic',
          parser_fallback_reason: geminiErr.message,
        };
      }
      throw geminiErr;
    }
  }

  if (engine === 'unlimited-ocr') {
    try {
      return await parseWithUnlimitedOcr(filePath, options);
    } catch (ocrErr) {
      if (options.strict) {
        throw ocrErr;
      }
      console.warn(
        `[Parsers] Unlimited-OCR parser failed (${ocrErr.message}). Falling back to local heuristic extractor.`
      );
      if (typeof runLocalExtractor === 'function') {
        const fallbackData = await runLocalExtractor(filePath);
        return {
          ...fallbackData,
          parser_engine: 'heuristic',
          parser_fallback_reason: ocrErr.message,
        };
      }
      throw ocrErr;
    }
  }

  if (engine === 'ollama') {
    if (typeof runLocalExtractor !== 'function') {
      throw new Error('runLocalExtractor callback is required for ollama parser.');
    }
    const heuristicData = await runLocalExtractor(filePath);
    return {
      ...heuristicData,
      parser_engine: 'ollama',
    };
  }

  if (typeof runLocalExtractor !== 'function') {
    throw new Error('runLocalExtractor callback is required for heuristic parser.');
  }

  const heuristicData = await runLocalExtractor(filePath);
  return {
    ...heuristicData,
    parser_engine: 'heuristic',
  };
}

async function getParsersStatus(options = {}) {
  const geminiConfigured = Boolean(
    (options.geminiApiKey ?? config.gemini?.apiKey ?? process.env.GEMINI_API_KEY ?? '').trim()
  );
  const geminiModel = config.gemini?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const unlimitedOcrStatus = await checkUnlimitedOcrAvailable(options);

  let ollamaAvailable = false;
  try {
    const ollamaUrl = (options.ollamaUrl || config.ollama?.url || 'http://localhost:11434').replace(/\/+$/, '');
    const fetchImpl = options.fetchImpl || global.fetch;
    const res = await fetchImpl(`${ollamaUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(1200) });
    ollamaAvailable = res.ok;
  } catch (_) {
    ollamaAvailable = false;
  }

  const ocrStatus = {
    available: unlimitedOcrStatus.available,
    reachable: unlimitedOcrStatus.available,
    url: unlimitedOcrStatus.url,
    model: unlimitedOcrStatus.model,
    label: 'Baidu Unlimited-OCR (Self-Hosted vLLM)',
  };

  return {
    heuristic: {
      available: true,
      reachable: true,
      label: 'Fast Local Heuristic (EPUB / PDF / TXT)',
    },
    gemini: {
      available: geminiConfigured,
      reachable: geminiConfigured,
      configured: geminiConfigured,
      model: geminiModel,
      label: `Google Gemini Multimodal (${geminiModel})`,
    },
    unlimited_ocr: ocrStatus,
    'unlimited-ocr': ocrStatus,
    ollama: {
      available: ollamaAvailable,
      reachable: ollamaAvailable,
      url: config.ollama?.url || 'http://localhost:11434',
      model: config.ollama?.model || 'llama3:8b',
      label: 'Local Ollama Engine',
    },
  };
}

module.exports = {
  parseUploadedManuscript,
  getParsersStatus,
};
