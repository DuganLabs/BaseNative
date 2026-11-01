import { test, expect } from '@playwright/test';

// The playground's panes are tool frames. The host sheet's article
// inset (16px) and stacked header used to float each pane's header and
// editor inside a second frame, centre the Result title, and, tabbed,
// the panel heading repeated the selected tab's label right under it.
for (const width of [393, 768, 1280, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`playground panes are flush one-line frames at ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/playground/');
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await page.locator('.pane-head').first().waitFor();
      const r = await page.evaluate(() => {
        const problems = [];
        const ws = document.querySelector("section[aria-label='Playground workspace']");
        const tabsShown = [...ws.querySelectorAll("[role='tablist']")].some((t) => t.offsetParent);
        const selected = ws.querySelector("[role='tab'][aria-selected='true']")?.textContent.trim();
        for (const art of ws.querySelectorAll('article')) {
          if (!art.offsetParent) continue;
          const head = art.querySelector(':scope > header');
          if (!head) continue;
          const a = art.getBoundingClientRect();
          const h = head.getBoundingClientRect();
          const name = art.dataset.pane || 'result';
          if (h.left - a.left > 2 || h.top - a.top > 2) problems.push(`${name} header inset ${Math.round(h.left - a.left)}px`);
          const kids = [...head.children].filter((k) => k.offsetParent && k.getBoundingClientRect().width > 1);
          const tops = kids.map((k) => k.getBoundingClientRect().top);
          if (kids.length > 1 && Math.max(...tops) - Math.min(...tops) > 6) problems.push(`${name} header wraps to rows`);
          const h2 = head.querySelector('h2');
          if (tabsShown && h2 && h2.getBoundingClientRect().width > 1 && h2.textContent.trim() === selected)
            problems.push(`${name} heading repeats the selected tab`);
        }
        return { problems, tabsShown };
      });
      expect(r.problems).toEqual([]);
      if (width <= 768) expect(r.tabsShown).toBe(true);
    });
  }
}
