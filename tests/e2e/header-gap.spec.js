import { test, expect } from '@playwright/test';

// A tool or reference page's header (title and lede, no hero actions)
// is followed by its content at the header gap: 32px, 40px beside the
// rail. It used to take the full section gap (48/80px), leaving the
// lede adrift above the tool it introduces. Pages with hero actions
// keep the section gap.
const TOOLS = ['/docs/', '/compare/', '/playground/', '/builder/'];
const HEROES = ['/', '/components/'];

for (const width of [393, 1280]) {
  for (const route of [...TOOLS, ...HEROES]) {
    test(`header to content gap on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const gap = await page.evaluate(() => {
        const f = document.querySelector('main[variant="default"] > figure[variant="stacked"]');
        return Math.round(f.nextElementSibling.getBoundingClientRect().top - f.getBoundingClientRect().bottom);
      });
      if (TOOLS.includes(route)) expect(gap).toBe(width >= 1024 ? 40 : 32);
      else expect(gap).toBeGreaterThanOrEqual(48);
    });
  }
}
