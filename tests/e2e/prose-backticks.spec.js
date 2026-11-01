import { test, expect } from '@playwright/test';

// Markdown never leaks into rendered prose: a literal backtick outside
// code is a source string that was meant to be a code chip (the docs
// lede once read "`v0.x`" with the backticks showing).
const ROUTES = ['/', '/docs/', '/compare/', '/components/', '/ai/', '/playground/', '/builder/', '/components/button/'];

for (const route of ROUTES) {
  test(`no raw backticks in prose on ${route}`, async ({ page }) => {
    await page.goto(route);
    const leaks = await page.evaluate(() => {
      const out = [];
      const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.data.includes('`')) continue;
        const el = n.parentElement;
        if (el.closest('pre, code, textarea, kbd, samp, script, style, template')) continue;
        if (!el.offsetParent) continue;
        out.push(n.data.trim().slice(0, 80));
      }
      return out;
    });
    expect(leaks).toEqual([]);
  });
}
