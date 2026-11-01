import { test, expect } from '@playwright/test';

// Inline code chips. A chip inside a link is part of the link: link
// ink, no underline of its own (one once drew a second, label-coloured
// line under the chip). A chip anywhere else paints a fill that differs
// from the surface behind it (the meta row's chips once used the light
// page colour, padding with no visible chip).

for (const theme of ['light', 'dark']) {
  for (const width of [393, 1280]) {
    test.describe(`code chips @${width} ${theme}`, () => {
      test.use({ viewport: { width, height: 900 } });

      test('a chip in a link takes the link ink and no underline of its own', async ({ page }) => {
        await page.goto('/docs/');
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        await page.waitForTimeout(400);
        const bad = await page.evaluate(() =>
          [...document.querySelectorAll('main a code')]
            .filter((c) => c.getClientRects().length)
            .map((c) => {
              const a = c.closest('a');
              const cs = getComputedStyle(c);
              return { t: c.textContent, ink: cs.color === getComputedStyle(a).color, line: cs.textDecorationLine };
            })
            .filter((r) => !r.ink || r.line !== 'none'),
        );
        expect(bad).toEqual([]);
      });

      test('a meta row chip paints a visible fill', async ({ page }) => {
        await page.goto('/components/breadcrumb/');
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        await page.waitForTimeout(400);
        const bad = await page.evaluate(() => {
          const behind = (el) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
              const bg = getComputedStyle(p).backgroundColor;
              if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
            }
            return 'rgb(255, 255, 255)';
          };
          return [...document.querySelectorAll('main dd code')]
            .filter((c) => c.getClientRects().length)
            .map((c) => ({ t: c.textContent, bg: getComputedStyle(c).backgroundColor, under: behind(c) }))
            .filter((r) => r.bg === r.under || r.bg === 'rgba(0, 0, 0, 0)');
        });
        expect(bad).toEqual([]);
      });
    });
  }
}

// A link's trailing arrow stays with the word before it: at 393 the
// docs "Full … reference in docs/api →" links once wrapped the arrow
// alone onto a line of its own. The binding is a no-break space, so
// the check holds whatever font the runner wraps with.
test('a trailing link arrow is bound to the word before it', async ({ page }) => {
  await page.goto('/docs/');
  const loose = await page.evaluate(() =>
    [...document.querySelectorAll('main a')]
      .map((a) => a.textContent.replace(/\s+$/, ''))
      .filter((t) => t.endsWith('→') && !t.endsWith('\u00a0→'))
      .map((t) => t.trim()),
  );
  expect(loose).toEqual([]);
});
