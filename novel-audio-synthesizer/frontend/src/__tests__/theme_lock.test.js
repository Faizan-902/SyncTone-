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
    expect(Object.keys(darkVars).length).toBe(85);

    expect(darkVars).toMatchObject({
      '--brand-espresso': '#1A120E',
      '--brand-chocolate': '#3A2418',
      '--brand-walnut': '#6B4A2E',
      '--brand-bronze': '#A88462',
      '--brand-sand': '#D5C4AE',
      '--brand-charcoal': '#4A4A46',

      '--bg-page': '#1A120E',
      '--bg-surface': '#3A2418',
      '--bg-card': '#3A2418',
      '--bg-hover': '#4A4A46',
      '--bg-elevated': '#4A4A46',

      '--text-main': '#D5C4AE',
      '--text-sub': '#A88462',
      '--text-muted': '#8A7A68',

      '--border-subtle': '#40362E',
      '--border-strong': '#5A4D42',
      '--border-hover': '#71665D',
      '--border-focus': '#A88462',

      '--accent': '#A88462',
      '--accent-hover': '#BCA082',
      '--accent-surface': 'rgba(168, 132, 98, 0.15)',
      '--accent-strong': '#6B4A2E',
      '--accent-text': '#A88462',
      '--on-accent': '#1A120E',

      '--cta-primary-bg': '#6B4A2E',
      '--cta-primary-hover': '#7D5737',
      '--cta-primary-text': '#D5C4AE',

      '--glass-bg': 'rgba(26, 18, 14, 0.88)',
      '--glass-dock': 'rgba(58, 36, 24, 0.95)',

      '--success': '#5FA052',
      '--warning': '#C68A3C',
      '--danger': '#BA4E3D',
      '--info': '#A88462',

      '--speaker-narrator': '#D5C4AE',
      '--speaker-a': '#A88462',
      '--speaker-b': '#5FA052',
      '--speaker-c': '#6B4A2E',
      '--speaker-d': '#BA4E3D',

      '--top10-fill': '#1A120E',
      '--top10-stroke': 'rgba(213, 196, 174, 0.25)',
      '--top10-active': '#A88462',

      '--card-accent': '#A88462',

      '--space-0-5': '4px',
      '--space-1': '8px',
      '--space-2': '16px',
      '--space-3': '24px',
      '--space-4': '32px',
      '--space-6': '48px',
      '--space-7': '56px',
      '--space-8': '64px',

      '--shadow-none': 'none',
      '--shadow-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.28), 0 1px 2px -1px rgba(0, 0, 0, 0.22)',
      '--shadow-md': '0 8px 20px -4px rgba(0, 0, 0, 0.42), 0 4px 8px -2px rgba(0, 0, 0, 0.30)',
      '--shadow-lg': '0 24px 48px -12px rgba(0, 0, 0, 0.58), 0 12px 24px -6px rgba(0, 0, 0, 0.42)',

      '--radius-xs': '4px',
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '14px',
      '--radius-xl': '20px',
      '--radius-full': '9999px',
    });
  });

  it('matches all locked custom properties for Light Mode (html.light)', () => {
    expect(Object.keys(lightVars).length).toBe(43);

    expect(lightVars).toMatchObject({
      '--bg-page': '#D5C4AE',
      '--bg-surface': '#FAF6F0',
      '--bg-card': '#F5EFE6',
      '--bg-hover': '#E8DDD0',
      '--bg-elevated': '#FFFFFF',

      '--text-main': '#1A120E',
      '--text-sub': '#4A4A46',
      '--text-muted': '#6B5B4E',

      '--border-subtle': '#C8B9A6',
      '--border-strong': '#A89885',
      '--border-hover': '#8C7E6F',
      '--border-focus': '#6B4A2E',

      '--accent': '#6B4A2E',
      '--accent-hover': '#3A2418',
      '--accent-surface': 'rgba(107, 74, 46, 0.12)',
      '--accent-strong': '#3A2418',
      '--accent-text': '#6B4A2E',
      '--on-accent': '#FAF6F0',

      '--cta-primary-bg': '#6B4A2E',
      '--cta-primary-hover': '#3A2418',
      '--cta-primary-text': '#D5C4AE',

      '--glass-bg': 'rgba(213, 196, 174, 0.90)',
      '--glass-dock': 'rgba(250, 246, 240, 0.96)',

      '--success': '#386B2F',
      '--warning': '#87571B',
      '--danger': '#962F22',
      '--info': '#6B4A2E',

      '--speaker-narrator': '#1A120E',
      '--speaker-a': '#6B4A2E',
      '--speaker-b': '#386B2F',
      '--speaker-c': '#4A4A46',
      '--speaker-d': '#962F22',

      '--top10-fill': '#D5C4AE',
      '--top10-stroke': 'rgba(26, 18, 14, 0.25)',
      '--top10-active': '#6B4A2E',

      '--card-accent': '#6B4A2E',
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

    // Brand Earthy Luxury palette
    expect(tailwindContent).toContain("espresso: '#1A120E'");
    expect(tailwindContent).toContain("chocolate: '#3A2418'");
    expect(tailwindContent).toContain("walnut: '#6B4A2E'");
    expect(tailwindContent).toContain("bronze: '#A88462'");
    expect(tailwindContent).toContain("sand: '#D5C4AE'");
    expect(tailwindContent).toContain("charcoal: '#4A4A46'");
    expect(tailwindContent).toContain("gold: '#E5A93C'");
    expect(tailwindContent).toContain("crimson: '#E50914'");
    expect(tailwindContent).toContain("sage: '#87A96B'");
    expect(tailwindContent).toContain("'walnut-deep': '#5A3E2B'");
    expect(tailwindContent).toContain("amber: '#D5851F'");
    expect(tailwindContent).toContain("'amber-glow': '#D5851F'");
    expect(tailwindContent).not.toContain("cyan: '#06B6D4'");
    expect(tailwindContent).not.toContain("indigo: '#6366F1'");
    expect(tailwindContent).not.toContain("violet: '#8B5CF6'");

    // CTA bindings
    expect(tailwindContent).toContain("primary: 'var(--cta-primary-bg)'");
    expect(tailwindContent).toContain("'primary-text': 'var(--cta-primary-text)'");

    // CSS Variable bindings
    expect(tailwindContent).toContain("page: 'var(--bg-page)'");
    expect(tailwindContent).toContain("surface: 'var(--bg-surface)'");
    expect(tailwindContent).toContain("card: 'var(--bg-card)'");
    expect(tailwindContent).toContain("hover: 'var(--bg-hover)'");
    expect(tailwindContent).toContain("'text-main': 'var(--text-main)'");
    expect(tailwindContent).toContain("'text-sub': 'var(--text-sub)'");
    expect(tailwindContent).toContain("'text-muted': 'var(--text-muted)'");
    expect(tailwindContent).toContain("info: 'var(--info)'");
  });
});

