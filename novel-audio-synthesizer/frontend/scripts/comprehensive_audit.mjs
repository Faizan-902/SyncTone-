import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1190x770', width: 1190, height: 770 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '320x568', width: 320, height: 568 },
  { name: '844x390', width: 844, height: 390 },
];

const THEMES = ['dark', 'light'];

const MOCK_NOVELS = [
  {
    id: 'novel-1',
    title: 'A Study in Scarlet',
    synopsis: 'The classic mystery that introduced Sherlock Holmes and Dr. John Watson to the world.',
    channel: 'verified',
    status: 'published',
    global_tone: 'Victorian Noir',
    author_username: 'arthur_conan_doyle',
    narrator_name: 'Dr. John Watson',
    narrator_voice_id: 'en-GB-ArthurNeural',
    chapter_count: 5,
    cover_object: null,
  },
  {
    id: 'novel-2',
    title: 'The Sign of the Four',
    synopsis: 'A secret pact and stolen treasure in colonial India lead to murder in London.',
    channel: 'verified',
    status: 'published',
    global_tone: 'Atmospheric Thriller',
    author_username: 'arthur_conan_doyle',
    narrator_name: 'British Narrator',
    narrator_voice_id: 'en-GB-RyanNeural',
    chapter_count: 3,
    cover_object: null,
  }
];

const MOCK_DETAIL = {
  novel: MOCK_NOVELS[0],
  characters: [
    {
      id: 'char-1',
      canonical_name: 'Sherlock Holmes',
      gender: 'male',
      age_band: 'adult',
      sample_quote: 'Elementary, my dear Watson.',
      voice_id: 'en-GB-ThomasNeural',
      is_narrator: false,
    },
    {
      id: 'char-2',
      canonical_name: 'Narrator',
      gender: 'male',
      age_band: 'adult',
      voice_id: 'en-GB-RyanNeural',
      is_narrator: true,
    }
  ],
  chapters: [
    {
      id: 'chap-1',
      novel_id: 'novel-1',
      chapter_number: 1,
      title: 'Mr. Sherlock Holmes',
      word_count: 3200,
      audio_status: 'ready',
      duration_seconds: 480,
    },
    {
      id: 'chap-2',
      novel_id: 'novel-1',
      chapter_number: 2,
      title: 'The Science of Deduction',
      word_count: 2900,
      audio_status: 'ready',
      duration_seconds: 420,
    }
  ]
};

const MOCK_CHAPTER = {
  id: 'chap-1',
  novel_id: 'novel-1',
  chapter_number: 1,
  title: 'Mr. Sherlock Holmes',
  prose: 'In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the army.\n\nHaving completed my studies there, I was duly attached to the Fifth Northumberland Fusiliers as Assistant Surgeon.',
  timeline: [
    { start: 0, end: 5000, text: 'In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the army.', speaker: 'char-2' },
    { start: 5000, end: 12000, text: 'Having completed my studies there, I was duly attached to the Fifth Northumberland Fusiliers as Assistant Surgeon.', speaker: 'char-2' }
  ],
  audio_url: '/mock-audio.mp3',
};

async function mockRoutes(page) {
  await page.route('**/api/novels*', async (route) => {
    const url = route.request().url();
    if (url.includes('/novels/novel-1/chapters/chap-1')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CHAPTER) });
    } else if (url.includes('/novels/novel-1')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DETAIL) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ novels: MOCK_NOVELS, total: MOCK_NOVELS.length }) });
    }
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'u-1', username: 'editor_lead', role: 'admin', email: 'editor@synctone.app' } }),
    });
  });

  await page.route('**/api/status/models*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ kokoro: 'ready', edge_tts: 'ready', piper: 'ready' }),
    });
  });

  await page.route('**/mock-audio.mp3', async (route) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.alloc(1024) });
  });
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await mockRoutes(page);

  console.log('--- COMPREHENSIVE PHASE 11 SCREEN AUDIT ---');

  const screens = [
    { name: 'Home', path: '/' },
    { name: 'NovelDetail', path: '/novels/novel-1' },
    { name: 'Reader', path: '/reader/chap-1' },
    { name: 'Profile', path: '/profile' },
    { name: 'Upload', path: '/upload' },
    { name: 'Admin', path: '/admin' },
  ];

  for (const s of screens) {
    console.log(`\n================ Testing ${s.name} Screen ================`);
    for (const theme of THEMES) {
      for (const vp of [
        { name: '1440x900', width: 1440, height: 900 },
        { name: '390x844', width: 390, height: 844 },
        { name: '320x568', width: 320, height: 568 },
        { name: '844x390', width: 844, height: 390 },
      ]) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`http://localhost:5174${s.path}`);
        await page.evaluate((t) => {
          document.documentElement.className = t;
          document.documentElement.setAttribute('data-theme', t);
          try { localStorage.setItem('synctone_theme', t); } catch(e){}
        }, theme);
        await page.waitForTimeout(400);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          return { hasOverflow: docW > winW + 1, docW, winW };
        });
        if (overflow.hasOverflow) {
          console.log(`[OVERFLOW] ${s.name} ${theme} ${vp.name}: docW=${overflow.docW} > winW=${overflow.winW}`);
        }

        // Run Axe
        if (vp.name === '1440x900' || vp.name === '390x844') {
          const axe = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
          if (axe.violations.length > 0) {
            console.log(`[AXE] ${s.name} ${theme} ${vp.name}:`);
            for (const v of axe.violations) {
              console.log(`   - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
              if (v.id === 'color-contrast') {
                for (const n of v.nodes.slice(0, 3)) {
                  const d = n.any?.find(c => c.id === 'color-contrast')?.data || {};
                  console.log(`      * ${n.target.join(' ')}: fg=${d.fgColor}, bg=${d.bgColor}, ratio=${d.contrastRatio}`);
                }
              } else if (v.id === 'button-name') {
                for (const n of v.nodes) {
                  console.log(`      * button-name: target=${n.target.join(' ')} html=${n.html.slice(0, 100)}`);
                }
              }
            }
          }
        }
      }
    }
  }

  // Also test Modals
  console.log(`\n================ Testing Modals ================`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(300);

  // Settings Modal
  const settingsBtn = page.locator('button[title*="Settings"], button:has-text("Settings"), button[aria-label*="Settings"]').first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(300);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    console.log(`[AXE] Settings Modal (Dark): ${axe.violations.length} violations`);
    for (const v of axe.violations) {
      console.log(`   - [${v.impact}] ${v.id}: ${v.description}`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  await browser.close();
}

runAudit().catch(console.error);
