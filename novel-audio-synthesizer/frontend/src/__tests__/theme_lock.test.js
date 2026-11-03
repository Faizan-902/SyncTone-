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
    expect(Object.keys(darkVars).length).toBe(87);

    expect(darkVars).toMatchObject({
      '--brand-espresso': '#1A120E',
      '--brand-chocolate': '#3A2418',
      '--brand-walnut': '#5A3E2B',
      '--brand-bronze': '#A88462',
      '--brand-sand': '#D5C4AE',
      '--brand-charcoal': '#4A4A46',
      '--brand-sage': '#87A96B',
      '--brand-amber': '#D5851F',

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
      '--border-focus': '#D5851F',

      '--accent': '#D5851F',
      '--accent-hover': '#E59838',
      '--accent-surface': 'rgba(213, 133, 31, 0.15)',
      '--accent-strong': '#5A3E2B',
      '--accent-text': '#D5851F',
      '--on-accent': '#1A120E',

      '--cta-primary-bg': '#5A3E2B',
      '--cta-primary-hover': '#6D4C35',
      '--cta-primary-text': '#D5C4AE',

      '--glass-bg': 'rgba(26, 18, 14, 0.88)',
      '--glass-dock': 'rgba(58, 36, 24, 0.95)',

      '--success': '#87A96B',
      '--warning': '#D5851F',
      '--danger': '#BA4E3D',
      '--info': '#87A96B',

      '--speaker-narrator': '#D5C4AE',
      '--speaker-a': '#D5851F',
      '--speaker-b': '#87A96B',
      '--speaker-c': '#A88462',
      '--speaker-d': '#BA4E3D',

      '--top10-fill': '#1A120E',
      '--top10-stroke': 'rgba(213, 196, 174, 0.25)',
      '--top10-active': '#D5851F',

      '--card-accent': '#D5851F',

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
      '--bg-page': '#FAF8F5',
      '--bg-surface': '#FAF6F0',
      '--bg-card': '#FFFFFF',
      '--bg-hover': '#F2EBE1',
      '--bg-elevated': '#FFFFFF',

      '--text-main': '#1A120E',
      '--text-sub': '#5A3E2B',
      '--text-muted': '#8C7765',

      '--border-subtle': '#EAE3D9',
      '--border-strong': '#D5C4AE',
      '--border-hover': '#A88462',
      '--border-focus': '#5A3E2B',

      '--accent': '#5A3E2B',
      '--accent-hover': '#3A2418',
      '--accent-surface': 'rgba(90, 62, 43, 0.10)',
      '--accent-strong': '#3A2418',
      '--accent-text': '#5A3E2B',
      '--on-accent': '#FAF8F5',

      '--cta-primary-bg': '#5A3E2B',
      '--cta-primary-hover': '#3A2418',
      '--cta-primary-text': '#FAF8F5',

      '--glass-bg': 'rgba(250, 248, 245, 0.92)',
      '--glass-dock': 'rgba(255, 255, 255, 0.96)',

      '--success': '#386B2F',
      '--warning': '#D5851F',
      '--danger': '#962F22',
      '--info': '#87A96B',

      '--speaker-narrator': '#1A120E',
      '--speaker-a': '#5A3E2B',
      '--speaker-b': '#386B2F',
      '--speaker-c': '#4A4A46',
      '--speaker-d': '#962F22',

      '--top10-fill': '#FAF8F5',
      '--top10-stroke': 'rgba(26, 18, 14, 0.20)',
      '--top10-active': '#D5851F',

      '--card-accent': '#5A3E2B',
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
    expect(tailwindContent).toContain("walnut: '#5A3E2B'");
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

