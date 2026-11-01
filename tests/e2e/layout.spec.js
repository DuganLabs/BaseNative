import { test, expect } from '@playwright/test';
import { layoutAudit } from './layout-audit.js';
import { ROUTES, WIDTHS } from './audit-routes.js';

/*
 * Layout conformance: every route and every component page, at every
 * audited width, in light and dark, measured by layoutAudit(). Each
 * rule here came out of a defect found in a browser sweep; the map from
 * defect to rule to test lives in docs/conformance.md.
 *
 * ENFORCED lists the rules this suite fails on. A rule joins the list in
 * the same change that fixes its last violation, so main is always
 * green and a rule never regresses once it is in.
 */

const THEMES = ['light', 'dark'];
const ENFORCED = new Set([
  'stack',
  'section',
  'row',
  'overflow',
  'word',
  'icon',
  'field',
  'picker',
  'double',
  'inset',
  'cover',
  'target',
]);

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`layout ${theme} @${width}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme: theme });
      for (const route of ROUTES) {
        test(route, async ({ page }) => {
          const res = await page.goto(route);
          if (res.status() === 404) test.skip(true, `${route} is not served`);
          await page.evaluate(() => document.fonts.ready);
          const found = await page.evaluate(layoutAudit);
          const failing = found.filter((v) => ENFORCED.has(v.rule));
          expect(failing, JSON.stringify(failing, null, 1)).toEqual([]);
        });
      }
    });
  }
}
