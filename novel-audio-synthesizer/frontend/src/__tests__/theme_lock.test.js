import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * THEME LOCK REGRESSION TEST
 *
 * Visual Identity: Atelier Obsidian (Dark) & Editorial Light (Cold-Press Vellum)
 * Living Accent: Electric Cinnabar Vermilion (oklch 0.67 0.220 36 / 0.52 0.220 34)
 *
 * HARD CONSTRAINT:
 * NO color, token, shadow color, opacity, gradient, or theme-related value
 * may change anywhere, for any reason (including accessibility contrast).
 * If this test fails, a theme regression was introduced.
 */

function extractCssVariables(cssContent, selectorRegex) {
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

describe('Theme Lock: Token & Color Parity', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('matches locked tokens for Dark Mode (:root, html.dark)', () => {
    const darkVars = extractCssVariables(cssContent, /:root,\s*html\.dark\s*\{([^}]+)\}/);

    expect(darkVars['--bg-page']).toBe('oklch(0.13 0.006 260)');
    expect(darkVars['--bg-surface']).toBe('oklch(0.16 0.008 260)');
    expect(darkVars['--bg-card']).toBe('oklch(0.19 0.010 260)');
    expect(darkVars['--bg-hover']).toBe('oklch(0.23 0.012 260)');
    expect(darkVars['--bg-elevated']).toBe('oklch(0.21 0.010 260)');

    expect(darkVars['--text-main']).toBe('oklch(0.96 0.005 260)');
    expect(darkVars['--text-sub']).toBe('oklch(0.85 0.008 260)');
    expect(darkVars['--text-muted']).toBe('oklch(0.74 0.010 260)');

    expect(darkVars['--accent']).toBe('oklch(0.72 0.200 55)');
    expect(darkVars['--accent-hover']).toBe('oklch(0.76 0.190 58)');
    expect(darkVars['--accent-surface']).toBe('rgba(255, 121, 0, 0.12)');
    expect(darkVars['--on-accent']).toBe('oklch(0.12 0.010 260)');

    expect(darkVars['--border-subtle']).toBe('rgba(255, 255, 255, 0.07)');
    expect(darkVars['--border-strong']).toBe('rgba(255, 255, 255, 0.20)');
    expect(darkVars['--border-focus']).toBe('oklch(0.72 0.200 55)');

    expect(darkVars['--speaker-narrator']).toBe('oklch(0.85 0.008 260)');
    expect(darkVars['--speaker-a']).toBe('oklch(0.72 0.200 55)');
    expect(darkVars['--speaker-b']).toBe('oklch(0.77 0.140 155)');
    expect(darkVars['--speaker-c']).toBe('oklch(0.76 0.140 235)');
    expect(darkVars['--speaker-d']).toBe('oklch(0.76 0.150 320)');
  });

  it('matches locked tokens for Light Mode (html.light)', () => {
    const lightVars = extractCssVariables(cssContent, /html\.light\s*\{([^}]+)\}/);

    expect(lightVars['--bg-page']).toBe('oklch(0.985 0.003 240)');
    expect(lightVars['--bg-surface']).toBe('oklch(1.000 0.000 0)');
    expect(lightVars['--bg-card']).toBe('oklch(0.955 0.005 240)');
    expect(lightVars['--bg-hover']).toBe('oklch(0.925 0.008 240)');
    expect(lightVars['--bg-elevated']).toBe('oklch(1.000 0.000 0)');

    expect(lightVars['--text-main']).toBe('oklch(0.16 0.010 260)');
    expect(lightVars['--text-sub']).toBe('oklch(0.29 0.012 260)');
    expect(lightVars['--text-muted']).toBe('oklch(0.43 0.015 260)');

    expect(lightVars['--accent']).toBe('oklch(0.52 0.170 48)');
    expect(lightVars['--accent-hover']).toBe('oklch(0.46 0.170 46)');
    expect(lightVars['--accent-surface']).toBe('rgba(178, 62, 0, 0.10)');
    expect(lightVars['--on-accent']).toBe('oklch(1.00 0.000 0)');

    expect(lightVars['--border-subtle']).toBe('rgba(20, 25, 35, 0.08)');
    expect(lightVars['--border-strong']).toBe('rgba(20, 25, 35, 0.20)');
    expect(lightVars['--border-focus']).toBe('oklch(0.52 0.170 48)');

    expect(lightVars['--speaker-narrator']).toBe('oklch(0.20 0.010 260)');
    expect(lightVars['--speaker-a']).toBe('oklch(0.46 0.170 46)');
    expect(lightVars['--speaker-b']).toBe('oklch(0.38 0.120 155)');
    expect(lightVars['--speaker-c']).toBe('oklch(0.38 0.130 240)');
    expect(lightVars['--speaker-d']).toBe('oklch(0.40 0.160 330)');
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
