import { test, expect } from '@playwright/test';

// Code never wraps. Each source line of a code sample is one line box,
// a line longer than its card scrolls the pre sideways inside the card,
// and the page itself never widens: on a phone and on a desktop.
const ROUTES = ['/', '/components/combobox/', '/components/code-block/', '/compare/'];

for (const route of ROUTES) {
  for (const width of [320, 393, 1024, 1280]) {
    test(`code lines do not wrap and scroll in their card on ${route} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      const result = await page.evaluate(() => {
        const wrapped = [];
        for (const line of document.querySelectorAll('main pre [data-code-line]')) {
          if (!line.offsetParent) continue;
          const lh = parseFloat(getComputedStyle(line).lineHeight);
          if (line.getBoundingClientRect().height > lh * 1.5)
            wrapped.push(line.textContent.trim().slice(0, 40));
        }
        const unscrollable = [];
        for (const pre of document.querySelectorAll('main pre')) {
          if (!pre.offsetParent || pre.parentElement.querySelector('textarea')) continue;
          const cs = getComputedStyle(pre);
          if (cs.whiteSpace !== 'pre' || cs.overflowWrap !== 'normal')
            wrapped.push(`pre white-space ${cs.whiteSpace} overflow-wrap ${cs.overflowWrap}`);
          if (pre.scrollWidth > pre.clientWidth + 1 && !/auto|scroll/.test(cs.overflowX))
            unscrollable.push(pre.textContent.trim().slice(0, 40));
        }
        return {
          wrapped,
          unscrollable,
          page: document.documentElement.scrollWidth - innerWidth,
        };
      });
      expect(result.wrapped).toEqual([]);
      expect(result.unscrollable).toEqual([]);
      expect(result.page, 'document scrollWidth equals the viewport').toBe(0);
    });
  }
}

test('a long line on a phone scrolls its pre sideways, and the Copy header stays put', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/components/code-block/');
  const result = await page.evaluate(() => {
    const pre = [...document.querySelectorAll('main figure[variant="code"] > pre')].find(
      (p) => p.offsetParent && p.scrollWidth > p.clientWidth + 1,
    );
    if (!pre) return null;
    const cap = pre.parentElement.querySelector('figcaption');
    const before = cap?.getBoundingClientRect().left;
    pre.scrollLeft = 80;
    return {
      scrolled: pre.scrollLeft,
      capMoved: cap ? cap.getBoundingClientRect().left - before : 0,
      page: document.documentElement.scrollWidth - innerWidth,
    };
  });
  expect(result, 'a code card with a line longer than 320px').not.toBeNull();
  expect(result.scrolled).toBeGreaterThan(0);
  expect(result.capMoved).toBe(0);
  expect(result.page).toBe(0);
});
