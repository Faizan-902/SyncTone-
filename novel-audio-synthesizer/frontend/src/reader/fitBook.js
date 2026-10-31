/**
 * CONTRACT 1 — FROZEN SPECIFICATION
 * fitBook(stage: { w, h }, opts) -> { layout, book, page, contentBox, gutter }
 *
 * Pure function, NO DOM dependencies.
 * Sizing rules:
 * - Page aspect ratio: 1 : 1.4 (height = width * 1.4)
 * - Spread layout = 2 pages side-by-side (aspect 2 : 1.4 = 1.428 : 1)
 * - Single layout = 1 page (aspect 1 : 1.4 = 0.714 : 1)
 * - Uniform padding: clamp(12px, 3% of min(w, h), 32px)
 * - Gutter: reserved on >= 640px for floating nav chevrons; on < 640px gutter = 0
 * - Real pixel geometry (no transform:scale)
 * - 8% hysteresis against layout flapping
 */

export const PAGE_ASPECT = 1.4; // height / width
export const MIN_READABLE_PAGE_WIDTH = 260; // minimum readable width in px
export const HYSTERESIS_FACTOR = 1.08; // 8% bias to retain existing layout

export function fitBook(stage = { w: 0, h: 0 }, opts = {}) {
  const stageW = Math.max(0, stage?.w || 0);
  const stageH = Math.max(0, stage?.h || 0);

  if (stageW === 0 || stageH === 0) {
    return {
      layout: 'single',
      book: { w: 0, h: 0 },
      page: { w: 0, h: 0 },
      contentBox: { w: 0, h: 0 },
      gutter: 0,
      padding: 0,
    };
  }

  // 1. Uniform padding: clamp(12px..32px)
  const padding = Math.min(32, Math.max(12, Math.round(Math.min(stageW, stageH) * 0.03)));

  // 2. Navigation Gutter: >=640px reserves gutter for chevrons; <640px gutter = 0
  const isDesktop = stageW >= 640;
  const gutter = isDesktop ? (opts.gutter !== undefined ? opts.gutter : 48) : 0;

  // Available stage area inside padding and gutters
  const availW = Math.max(0, stageW - 2 * padding - 2 * gutter);
  const availH = Math.max(0, stageH - 2 * padding);

  // 3. Evaluate Single Page Layout (1 page)
  const singleMaxWFromH = availH / PAGE_ASPECT;
  const singlePageW = Math.min(availW, singleMaxWFromH);
  const singlePageH = singlePageW * PAGE_ASPECT;
  const singleArea = singlePageW * singlePageH;

  // 4. Evaluate Two-Page Spread Layout (2 pages side-by-side)
  // Spread width = 2 * (availH / PAGE_ASPECT)
  const spreadMaxBookWFromH = 2 * (availH / PAGE_ASPECT);
  const spreadBookW = Math.min(availW, spreadMaxBookWFromH);
  const spreadPageW = spreadBookW / 2;
  const spreadPageH = spreadPageW * PAGE_ASPECT;
  const spreadTotalArea = 2 * spreadPageW * spreadPageH;

  const spreadAllowed = isDesktop && spreadPageW >= (opts.minReadableWidth || MIN_READABLE_PAGE_WIDTH);

  // 5. Layout decision with 8% hysteresis
  let layout = 'single';
  const prevLayout = opts.prevLayout;

  if (spreadAllowed) {
    if (prevLayout === 'spread') {
      // Biased towards keeping spread unless single is clearly much larger
      layout = spreadTotalArea * HYSTERESIS_FACTOR >= singleArea ? 'spread' : 'single';
    } else if (prevLayout === 'single') {
      // Biased towards keeping single
      layout = spreadTotalArea >= singleArea * HYSTERESIS_FACTOR ? 'spread' : 'single';
    } else {
      layout = spreadTotalArea >= singleArea ? 'spread' : 'single';
    }
  }

  // 6. Geometry derivation
  const bookW = Math.round(layout === 'spread' ? spreadBookW : singlePageW);
  const bookH = Math.round(layout === 'spread' ? spreadPageH : singlePageH);
  const pageW = Math.round(layout === 'spread' ? spreadPageW : singlePageW);
  const pageH = Math.round(layout === 'spread' ? spreadPageH : singlePageH);

  // 7. Content Box derivation (page padding for margins, header/footer numbers)
  const contentPaddingX = Math.round(Math.min(32, Math.max(16, pageW * 0.07)));
  const contentPaddingY = Math.round(Math.min(44, Math.max(24, pageH * 0.08)));
  const contentBoxW = Math.max(0, pageW - 2 * contentPaddingX);
  const contentBoxH = Math.max(0, pageH - 2 * contentPaddingY);

  return {
    layout,
    book: { w: bookW, h: bookH },
    page: { w: pageW, h: pageH },
    contentBox: { w: contentBoxW, h: contentBoxH },
    gutter,
    padding,
  };
}

export default fitBook;

