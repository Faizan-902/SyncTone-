import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '../../../novel-audio-synthesizer/frontend');
const distDir = path.join(frontendDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets not found. Please build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFiles = files.filter(f => f.endsWith('.js'));
const cssFiles = files.filter(f => f.endsWith('.css'));
const woff2Files = files.filter(f => f.endsWith('.woff2'));

console.log('=== DIST ASSETS BREAKDOWN ===\n');

function getMetrics(filePath) {
  const buf = fs.readFileSync(filePath);
  const rawSize = buf.length;
  const gzipSize = zlib.gzipSync(buf, { level: 9 }).length;
  return { rawSize, gzipSize };
}

console.log('--- JavaScript Chunks ---');
const jsMetrics = jsFiles.map(f => {
  const metrics = getMetrics(path.join(assetsDir, f));
  return { file: f, ...metrics };
}).sort((a, b) => b.gzipSize - a.gzipSize);

for (const item of jsMetrics) {
  console.log(
    `${item.file.padEnd(45)} | Raw: ${(item.rawSize / 1024).toFixed(2).padStart(7)} KiB (${item.rawSize.toString().padStart(8)} B) | Gzip: ${(item.gzipSize / 1024).toFixed(2).padStart(6)} KiB (${item.gzipSize.toString().padStart(7)} B)`
  );
}

console.log('\n--- CSS Assets ---');
for (const f of cssFiles) {
  const m = getMetrics(path.join(assetsDir, f));
  console.log(
    `${f.padEnd(45)} | Raw: ${(m.rawSize / 1024).toFixed(2).padStart(7)} KiB (${m.rawSize.toString().padStart(8)} B) | Gzip: ${(m.gzipSize / 1024).toFixed(2).padStart(6)} KiB (${m.gzipSize.toString().padStart(7)} B)`
  );
}

console.log('\n--- Font Assets (.woff2) ---');
for (const f of woff2Files) {
  const m = getMetrics(path.join(assetsDir, f));
  console.log(
    `${f.padEnd(55)} | Raw: ${(m.rawSize / 1024).toFixed(2).padStart(7)} KiB (${m.rawSize.toString().padStart(8)} B)`
  );
}

// Inspect dist/index.html to see exact entry script tags
const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
console.log('\n--- HTML Entry Tags in dist/index.html ---');
const scriptMatches = indexHtml.match(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/g) || [];
const modulePreloadMatches = indexHtml.match(/<link[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+)["'][^>]*>/g) || [];

for (const s of scriptMatches) console.log('Script tag:', s);
for (const l of modulePreloadMatches) console.log('Modulepreload tag:', l);

// Identify Home cold-load JS files
// Entry script + all statically imported / modulepreloaded modules required on cold load of /
const entryJs = jsFiles.find(f => f.startsWith('index-'));
const reactVendorJs = jsFiles.find(f => f.startsWith('react-vendor-'));

console.log('\n=== HOME PAGE COLD-LOAD JS BUDGET ANALYSIS (Budget: <= 75 kB gzip) ===');
const entryMetrics = getMetrics(path.join(assetsDir, entryJs));
const reactMetrics = getMetrics(path.join(assetsDir, reactVendorJs));

const totalColdRaw = entryMetrics.rawSize + reactMetrics.rawSize;
const totalColdGzip = entryMetrics.gzipSize + reactMetrics.gzipSize;

console.log(`Entry chunk (${entryJs}):`);
console.log(`  Raw:  ${entryMetrics.rawSize} bytes (${(entryMetrics.rawSize / 1024).toFixed(2)} KiB)`);
console.log(`  Gzip: ${entryMetrics.gzipSize} bytes (${(entryMetrics.gzipSize / 1024).toFixed(2)} KiB / ${(entryMetrics.gzipSize / 1000).toFixed(2)} kB)`);

console.log(`React vendor chunk (${reactVendorJs}):`);
console.log(`  Raw:  ${reactMetrics.rawSize} bytes (${(reactMetrics.rawSize / 1024).toFixed(2)} KiB)`);
console.log(`  Gzip: ${reactMetrics.gzipSize} bytes (${(reactMetrics.gzipSize / 1024).toFixed(2)} KiB / ${(reactMetrics.gzipSize / 1000).toFixed(2)} kB)`);

console.log(`\nTOTAL HOME COLD-LOAD JS:`);
console.log(`  Raw:  ${totalColdRaw} bytes (${(totalColdRaw / 1024).toFixed(2)} KiB)`);
console.log(`  Gzip: ${totalColdGzip} bytes (${(totalColdGzip / 1024).toFixed(2)} KiB / ${(totalColdGzip / 1000).toFixed(2)} kB)`);
console.log(`\nBudget: 75,000 bytes (or 75 KiB = 76,800 bytes)`);
console.log(`Budget Status: ${totalColdGzip <= 75000 ? 'PASS (<= 75,000 bytes)' : totalColdGzip <= 76800 ? 'PASS (<= 75 KiB)' : 'FAIL'}`);
console.log(`Headroom (to 75,000 B): ${75000 - totalColdGzip} bytes (${((75000 - totalColdGzip)/1024).toFixed(2)} KiB)`);
console.log(`Headroom (to 76,800 B): ${76800 - totalColdGzip} bytes (${((76800 - totalColdGzip)/1024).toFixed(2)} KiB)`);
