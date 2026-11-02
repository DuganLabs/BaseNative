import { test, expect } from '@playwright/test';
import { ROUTES } from './audit-routes.js';
import { contrastAudit } from './contrast-audit.js';
import { settle } from './settle.js';

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
      // Colours are read at rest: a button still fading from its old
      // fill to the destructive red read 4.35 in CI (at rest it is 6.06).
      await settle(page);
      const found = await page.evaluate(contrastAudit);
      expect(found, `${scheme}: ${JSON.stringify(found, null, 1)}`).toEqual([]);
    }
  });
}

// The audit reads settled colours. A pale fill fading to the home
// Delete button's red is an animation; mid-fade it can read under AA, so the
// audit waits for every finite animation to finish first.
test('the audit reads colours after animations settle', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const del = page.locator('button[variant="destructive"]', { hasText: 'Delete' }).first();
  // A pale fill fading to the destructive red, as when the button paints
  // before its stylesheet lands. Mid-fade the audit would flag it.
  await del.evaluate((el) => {
    el.animate(
      [
        { backgroundColor: 'rgb(240, 240, 240)' },
        { backgroundColor: getComputedStyle(el).backgroundColor },
      ],
      {
        duration: 400,
      },
    );
  });
  expect(await page.evaluate(contrastAudit)).not.toEqual([]);
  expect(await page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
  await settle(page);
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime),
          ).length,
    ),
  ).toBe(0);
  expect(await page.evaluate(contrastAudit)).toEqual([]);
});

// The destructive button holds AA with margin at rest, light and dark.
test('destructive button text is at least 4.8:1 at rest', async ({ page }) => {
  await page.goto('/');
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await settle(page);
    const ratio = await page
      .locator('button[variant="destructive"]', { hasText: 'Delete' })
      .first()
      .evaluate((el) => {
        const rgb = (c) =>
          c
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number);
        const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const cs = getComputedStyle(el);
        const [a, b] = [lum(rgb(cs.color)), lum(rgb(cs.backgroundColor))].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      });
    console.log(`destructive ${scheme}: ${ratio.toFixed(2)}`);
    expect(ratio, scheme).toBeGreaterThanOrEqual(4.8);
  }
});
