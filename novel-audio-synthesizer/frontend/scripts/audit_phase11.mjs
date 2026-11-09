import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const viewports = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1190, height: 770, name: '1190x770' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 390, height: 844, name: '390x844' },
  { width: 320, height: 568, name: '320x568' },
  { width: 844, height: 390, name: '844x390' },
];

const themes = ['dark', 'light'];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- TESTING ACCESSIBILITY ON HOME PAGE ---');
  for (const theme of themes) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5174/');
    await page.evaluate((t) => {
      document.documentElement.className = t;
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('synctone_theme', t); } catch(e){}
    }, theme);
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    console.log(`\n=== Theme: ${theme.toUpperCase()} ===`);
    console.log(`Total violations: ${results.violations.length}`);
    for (const v of results.violations) {
      console.log(`- [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
      if (v.id === 'color-contrast') {
        for (const n of v.nodes.slice(0, 5)) {
          const d = n.any?.find(c => c.id === 'color-contrast')?.data || {};
          console.log(`   * Target: ${n.target.join(' ')}`);
          console.log(`     HTML: ${n.html.slice(0, 100)}`);
          console.log(`     fg: ${d.fgColor}, bg: ${d.bgColor}, ratio: ${d.contrastRatio}, expected: ${d.expectedContrastRatio}`);
        }
      }
    }
  }

  await browser.close();
}

run().catch(console.error);
