import { chromium } from '../../../novel-audio-synthesizer/frontend/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const theme = 'dark';
  await page.addInitScript((th) => {
    try {
      localStorage.setItem('synctone_theme', th);
      document.documentElement.className = th;
      document.documentElement.setAttribute('data-theme', th);
    } catch (_) {}
  }, theme);

  await page.goto(`http://localhost:5174/?theme=${theme}`);
  await page.waitForSelector('article.novel-card-hybrid', { timeout: 15000 });
  const novelCard = page.locator('article.novel-card-hybrid:visible').first();
  await novelCard.click();
  await page.waitForSelector('h1', { timeout: 15000 });
  await page.waitForTimeout(400);

  const chBtn = page.locator('button:has-text("Start Listening"):visible, button:has-text("Read & Listen"):visible, div[role="button"]:has-text("Chapter 1"):visible').first();
  await chBtn.click();
  await page.waitForTimeout(800);

  const expChoice = page.locator('button:has-text("Normal Mode"):visible').first();
  if (await expChoice.isVisible()) {
    await expChoice.click();
    await page.waitForTimeout(500);
  }

  // 3D mode
  const d3Btn = page.locator('header button:has-text("OpenGL 3D"):visible, header button:has-text("3D"):visible, button:has-text("Apple Books"):visible').first();
  if (await d3Btn.isVisible()) {
    await d3Btn.click();
    await page.waitForTimeout(1000);
  }

  const screenshot = await page.screenshot();
  const outScreenshotPath = path.join(__dirname, 'actual-reader-3d-dark.png');
  fs.writeFileSync(outScreenshotPath, screenshot);
  console.log(`Saved screenshot to ${outScreenshotPath}`);

  // Pixel comparison against ref/reader-3d-dark.png
  const refPath = path.resolve(__dirname, '../../../docs/screenshots/theme-regression/ref/reader-3d-dark.png');
  const headPath = path.resolve(__dirname, '../../../docs/screenshots/theme-regression/head/reader-3d-dark.png');

  async function diff(refB64, curB64) {
    return await page.evaluate(async ({ refB64, curB64 }) => {
      const loadImg = (b64) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = 'data:image/png;base64,' + b64;
      });
      const [img1, img2] = await Promise.all([loadImg(refB64), loadImg(curB64)]);
      const w = Math.max(img1.width, img2.width);
      const h = Math.max(img1.height, img2.height);
      const c1 = document.createElement('canvas'); c1.width = w; c1.height = h;
      const ctx1 = c1.getContext('2d'); ctx1.drawImage(img1, 0, 0);
      const data1 = ctx1.getImageData(0, 0, w, h).data;
      const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
      const ctx2 = c2.getContext('2d'); ctx2.drawImage(img2, 0, 0);
      const data2 = ctx2.getImageData(0, 0, w, h).data;
      let diffCount = 0;
      const totalPixels = w * h;
      for (let i = 0; i < data1.length; i += 4) {
        const dr = Math.abs(data1[i] - data2[i]);
        const dg = Math.abs(data1[i + 1] - data2[i + 1]);
        const db = Math.abs(data1[i + 2] - data2[i + 2]);
        const da = Math.abs(data1[i + 3] - data2[i + 3]);
        if (dr > 10 || dg > 10 || db > 10 || da > 10) diffCount++;
      }
      return { diffCount, totalPixels, diffPercent: (diffCount / totalPixels) * 100 };
    }, { refB64, curB64 });
  }

  const curB64 = screenshot.toString('base64');

  if (fs.existsSync(refPath)) {
    const refB64 = fs.readFileSync(refPath).toString('base64');
    const resultRef = await diff(refB64, curB64);
    console.log(`Diff against ref/reader-3d-dark.png: ${resultRef.diffPercent.toFixed(4)}% (${resultRef.diffCount} / ${resultRef.totalPixels} px)`);
  }

  if (fs.existsSync(headPath)) {
    const headB64 = fs.readFileSync(headPath).toString('base64');
    const resultHead = await diff(headB64, curB64);
    console.log(`Diff against head/reader-3d-dark.png: ${resultHead.diffPercent.toFixed(4)}% (${resultHead.diffCount} / ${resultHead.totalPixels} px)`);
  }

  // Also diff head vs ref
  if (fs.existsSync(refPath) && fs.existsSync(headPath)) {
    const refB64 = fs.readFileSync(refPath).toString('base64');
    const headB64 = fs.readFileSync(headPath).toString('base64');
    const resultHeadRef = await diff(refB64, headB64);
    console.log(`Diff head vs ref: ${resultHeadRef.diffPercent.toFixed(4)}% (${resultHeadRef.diffCount} / ${resultHeadRef.totalPixels} px)`);
  }

  await browser.close();
}

main().catch(console.error);
