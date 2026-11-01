import { test, expect } from '@playwright/test';

// The /compare verdicts were green and amber text and nothing else, so
// a reader who cannot tell the colours apart (or a screen reader) got
// no verdict at all (WCAG 1.4.1). A win leads with a check, a cost with
// a caution triangle, each named; a legend explains them first.
for (const width of [393, 1280]) {
  test(`every /compare verdict carries a named shape at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/compare/');
    const result = await page.evaluate(() => {
      const bad = [];
      let marked = 0;
      for (const cell of document.querySelectorAll(
        '[data-compare-table] :is([data-tone="win"], [data-tone="cost"])',
      )) {
        const mark = cell.querySelector(':scope > svg[role="img"][aria-label]');
        if (!mark) {
          bad.push(`${cell.textContent.trim()}: no marker`);
          continue;
        }
        marked++;
        const range = document.createRange();
        range.setStartAfter(mark);
        range.setEndAfter(cell.lastChild);
        const text = [...range.getClientRects()].find((r) => r.width > 0);
        const box = mark.getBoundingClientRect();
        if (text && Math.abs(box.top + box.height / 2 - (text.top + text.height / 2)) > 2) {
          bad.push(`${cell.textContent.trim()}: marker off-centre`);
        }
      }
      const legend = document.querySelector('[data-compare-legend]');
      const table = document.querySelector('[data-compare-table]');
      const legendFirst =
        !!legend &&
        !!table &&
        !!(legend.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { bad, marked, legendFirst };
    });
    expect(result.bad).toEqual([]);
    expect(result.marked).toBeGreaterThan(10);
    expect(result.legendFirst).toBe(true);
    await expect(page.getByRole('img', { name: 'Advantage:' }).first()).toBeVisible();
    await expect(page.getByRole('img', { name: 'Cost:' }).first()).toBeVisible();
  });
}
