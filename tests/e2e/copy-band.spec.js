import { test, expect } from '@playwright/test';

// A code figure reserves room for a Copy button only when it has one.
// A captioned figure with Copy puts both in one header band above the
// code, instead of an empty strip of padding over short samples; a
// figure with neither (the compare page's columns) keeps the default
// inset, not a 60px strip with nothing in it.
const ROUTES = ['/components/button/', '/components/combobox/', '/compare/', '/'];

for (const route of ROUTES) {
  for (const width of [393, 1280]) {
    test(`code figures reserve a copy strip only with a Copy button on ${route} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const result = await page.evaluate(() => {
        const problems = [];
        let seen = 0;
        for (const fig of document.querySelectorAll('main figure:has(> pre)')) {
          if (!fig.offsetParent || fig.querySelector(':scope > textarea')) continue;
          const pre = fig.querySelector(':scope > pre');
          const copy = fig.querySelector(":scope > [data-bn-action='copy-code']");
          const cap = fig.querySelector(':scope > figcaption');
          const pad = parseFloat(getComputedStyle(pre).paddingTop);
          seen++;
          if (!copy && pad > 24) problems.push(`${pad}px strip over code with no Copy button`);
          if (copy && cap) {
            const b = copy.getBoundingClientRect();
            const c = cap.getBoundingClientRect();
            const p = pre.getBoundingClientRect();
            if (b.bottom > p.top + 1) problems.push('Copy overlaps the code');
            if (Math.abs(b.top - c.top) > 2 || Math.abs(b.bottom - c.bottom) > 2)
              problems.push('Copy is not in the caption band');
            if (pad > 24) problems.push(`${pad}px strip under the caption band`);
          }
        }
        return { problems, seen };
      });
      expect(result.seen).toBeGreaterThan(0);
      expect(result.problems).toEqual([]);
    });
  }
}
