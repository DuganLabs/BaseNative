import { test, expect } from '@playwright/test';

// A code line wraps rather than hiding behind a sideways scroll, on a
// phone and on a desktop. The continuation used to restart at column 0, so wrapped code
// lost its structure ("count.set(...)" sat under "const"). Each source
// line is its own element, and a wrapped continuation hangs two columns
// past that line's own indent.
const ROUTES = ['/', '/components/combobox/', '/compare/'];

for (const route of ROUTES) {
  for (const width of [320, 393, 1024, 1280]) {
    test(`wrapped code hangs under its own indent on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      const result = await page.evaluate(() => {
        const unsplit = [...document.querySelectorAll('main pre')].filter(
          (pre) =>
            pre.offsetParent &&
            pre.textContent.trim().includes('\n') &&
            !pre.parentElement.querySelector('textarea') &&
            !pre.querySelector('[data-code-line]'),
        ).length;
        const bad = [];
        let wrapped = 0;
        for (const line of document.querySelectorAll('main pre [data-code-line]')) {
          if (!line.offsetParent) continue;
          const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
          if (line.getBoundingClientRect().height < lineHeight * 1.5) continue;
          wrapped++;
          const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          let firstTop = null;
          let firstLeft = null;
          let charWidth = null;
          let continuation = null;
          for (let node = walker.nextNode(); node && !continuation; node = walker.nextNode()) {
            for (let i = 0; i < node.length; i++) {
              if (/\s/.test(node.data[i])) continue;
              range.setStart(node, i);
              range.setEnd(node, i + 1);
              const box = range.getBoundingClientRect();
              if (!box.width) continue;
              if (firstTop === null) {
                firstTop = box.top;
                charWidth = box.width;
                const lead = Number(line.getAttribute('data-code-indent'));
                firstLeft = box.left - lead * charWidth;
              } else if (box.top > firstTop + lineHeight / 2) {
                continuation = box;
                break;
              }
            }
          }
          if (!continuation) continue;
          const indent = Number(line.getAttribute('data-code-indent'));
          const expected = firstLeft + (indent + 2) * charWidth;
          if (continuation.left < expected - 1) {
            bad.push(
              `${line.textContent.trim().slice(0, 40)}: continuation at ${Math.round(continuation.left - firstLeft)}px, expected ${Math.round(expected - firstLeft)}px`,
            );
          }
        }
        return { unsplit, wrapped, bad };
      });
      expect(result.unsplit, 'multi-line code blocks without line elements').toBe(0);
      expect(result.bad).toEqual([]);
    });
  }
}

test('the home counter sample wraps at 320px and keeps its structure', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  const wrapped = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-bn-hero-demo] pre [data-code-line]')].filter(
        (line) =>
          line.getBoundingClientRect().height > parseFloat(getComputedStyle(line).lineHeight) * 1.5,
      ).length,
  );
  expect(wrapped).toBeGreaterThan(0);
});
