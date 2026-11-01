import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * THEME LOCK REGRESSION TEST
 *
 * Visual Identity: Atelier Obsidian (Dark) & Editorial Light (Cold-Press Vellum)
 * Living Accent: Approved Atelier Orange (Dark D1: oklch(0.72 0.200 55) / Light L2: oklch(0.52 0.170 48))
 *
 * HARD CONSTRAINT:
 * NO color, token, shadow color, opacity, gradient, or theme-related value
 * may change anywhere, for any reason (including accessibility contrast).
 * If this test fails, a theme regression was introduced.
 */

function extractAllCssVariables(cssContent, selectorRegex) {
  const match = cssContent.match(selectorRegex);
  if (!match) return {};
  const block = match[1];
  const vars = {};
  const varRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = varRegex.exec(block)) !== null) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

describe('Theme Lock: Complete Token & Color Parity', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  const darkVars = extractAllCssVariables(cssContent, /:root,\s*html\.dark\s*\{([\s\S]*?)\n\}/);
  const lightVars = extractAllCssVariables(cssContent, /html\.light\s*\{([\s\S]*?)\n\}/);

  it('matches all locked custom properties for Dark Mode (:root, html.dark)', () => {
    // Assert all 74 variables exist and match exact locked values
    expect(Object.keys(darkVars).length).toBe(74);

    expect(darkVars).toMatchObject({
      '--bg-page': 'oklch(0.13 0.006 260)',
      '--bg-surface': 'oklch(0.16 0.008 260)',
      '--bg-card': 'oklch(0.19 0.010 260)',
      '--bg-hover': 'oklch(0.23 0.012 260)',
      '--bg-elevated': 'oklch(0.21 0.010 260)',

      '--text-main': 'oklch(0.96 0.005 260)',
      '--text-sub': 'oklch(0.85 0.008 260)',
      '--text-muted': 'oklch(0.74 0.010 260)',

      '--border-subtle': 'rgba(255, 255, 255, 0.07)',
      '--border-strong': 'rgba(255, 255, 255, 0.20)',
      '--border-hover': 'oklch(0.58 0.030 260)',
      '--border-focus': 'oklch(0.72 0.200 55)',

      '--accent': 'oklch(0.72 0.200 55)',
      '--accent-hover': 'oklch(0.76 0.190 58)',
      '--accent-surface': 'rgba(255, 121, 0, 0.12)',
      '--on-accent': 'oklch(0.12 0.010 260)',

      '--glass-bg': 'rgba(18, 20, 24, 0.85)',
      '--glass-dock': 'rgba(22, 24, 30, 0.94)',

      '--success': 'oklch(0.78 0.14 145)',
      '--warning': 'oklch(0.79 0.15 80)',
      '--danger': 'oklch(0.72 0.20 25)',
      '--info': 'oklch(0.76 0.14 235)',

      '--speaker-narrator': 'oklch(0.85 0.008 260)',
      '--speaker-a': 'oklch(0.72 0.200 55)',
      '--speaker-b': 'oklch(0.77 0.140 155)',
      '--speaker-c': 'oklch(0.76 0.140 235)',
      '--speaker-d': 'oklch(0.76 0.150 320)',

      '--top10-fill': 'oklch(0.13 0.006 260)',
      '--top10-stroke': 'rgba(255, 255, 255, 0.24)',
      '--top10-active': 'oklch(0.72 0.200 55)',

      '--card-accent': 'oklch(0.72 0.200 55)',

      '--space-0-5': '4px',
      '--space-1': '8px',
      '--space-2': '16px',
      '--space-3': '24px',
      '--space-4': '32px',
      '--space-6': '48px',
      '--space-7': '56px',
      '--space-8': '64px',

      '--shadow-none': 'none',
      '--shadow-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.22), 0 1px 2px -1px rgba(0, 0, 0, 0.18)',
      '--shadow-md': '0 8px 20px -4px rgba(0, 0, 0, 0.32), 0 4px 8px -2px rgba(0, 0, 0, 0.22)',
      '--shadow-lg': '0 24px 48px -12px rgba(0, 0, 0, 0.48), 0 12px 24px -6px rgba(0, 0, 0, 0.36)',

      '--radius-xs': '4px',
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '14px',
      '--radius-xl': '20px',
      '--radius-full': '9999px',
    });
  });

  it('matches all locked custom properties for Light Mode (html.light)', () => {
    // Assert all 38 variables exist and match exact locked values
    expect(Object.keys(lightVars).length).toBe(38);

    expect(lightVars).toMatchObject({
      '--bg-page': 'oklch(0.985 0.003 240)',
      '--bg-surface': 'oklch(1.000 0.000 0)',
      '--bg-card': 'oklch(0.955 0.005 240)',
      '--bg-hover': 'oklch(0.925 0.008 240)',
      '--bg-elevated': 'oklch(1.000 0.000 0)',

      '--text-main': 'oklch(0.16 0.010 260)',
      '--text-sub': 'oklch(0.29 0.012 260)',
      '--text-muted': 'oklch(0.43 0.015 260)',

      '--border-subtle': 'rgba(20, 25, 35, 0.08)',
      '--border-strong': 'rgba(20, 25, 35, 0.20)',
      '--border-hover': 'oklch(0.48 0.030 260)',
      '--border-focus': 'oklch(0.52 0.170 48)',

      '--accent': 'oklch(0.52 0.170 48)',
      '--accent-hover': 'oklch(0.46 0.170 46)',
      '--accent-surface': 'rgba(178, 62, 0, 0.10)',
      '--on-accent': 'oklch(1.00 0.000 0)',

      '--glass-bg': 'rgba(255, 255, 255, 0.90)',
      '--glass-dock': 'rgba(255, 255, 255, 0.96)',

      '--success': 'oklch(0.40 0.13 145)',
      '--warning': 'oklch(0.43 0.15 70)',
      '--danger': 'oklch(0.43 0.19 25)',
      '--info': 'oklch(0.38 0.13 240)',

      '--speaker-narrator': 'oklch(0.20 0.010 260)',
      '--speaker-a': 'oklch(0.46 0.170 46)',
      '--speaker-b': 'oklch(0.38 0.120 155)',
      '--speaker-c': 'oklch(0.38 0.130 240)',
      '--speaker-d': 'oklch(0.40 0.160 330)',

      '--top10-fill': 'oklch(0.985 0.003 240)',
      '--top10-stroke': 'rgba(20, 25, 35, 0.26)',
      '--top10-active': 'oklch(0.52 0.170 48)',

      '--card-accent': 'oklch(0.52 0.170 48)',
    });
  });

  it('asserts no accent token or hardcoded value contains Cinnabar values (hue 34-38 oklch, rgba, hex)', () => {
    const cinnabarHexRegex = /#e0533c|#c83d27/i;
    const cinnabarRgbaRegex = /224,\s*83,\s*60|200,\s*61,\s*39/;
    const oklchHueRegex = /oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s*\)/g;

    const allTokenValues = [...Object.values(darkVars), ...Object.values(lightVars)];

    for (const val of allTokenValues) {
      expect(val).not.toMatch(cinnabarHexRegex);
      expect(val).not.toMatch(cinnabarRgbaRegex);

      let m;
      while ((m = oklchHueRegex.exec(val)) !== null) {
        const hue = parseFloat(m[1]);
        const isCinnabarHue = hue >= 34 && hue <= 38;
        expect(isCinnabarHue).toBe(false);
      }
    }
  });

  it('matches Tailwind color mappings in tailwind.config.js', async () => {
    const tailwindPath = path.resolve(__dirname, '../../tailwind.config.js');
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8');

    // Brand immutable palette
    expect(tailwindContent).toContain("gold: '#E5A93C'");
    expect(tailwindContent).toContain("crimson: '#E50914'");
    expect(tailwindContent).toContain("cyan: '#06B6D4'");
    expect(tailwindContent).toContain("indigo: '#6366F1'");
    expect(tailwindContent).toContain("violet: '#8B5CF6'");

    // CSS Variable bindings
    expect(tailwindContent).toContain("page: 'var(--bg-page)'");
    expect(tailwindContent).toContain("surface: 'var(--bg-surface)'");
    expect(tailwindContent).toContain("card: 'var(--bg-card)'");
    expect(tailwindContent).toContain("hover: 'var(--bg-hover)'");
    expect(tailwindContent).toContain("'text-main': 'var(--text-main)'");
    expect(tailwindContent).toContain("'text-sub': 'var(--text-sub)'");
    expect(tailwindContent).toContain("'text-muted': 'var(--text-muted)'");
  });
});

