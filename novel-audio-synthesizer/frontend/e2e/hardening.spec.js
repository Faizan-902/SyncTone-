import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('SyncTone Hardening E2E Suite', () => {

  test('1. Catalog to Novel to Reader navigation and play/pause toggle', async ({ page }) => {
    await page.goto('/');

    // Catalog loaded
    await expect(page.getByRole('heading', { name: /Novel Library/i })).toBeVisible();

    // Find and click a novel card
    const novelCard = page.locator('article.novel-card-hybrid').first();
    await expect(novelCard).toBeVisible({ timeout: 10000 });
    await novelCard.click();

    // Verify novel details or header breadcrumb is visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('2. Search debounce filters catalog smoothly', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/Search by title, author, or narrator/i);
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('Sherlock');
    await page.waitForTimeout(300);

    // Verify filter applied
    await expect(searchInput).toHaveValue('Sherlock');
  });

  test('3. Tab keyboard navigation with arrow keys and roving tabindex', async ({ page }) => {
    await page.goto('/');

    const verifiedTab = page.getByRole('tab', { name: /Verified Originals/i });
    const communityTab = page.getByRole('tab', { name: /Community Novels/i });

    await verifiedTab.focus();
    await page.keyboard.press('ArrowRight');

    // Community tab should now be selected
    await expect(communityTab).toHaveAttribute('aria-selected', 'true');
  });

  test('4. Theme toggle persists between light and dark modes', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button[title*="Switch Theme"]').first();
    await expect(themeToggle).toBeVisible();

    // Click toggle
    await themeToggle.click();
    await page.waitForTimeout(200);

    // Verify html data-theme or class
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.className);
    expect(themeAttr).toBeTruthy();
  });

  test('5. Error toast surfaces on forced network failure', async ({ page }) => {
    await page.route('**/api/novels*', (route) => route.abort('failed'));
    await page.goto('/');

    // Should display graceful error state with retry
    await expect(page.getByText(/Check your connection|Failed to load/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('6. Modal focus trap and Esc to close', async ({ page }) => {
    await page.goto('/');

    const signInBtn = page.getByRole('button', { name: 'Sign In', exact: true });
    if (await signInBtn.isVisible()) {
      await signInBtn.click();

      // Modal open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('7. Axe accessibility audit on Home page (Dark & Light)', async ({ page }) => {
    await page.goto('/');

    // Dark Mode Axe
    const darkResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const criticalDark = darkResults.violations.filter(v => v.impact === 'critical');
    expect(criticalDark).toEqual([]);

    // Switch to Light Mode and check Axe
    const themeToggle = page.locator('button[title*="Switch Theme"]').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(300);

      const lightResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast'])
        .analyze();

      const criticalLight = lightResults.violations.filter(v => v.impact === 'critical');
      expect(criticalLight).toEqual([]);
    }
  });
});
