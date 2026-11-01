import { test, expect } from '@playwright/test';

// A restacked table cell carries its column heading as a key LINE above
// the value. An inline key ran into the value ("FromWhere others win",
// "StatusAccepted"), so a phone reader could not tell label from text.
// /ai/ carries no table since its scorecard became prose.
const ROUTES = ['/compare/', '/docs/'];

for (const route of ROUTES) {
  for (const width of [320, 393]) {
    test(`restacked cell keys sit on their own line on ${route} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      const bad = await page.evaluate(() => {
        const out = [];
        let seen = 0;
        for (const key of document.querySelectorAll('main table td > b')) {
          const keyBox = key.getBoundingClientRect();
          if (!keyBox.width) continue;
          const range = document.createRange();
          range.setStartAfter(key);
          range.setEndAfter(key.parentElement.lastChild);
          const rects = [...range.getClientRects()].filter((r) => r.width > 0);
          if (!rects.length) continue;
          seen += 1;
          // A pair reads as one: the next cell's key sits further from
          // this value than this key sits from it.
          const next = key.parentElement.nextElementSibling;
          const nextKey = next && next.querySelector(':scope > b');
          if (nextKey && nextKey.getBoundingClientRect().width) {
            const within = rects[0].top - keyBox.bottom;
            const between = nextKey.getBoundingClientRect().top - rects.at(-1).bottom;
            if (between < 8 || between <= within) {
              out.push(`${key.textContent.trim()}: ${Math.round(between)}px to next pair`);
            }
          }
          if (rects[0].top < keyBox.bottom - 1) {
            out.push(
              `${key.textContent.trim()} → ${key.parentElement.textContent.trim().slice(0, 40)}`,
            );
          }
        }
        return { seen, bad: out.slice(0, 5) };
      });
      expect(bad.seen, 'restacked keys measured').toBeGreaterThan(0);
      expect(bad.bad).toEqual([]);
    });
  }
}
