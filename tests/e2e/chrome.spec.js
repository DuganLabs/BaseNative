import { test, expect } from '@playwright/test';
import { ROUTES } from './audit-routes.js';

// The phone tab bar is fixed chrome. Page content scrolls under it, so at
// every scroll position the bar is what paints at its own points. A
// choice-group card raises its control to the raised layer, and with the
// bar at z-index auto that control drew over the Home tab.
test.describe('fixed chrome paints above the page @393', () => {
  test.use({ viewport: { width: 393, height: 852 } });
  for (const route of ROUTES) {
    test(route, async ({ page }) => {
      const res = await page.goto(route);
      if (res.status() === 404) test.skip(true, `${route} is not served`);
      const covered = await page.evaluate(async () => {
        const bar = [...document.querySelectorAll('body *')].find(
          (e) => getComputedStyle(e).position === 'fixed' && e.matches('nav'),
        );
        if (!bar) return ['no fixed nav'];
        const out = new Set();
        const max = document.documentElement.scrollHeight - innerHeight;
        for (let y = 0; y <= max + innerHeight / 2; y += innerHeight / 2) {
          scrollTo(0, Math.min(y, max));
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const r = bar.getBoundingClientRect();
          for (let x = r.left + 4; x < r.right - 4; x += 12) {
            for (const py of [r.top + 4, r.top + r.height / 2, r.bottom - 4]) {
              const hit = document.elementFromPoint(x, py);
              if (hit && !bar.contains(hit) && !hit.closest('[popover], dialog'))
                out.add(`${hit.tagName.toLowerCase()}${hit.type ? '[' + hit.type + ']' : ''}`);
            }
          }
        }
        return [...out];
      });
      expect(covered).toEqual([]);
    });
  }
});

// Sampling points under the bar can miss a specimen that happens to sit
// between two scroll steps, so this checks the stacking directly: a
// staged toast tray kept its z-index of 60 as a grid item and drew over
// the tab bar on the home gallery.
test.describe('no staged specimen stacks above the fixed chrome @393', () => {
  test.use({ viewport: { width: 393, height: 852 } });
  for (const route of ['/', '/components/toast/']) {
    test(route, async ({ page }) => {
      await page.goto(route);
      const over = await page.evaluate(() => {
        const bar = [...document.querySelectorAll('body *')].find(
          (e) => getComputedStyle(e).position === 'fixed' && e.matches('nav'),
        );
        const barZ = parseInt(getComputedStyle(bar).zIndex, 10) || 0;
        return [...document.querySelectorAll('[data-bn-component-preview] *')]
          .filter((e) => {
            const z = parseInt(getComputedStyle(e).zIndex, 10);
            return Number.isFinite(z) && z >= barZ;
          })
          .map((e) => `${e.tagName.toLowerCase()} z=${getComputedStyle(e).zIndex}`);
      });
      expect(over).toEqual([]);
    });
  }
});
