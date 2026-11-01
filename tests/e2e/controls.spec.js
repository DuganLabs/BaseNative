import { test, expect } from '@playwright/test';

// Bare checkboxes and radios are drawn by the site sheet (appearance:
// none), so every paint comes from a token. When those tokens went
// undefined the controls drew nothing at all; when the touch minimum sat
// on the input itself a radio drew a 44px ring. The control is a 16–28px
// ring; the 44px target is its label's.
const PAGES = ['/components/radio', '/components/choice-group', '/components/checkbox'];

for (const path of PAGES) {
  test(`${path}: every check control draws a ring at control size, in a 44px label`, async ({
    page,
  }) => {
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const controls = await page.$$eval(
        'main input[type="radio"], main input[type="checkbox"]',
        (els) =>
          els
            .filter(
              (el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden',
            )
            .map((el) => {
              const cs = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              const label = el.closest('label');
              const native = cs.appearance !== 'none';
              return {
                html: el.outerHTML.slice(0, 80),
                drawn:
                  native ||
                  parseFloat(cs.borderTopWidth) > 0 ||
                  cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
                w: r.width,
                h: r.height,
                labelH: label ? label.getBoundingClientRect().height : r.height,
              };
            }),
      );
      expect(controls.length, `${path} has controls`).toBeGreaterThan(0);
      for (const c of controls) {
        expect(c.drawn, `${scheme} ${c.html} draws a ring`).toBe(true);
        expect(c.w, `${scheme} ${c.html} width`).toBeGreaterThanOrEqual(16);
        expect(c.w, `${scheme} ${c.html} width`).toBeLessThanOrEqual(28);
        expect(c.h, `${scheme} ${c.html} height`).toBeLessThanOrEqual(28);
        expect(c.labelH, `${scheme} ${c.html} label height`).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
