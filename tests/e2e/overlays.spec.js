import { test, expect } from '@playwright/test';
import { layoutAudit } from './layout-audit.js';
import { ROUTES } from './audit-routes.js';

/*
 * Open states: every overlay a page can open (the app-bar More menu,
 * dialogs, select and combobox listboxes, the toolbar overflow menu) is
 * opened in turn and audited while it is open. A closed overlay is not
 * measured by layout.spec.js, so a defect that only shows in an open menu
 * (labels sitting low in their rows) needs this pass to be caught.
 */

const THEMES = ['light', 'dark'];
const WIDTHS = [320, 393, 1280];
const ENFORCED = new Set([
  'stack',
  'overflow',
  'word',
  'icon',
  'double',
  'inset',
  'cover',
  'target',
  'ident',
  'nowrap',
  'clip',
  'menu-row',
]);
const TRIGGERS =
  '[popovertarget], [data-bn-dialog-trigger], [aria-haspopup]:not(input), [role="combobox"]';

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`overlays ${theme} @${width}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme: theme });
      for (const route of ROUTES) {
        test(route, async ({ page }) => {
          const res = await page.goto(route);
          if (res.status() === 404) test.skip(true, `${route} is not served`);
          await page.evaluate(() => document.fonts.ready);
          const triggers = page.locator(TRIGGERS);
          const count = await triggers.count();
          const failing = [];
          let opened = 0;
          for (let i = 0; i < count; i++) {
            const trigger = triggers.nth(i);
            if (!(await trigger.isVisible()) || !(await trigger.isEnabled())) continue;
            const label = (await trigger.getAttribute('aria-label')) || (await trigger.innerText());
            await trigger.scrollIntoViewIfNeeded();
            await trigger.click();
            await page.waitForTimeout(150);
            opened++;
            for (const v of await page.evaluate(layoutAudit)) {
              if (ENFORCED.has(v.rule)) failing.push({ open: label.trim().slice(0, 32), ...v });
            }
            await page.keyboard.press('Escape');
            await page.mouse.click(1, 1);
            await page.waitForTimeout(50);
          }
          test.info().annotations.push({ type: 'opened', description: String(opened) });
          expect(failing, JSON.stringify(failing, null, 1)).toEqual([]);
        });
      }
    });
  }
}
