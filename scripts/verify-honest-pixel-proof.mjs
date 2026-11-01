import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const frontendRequire = createRequire(path.join(REPO_ROOT, 'novel-audio-synthesizer/frontend/package.json'));
const { chromium } = frontendRequire('playwright');

const OUTPUT_DIR = path.join(REPO_ROOT, 'docs/screenshots/honest-pixel-proof');

const SCREENS = [
  { name: 'home', title: 'Home', asAdmin: false },
  { name: 'novel-detail', title: 'Novel Detail', asAdmin: false },
  { name: 'reader-normal', title: 'Reader Normal', asAdmin: false },
  { name: 'reader-3d', title: 'Reader 3D', asAdmin: false },
  { name: 'settings-modal', title: 'Settings Modal', asAdmin: false },
  { name: 'auth-modal', title: 'Auth Modal', asAdmin: false },
  { name: 'add-novel-modal', title: 'Add Novel Modal', asAdmin: true },
  { name: 'upload-chapter-modal', title: 'Upload Chapter Modal', asAdmin: true },
  { name: 'cast-roster', title: 'Cast Roster', asAdmin: false },
  { name: 'profile', title: 'Profile', asAdmin: true },
];

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1190, height: 770 },
];

const THEMES = ['dark', 'light'];

const NO_ANIMATION_STYLE = `
*, *::before, *::after {
  animation: none !important;
  transition: none !important;
}
`;

const INJECTED_ORANGE_STYLE = `
:root, html.dark {
  --accent: oklch(0.72 0.200 55) !important;
  --accent-hover: oklch(0.76 0.190 58) !important;
  --accent-surface: rgba(255, 121, 0, 0.12) !important;
  --on-accent: oklch(0.12 0.010 260) !important;
  --border-focus: oklch(0.72 0.200 55) !important;
  --top10-active: oklch(0.72 0.200 55) !important;
  --card-accent: oklch(0.72 0.200 55) !important;
  --speaker-a: oklch(0.72 0.200 55) !important;
}
html.light {
  --accent: oklch(0.52 0.170 48) !important;
  --accent-hover: oklch(0.46 0.170 46) !important;
  --accent-surface: rgba(178, 62, 0, 0.10) !important;
  --on-accent: oklch(1.00 0.000 0) !important;
  --border-focus: oklch(0.52 0.170 48) !important;
  --top10-active: oklch(0.52 0.170 48) !important;
  --card-accent: oklch(0.52 0.170 48) !important;
  --speaker-a: oklch(0.46 0.170 46) !important;
}
`;

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function prepareScreen(page, baseUrl, screenName, theme) {
  if (screenName === 'home') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    await page.waitForTimeout(400);
  } else if (screenName === 'novel-detail') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const card = page.locator('article.novel-card-hybrid:visible').first();
    await card.click();
    await page.waitForSelector('h1:visible', { timeout: 15000 });
    await page.waitForTimeout(500);
  } else if (screenName === 'reader-normal') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const card = page.locator('article.novel-card-hybrid:visible').first();
    await card.click();
    await page.waitForSelector('h1:visible', { timeout: 15000 });
    await page.waitForTimeout(400);
    const chBtn = page.locator('button:has-text("Start Listening"):visible, button:has-text("Read & Listen"):visible, div[role="button"]:has-text("Chapter 1"):visible').first();
    await chBtn.click();
    await page.waitForTimeout(600);
    const expChoice = page.locator('button:has-text("Normal Mode"):visible').first();
    if (await expChoice.isVisible()) {
      await expChoice.click();
      await page.waitForTimeout(600);
    }
    const normalBtn = page.locator('header button:has-text("Normal"):visible, button:has-text("Normal View"):visible').first();
    if (await normalBtn.isVisible()) {
      await normalBtn.click();
      await page.waitForTimeout(500);
    }
  } else if (screenName === 'reader-3d') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const card = page.locator('article.novel-card-hybrid:visible').first();
    await card.click();
    await page.waitForSelector('h1:visible', { timeout: 15000 });
    await page.waitForTimeout(400);
    const chBtn = page.locator('button:has-text("Start Listening"):visible, button:has-text("Read & Listen"):visible, div[role="button"]:has-text("Chapter 1"):visible').first();
    await chBtn.click();
    await page.waitForTimeout(600);
    const expChoice = page.locator('button:has-text("3D Mode"):visible, button:has-text("OpenGL 3D"):visible, button:has-text("Apple Books"):visible').first();
    if (await expChoice.isVisible()) {
      await expChoice.click();
      await page.waitForTimeout(600);
    }
    const d3Btn = page.locator('header button:has-text("OpenGL 3D"):visible, header button:has-text("3D"):visible, button:has-text("Apple Books"):visible').first();
    if (await d3Btn.isVisible()) {
      await d3Btn.click();
      await page.waitForTimeout(1000);
    }
  } else if (screenName === 'settings-modal') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const btn = page.locator('header button[aria-label="Settings"]:visible, button[aria-label="Settings"]:visible').first();
    await btn.click();
    await page.waitForSelector('div[role="dialog"]:visible', { timeout: 8000 });
    await page.waitForTimeout(500);
  } else if (screenName === 'auth-modal') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const btn = page.locator('button:has-text("Sign In"):visible').first();
    await btn.click();
    await page.waitForSelector('div[role="dialog"]:visible', { timeout: 8000 });
    await page.waitForTimeout(500);
  } else if (screenName === 'add-novel-modal') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const btn = page.locator('button:visible:has-text("Add Novel")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForSelector('div[role="dialog"]:visible', { timeout: 8000 });
      await page.waitForTimeout(500);
    }
  } else if (screenName === 'upload-chapter-modal') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const card = page.locator('article.novel-card-hybrid:visible').first();
    await card.click();
    await page.waitForSelector('h1:visible', { timeout: 15000 });
    await page.waitForTimeout(400);
    const btn = page.locator('button:visible:has-text("Upload Chapter")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForSelector('div[role="dialog"]:visible', { timeout: 8000 });
      await page.waitForTimeout(500);
    }
  } else if (screenName === 'cast-roster') {
    await page.goto(`${baseUrl}/?theme=${theme}`);
    await page.waitForSelector('article.novel-card-hybrid:visible', { timeout: 15000 });
    const card = page.locator('article.novel-card-hybrid:visible').first();
    await card.click();
    await page.waitForSelector('h1:visible', { timeout: 15000 });
    await page.waitForTimeout(400);
    const castTab = page.locator('button:has-text("Voice Cast"):visible, button:has-text("Characters"):visible').first();
    if (await castTab.isVisible()) {
      await castTab.click();
      await page.waitForTimeout(500);
    }
  } else if (screenName === 'profile') {
    await page.goto(`${baseUrl}/profile?theme=${theme}`);
    await page.waitForTimeout(800);
  }
}

async function getSemanticAccentBoxes(page) {
  return await page.evaluate(() => {
    const boxes = [];
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      const cls = typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
      const style = window.getComputedStyle(el);
      const isAccentClass = (
        cls.includes('accent') ||
        cls.includes('tab-active') ||
        cls.includes('bg-[var(--accent)]') ||
        cls.includes('text-[var(--accent)]') ||
        cls.includes('border-[var(--accent)]')
      );
      const isAriaSelectedTab = el.getAttribute('role') === 'tab' && el.getAttribute('aria-selected') === 'true';
      const hasAccentAncestor = el.closest('[class*="accent"], [role="tab"][aria-selected="true"], [class*="bg-[var(--accent)]"]');
      const isAccentColor = style.backgroundColor.includes('oklch(0.72 0.2 55)') ||
                            style.backgroundColor.includes('oklch(0.52 0.17 48)') ||
                            style.color.includes('oklch(0.72 0.2 55)') ||
                            style.color.includes('oklch(0.52 0.17 48)') ||
                            style.borderColor.includes('oklch(0.72 0.2 55)') ||
                            style.borderColor.includes('oklch(0.52 0.17 48)');

      if (isAccentClass || isAriaSelectedTab || hasAccentAncestor || isAccentColor) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          boxes.push({
            x: Math.floor(rect.left),
            y: Math.floor(rect.top),
            w: Math.ceil(rect.width),
            h: Math.ceil(rect.height),
            selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls.split(' ').slice(0, 2).join('.') : '')
          });
        }
      }
    }
    return boxes;
  });
}

async function compareViaCanvas(page, refBase64, curBase64, accentBoxes, width, height) {
  return await page.evaluate(async ({ refBase64, curBase64, accentBoxes, width, height }) => {
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    const imgRef = await loadImage(`data:image/png;base64,${refBase64}`);
    const imgCur = await loadImage(`data:image/png;base64,${curBase64}`);

    const c1 = document.createElement('canvas');
    c1.width = width;
    c1.height = height;
    const ctx1 = c1.getContext('2d');
    ctx1.drawImage(imgRef, 0, 0);
    const d1 = ctx1.getImageData(0, 0, width, height).data;

    const c2 = document.createElement('canvas');
    c2.width = width;
    c2.height = height;
    const ctx2 = c2.getContext('2d');
    ctx2.drawImage(imgCur, 0, 0);
    const d2 = ctx2.getImageData(0, 0, width, height).data;

    const mask = new Uint8Array(width * height);
    for (const b of accentBoxes) {
      const x0 = Math.max(0, b.x - 4);
      const y0 = Math.max(0, b.y - 4);
      const x1 = Math.min(width, b.x + b.w + 4);
      const y1 = Math.min(height, b.y + b.h + 4);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          mask[y * width + x] = 1;
        }
      }
    }

    let totalDiff = 0;
    let outsideDiff = 0;
    let insideDiff = 0;
    const diffSamples = [];

    const THRESHOLD = 12; // allow minor subpixel anti-aliasing jitter

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const delta = Math.abs(d1[i] - d2[i]) +
                      Math.abs(d1[i + 1] - d2[i + 1]) +
                      Math.abs(d1[i + 2] - d2[i + 2]) +
                      Math.abs(d1[i + 3] - d2[i + 3]);
        if (delta > THRESHOLD) {
          totalDiff++;
          if (mask[y * width + x] === 0) {
            outsideDiff++;
            if (diffSamples.length < 200) diffSamples.push({ x, y, isOutside: true });
          } else {
            insideDiff++;
            if (diffSamples.length < 200) diffSamples.push({ x, y, isOutside: false });
          }
        }
      }
    }

    return { totalDiff, outsideDiff, insideDiff, diffSamples };
  }, { refBase64, curBase64, accentBoxes, width, height });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await Promise.all([
    waitForServer('http://localhost:5175'),
    waitForServer('http://localhost:5174'),
  ]);

  const browser = await chromium.launch();
  const results = [];

  console.log('='.repeat(80));
  console.log('HONEST PIXEL PROOF: PRE-ACCENT (OVERRIDDEN ORANGE) VS CURRENT BUILD');
  console.log('='.repeat(80));

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const screen of SCREENS) {
        const configId = `${screen.name}-${theme}-${vp.width}x${vp.height}`;

        const preContext = await browser.newContext({
          viewport: vp,
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
        });
        const curContext = await browser.newContext({
          viewport: vp,
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
        });

        if (screen.asAdmin) {
          const adminHandler = (route) => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                user: { id: 'admin-1', username: 'SherlockWriter', role: 'admin' },
              }),
            });
          };
          await preContext.route('**/api/auth/me', adminHandler);
          await curContext.route('**/api/auth/me', adminHandler);
        }

        const preInit = (th) => {
          try {
            localStorage.setItem('synctone_theme', th);
            localStorage.setItem('synctone_reader_mode_seen', 'true');
            document.documentElement.className = th;
            document.documentElement.setAttribute('data-theme', th);
          } catch (_) {}
        };
        await preContext.addInitScript(preInit, theme);
        await curContext.addInitScript(preInit, theme);

        await preContext.addInitScript((css) => {
          const injectAnim = () => {
            if (!document.getElementById('theme-disable-animations')) {
              const s = document.createElement('style');
              s.id = 'theme-disable-animations';
              s.textContent = css;
              (document.head || document.documentElement).appendChild(s);
            }
          };
          if (document.head || document.documentElement) injectAnim();
          document.addEventListener('DOMContentLoaded', injectAnim);
        }, NO_ANIMATION_STYLE);

        await curContext.addInitScript((css) => {
          const injectAnim = () => {
            if (!document.getElementById('theme-disable-animations')) {
              const s = document.createElement('style');
              s.id = 'theme-disable-animations';
              s.textContent = css;
              (document.head || document.documentElement).appendChild(s);
            }
          };
          if (document.head || document.documentElement) injectAnim();
          document.addEventListener('DOMContentLoaded', injectAnim);
        }, NO_ANIMATION_STYLE);

        await preContext.addInitScript((css) => {
          const inject = () => {
            if (!document.getElementById('theme-override-orange')) {
              const s = document.createElement('style');
              s.id = 'theme-override-orange';
              s.textContent = css;
              (document.head || document.documentElement).appendChild(s);
            }
          };
          if (document.head || document.documentElement) inject();
          document.addEventListener('DOMContentLoaded', inject);
        }, INJECTED_ORANGE_STYLE);

        const curPage = await curContext.newPage();
        const prePage = await preContext.newPage();

        // 1. Current Build (port 5174)
        await prepareScreen(curPage, 'http://localhost:5174', screen.name, theme);
        await curPage.addStyleTag({ content: NO_ANIMATION_STYLE });
        const curAccentBoxes = await getSemanticAccentBoxes(curPage);
        const curBuf = await curPage.screenshot();
        const curBase64 = curBuf.toString('base64');

        // 2. Pre-Accent Build with Style Injection (port 5175)
        await prepareScreen(prePage, 'http://localhost:5175', screen.name, theme);
        await prePage.addStyleTag({ content: NO_ANIMATION_STYLE + '\n' + INJECTED_ORANGE_STYLE });
        const preAccentBoxes = await getSemanticAccentBoxes(prePage);
        const preBuf = await prePage.screenshot();
        const preBase64 = preBuf.toString('base64');

        const accentBoxes = [...curAccentBoxes, ...preAccentBoxes];

        // 3. Compare via canvas inside curPage
        const diffData = await compareViaCanvas(
          curPage,
          preBase64,
          curBase64,
          accentBoxes,
          vp.width,
          vp.height
        );

        let diffSelectors = [];
        if (diffData.diffSamples && diffData.diffSamples.length > 0) {
          diffSelectors = await curPage.evaluate((samples) => {
            const map = {};
            for (const s of samples) {
              const el = document.elementFromPoint(s.x, s.y);
              if (el) {
                const tag = el.tagName.toLowerCase();
                const id = el.id ? '#' + el.id : '';
                const cls = typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
                const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
                const key = `${tag}${id}${cls}${text ? ' ("' + text + '")' : ''}`;
                if (!map[key]) {
                  map[key] = { count: 0, isOutside: s.isOutside, selector: tag + id + cls, text };
                }
                map[key].count++;
              }
            }
            return Object.entries(map).map(([k, v]) => ({ label: k, ...v }));
          }, diffData.diffSamples);
        }

        results.push({
          configId,
          screen: screen.title,
          theme,
          viewport: `${vp.width}x${vp.height}`,
          totalDiffPixels: diffData.totalDiff,
          outsideMaskPixels: diffData.outsideDiff,
          insideMaskPixels: diffData.insideDiff,
          diffSelectors,
        });

        const status = diffData.outsideDiff === 0 ? 'PASS' : 'FAIL';
        console.log(`[${status}] ${configId.padEnd(42)} | Total Diff: ${String(diffData.totalDiff).padStart(6)} px | Outside Accent: ${String(diffData.outsideDiff).padStart(3)} px | Inside: ${String(diffData.insideDiff).padStart(5)} px`);
        if (diffSelectors.length > 0) {
          for (const ds of diffSelectors) {
            const type = ds.isOutside ? 'UNINTENDED OUTSIDE' : 'INTENDED ON-ACCENT';
            console.log(`       [${type}] ${ds.label} (sampled ${ds.count} hits)`);
          }
        }

        await preContext.close();
        await curContext.close();
      }
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'honest-pixel-proof-summary.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('='.repeat(80));
  const failed = results.filter((r) => r.outsideMaskPixels > 0);
  if (failed.length > 0) {
    console.error(`FAILED: ${failed.length} configurations have non-zero outside-accent pixel drift.`);
    process.exit(1);
  } else {
    console.log('SUCCESS: All 40 configurations have EXACTLY 0 outside-accent pixel drift.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
