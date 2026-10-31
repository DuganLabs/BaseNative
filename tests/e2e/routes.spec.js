import { test, expect } from '@playwright/test';

const routes = ['/compare', '/ai', '/builder', '/does-not-exist'];

test.describe('routes the shell must serve', () => {
  for (const path of routes) {
    test(`${path} has one heading and does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      const response = await page.goto(path);
      if (path === '/does-not-exist') {
        expect(response?.status()).toBe(404);
      } else {
        expect(response?.ok()).toBeTruthy();
      }
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow).toBe(false);
    });
  }
});
