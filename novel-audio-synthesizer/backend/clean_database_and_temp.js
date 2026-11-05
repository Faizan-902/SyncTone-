/**
 * SyncTone — Dedicated Cleaning Script
 *
 * Purges scanner/Internet Archive boilerplate from chapters (both MongoDB & local chaptersDir)
 * and cleans up orphan upload files in /tmp and data/uploads.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const { config } = require('./src/config');
const { Chapter } = require('./src/models');

const BOILERPLATE_PATTERNS = [
  /The text on this page is estimated to be only \d+/i,
  /This book was produced in EPUB format by the Internet Archive/i,
  /The book pages were scanned and converted to EPUB format automatically/i,
  /Notice:\s*The book may not offer the correct reading sequence/i,
  /The book may not offer the correct reading sequence because of missing or misordered pages/i,
  /The hidden page numbering which may be available to your ereader/i,
  /The Internet Archive is working to improve the scanning process/i,
  /The Internet Archive was founded in 1996/i,
  /This book is available for free download in a number of formats/i,
  /Access-restricted-item\s+true/i,
  /Addeddate\s+\d{4}-\d{2}-\d{2}/i,
  /Boxid\s+IA\d+/i,
  /Scanner\s+Internet Archive/i,
];

function isBoilerplateLine(line) {
  if (!line || !line.trim()) return false;
  const trimmed = line.trim();
  if (/^Page\s+\d+$/i.test(trimmed)) return true;
  return BOILERPLATE_PATTERNS.some((pat) => pat.test(trimmed));
}

async function cleanLocalChaptersDir() {
  const chaptersDir = config.paths?.chaptersDir;
  if (!chaptersDir || !fs.existsSync(chaptersDir)) {
    console.log('[Clean] No local chaptersDir found at:', chaptersDir);
    return;
  }

  console.log('[Clean] Scanning local chaptersDir:', chaptersDir);
  const entries = fs.readdirSync(chaptersDir, { withFileTypes: true });
  let cleanedCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const chapterPath = path.join(chaptersDir, entry.name);
    const rawTxtPath = path.join(chapterPath, 'raw.txt');

    if (fs.existsSync(rawTxtPath)) {
      try {
        const content = fs.readFileSync(rawTxtPath, 'utf8');
        const lines = content.split(/\r?\n/);
        const filteredLines = lines.filter((l) => !isBoilerplateLine(l));

        if (filteredLines.length !== lines.length) {
          fs.writeFileSync(rawTxtPath, filteredLines.join('\n'), 'utf8');
          cleanedCount++;
          console.log(`[Clean] Sanitized boilerplate from ${entry.name}/raw.txt (${lines.length - filteredLines.length} lines removed)`);
        }
      } catch (err) {
        console.warn(`[Clean] Error reading/writing ${rawTxtPath}:`, err.message);
      }
    }
  }

  console.log(`[Clean] Local chapters cleaning complete. ${cleanedCount} files updated.`);
}

async function cleanMongoDatabase() {
  console.log('[Clean] Connecting to MongoDB...');
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('[Clean] Connected to MongoDB.');

    const chapters = await Chapter.find({});
    console.log(`[Clean] Found ${chapters.length} chapters in MongoDB.`);
    let modifiedChapters = 0;

    for (const ch of chapters) {
      let docModified = false;

      // Clean raw_text if present
      if (ch.raw_text) {
        const lines = ch.raw_text.split(/\r?\n/);
        const filtered = lines.filter((l) => !isBoilerplateLine(l));
        if (filtered.length !== lines.length) {
          ch.raw_text = filtered.join('\n');
          docModified = true;
        }
      }

      // Clean segments matching boilerplate
      if (Array.isArray(ch.segments)) {
        const originalSegCount = ch.segments.length;
        ch.segments = ch.segments.filter((seg) => !isBoilerplateLine(seg.text));
        if (ch.segments.length !== originalSegCount) {
          docModified = true;
        }
      }

      if (docModified) {
        await ch.save();
        modifiedChapters++;
        console.log(`[Clean] Purged boilerplate from MongoDB chapter: ${ch.title || ch._id}`);
      }
    }

    console.log(`[Clean] MongoDB cleaning complete. ${modifiedChapters} chapters sanitized.`);
  } catch (err) {
    console.warn('[Clean] MongoDB not reachable or error occurred:', err.message);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (_) {}
  }
}

function cleanTempUploads() {
  const tmpDir = os.tmpdir();
  console.log('[Clean] Checking temp upload directory:', tmpDir);
  let removedCount = 0;

  try {
    const files = fs.readdirSync(tmpDir);
    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

    for (const f of files) {
      if (f.startsWith('book_upload_') || f.startsWith('foliate_')) {
        const fullPath = path.join(tmpDir, f);
        try {
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(fullPath);
            removedCount++;
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[Clean] Error checking temp files:', err.message);
  }

  const backendUploads = path.resolve(__dirname, 'data/uploads');
  if (fs.existsSync(backendUploads)) {
    try {
      const files = fs.readdirSync(backendUploads);
      for (const f of files) {
        const fullPath = path.join(backendUploads, f);
        try {
          const stats = fs.statSync(fullPath);
          if (Date.now() - stats.mtimeMs > 24 * 60 * 60 * 1000) {
            fs.unlinkSync(fullPath);
            removedCount++;
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  console.log(`[Clean] Temp uploads cleaned: ${removedCount} orphan files removed.`);
}

async function main() {
  console.log('=== SyncTone Database & Temp Cleaning Task ===');
  await cleanLocalChaptersDir();
  await cleanMongoDatabase();
  cleanTempUploads();
  console.log('=== Cleaning Finished Successfully ===');
}

main().catch((err) => {
  console.error('[Clean] Fatal error:', err);
  process.exit(1);
});
