import { test, expect } from '@playwright/test';

// Buttons in a row are spaced by the row's gap and nothing else. The
// button sheet once added its own margin beside a sibling button, on
// top of every container's gap: the pair sat 20px apart, and when the
// row wrapped on a phone the second button started 8px in from the
// first, with only 12px between the rows.
const ROUTES = [
  '/',
  '/ai/',
  '/components/hero/',
  '/components/button/',
  '/components/form/',
  '/components/toolbar/',
  '/playground/',
];

for (const route of ROUTES) {
  for (const width of [320, 393, 1280]) {
    test(`button rows on ${route} at ${width}px: one gap, aligned wraps`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const bad = await page.evaluate(() => {
        const out = [];
        const isButton = (el) => el?.matches(':is(button, a)[variant]');
        const rows = new Set();
        for (const button of document.querySelectorAll('main :is(button, a)[variant]')) {
          if (!button.offsetParent || !isButton(button.previousElementSibling)) continue;
          const margin = parseFloat(getComputedStyle(button).marginInlineStart);
          if (margin !== 0) out.push(`${button.textContent.trim()}: ${margin}px beside a button`);
          rows.add(button.parentElement);
        }
        for (const row of rows) {
          const cs = getComputedStyle(row);
          if (!/flex/.test(cs.display) || cs.flexDirection !== 'row') continue;
          // Out-of-flow children, like an open overflow menu anchored under
          // its toggle, are not part of the row.
          const items = [...row.children].filter(
            (el) => el.offsetParent && !/absolute|fixed/.test(getComputedStyle(el).position),
          );
          const boxes = items.map((el) => el.getBoundingClientRect());
          const start = boxes[0].left;
          for (let i = 1; i < boxes.length; i++) {
            if (boxes[i].top < boxes[i - 1].bottom - 1) continue;
            if (Math.abs(boxes[i].left - start) > 1) {
              out.push(
                `${items[i].textContent.trim()}: wrapped ${Math.round(boxes[i].left - start)}px in`,
              );
            }
            const gap = boxes[i].top - boxes[i - 1].bottom;
            if (row.closest('main') && gap < 16 && row.matches('figcaption > nav')) {
              out.push(
                `${items[i].textContent.trim()}: ${Math.round(gap)}px above a wrapped hero action`,
              );
            }
          }
        }
        return out;
      });
      expect(bad).toEqual([]);
    });
  }
}
