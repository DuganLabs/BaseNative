import { test, expect } from '@playwright/test';
import { ROUTES } from './audit-routes.js';
import { contrastAudit } from './contrast-audit.js';

// Every route, light and dark: text holds AA against what it sits on
// (4.5, or 3 for large text). The sweep found the tint used as text —
// ghost buttons, the info badge, alert and badge status text on their
// fills, white on the destructive red and on the tint disc — at 1.8 to
// 4.4 to 1 in light mode.
for (const path of ROUTES) {
  test(`${path}: text holds AA contrast in light and dark`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const found = await page.evaluate(contrastAudit);
      expect(found, `${scheme}: ${JSON.stringify(found, null, 1)}`).toEqual([]);
    }
  });
}
