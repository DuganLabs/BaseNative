import { test, expect } from '@playwright/test';

// Pagination, at every width a phone or a desktop gives it: one row,
// inside its pane, either end of the run one tap away, every link a
// 44px target, and Previous and Next named even as bare chevrons.
// (At 320 the narrow window once dropped pages 1 and 8: "Previous 2 3
// 4 Next".)

const WIDTHS = [320, 393, 768, 1280];
const NAV = '[data-bn-component-preview] nav[variant="pagination"]';

for (const width of WIDTHS) {
  test.describe(`pagination @${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('one row, inside its pane, both ends shown, every link a target', async ({ page }) => {
      await page.goto('/components/pagination/');
      const nav = page.locator(NAV).first();
      await nav.scrollIntoViewIfNeeded();
      const m = await nav.evaluate((el) => {
        const ol = el.querySelector('ol');
        const shown = [...ol.children].filter((li) => getComputedStyle(li).display !== 'none');
        const pane = el.parentElement.getBoundingClientRect();
        return {
          narrow: pane.width < 28 * parseFloat(getComputedStyle(document.documentElement).fontSize),
          tops: shown.map((li) => Math.round(li.getBoundingClientRect().top)),
          right: el.querySelector('ol').getBoundingClientRect().right,
          paneRight: pane.right,
          overflow: ol.scrollWidth - ol.clientWidth,
          labels: shown.map((li) => li.textContent.trim()),
          current: ol.querySelector('[aria-current]').textContent.trim(),
          linkInk: getComputedStyle(ol.querySelector('a[href]')).color,
          inertInks: [...ol.querySelectorAll('a:not([href], [aria-current])')]
            .filter((a) => getComputedStyle(a.parentElement).display !== 'none')
            .map((a) => getComputedStyle(a).color),
          links: [...ol.querySelectorAll('a[href]')]
            .filter((a) => getComputedStyle(a.parentElement).display !== 'none')
            .map((a) => {
              const r = a.getBoundingClientRect();
              return { label: a.textContent.trim(), w: r.width, h: r.height };
            }),
          steps: [...ol.querySelectorAll('a:has(> svg)')].map((a) => {
            const r = a.getBoundingClientRect();
            const svg = a.querySelector('svg');
            const s = svg.getBoundingClientRect();
            return {
              svgShown: getComputedStyle(svg).display !== 'none',
              dx: Math.abs(s.left + s.width / 2 - (r.left + r.width / 2)),
              dy: Math.abs(s.top + s.height / 2 - (r.top + r.height / 2)),
              w: r.width,
            };
          }),
        };
      });
      expect(new Set(m.tops).size, `one row: ${m.labels.join(' ')}`).toBe(1);
      expect(m.overflow).toBeLessThanOrEqual(0);
      expect(m.right).toBeLessThanOrEqual(m.paneRight + 0.5);
      const numbers = m.labels.filter((l) => /^\d+$/.test(l)).map(Number);
      expect(numbers[0], `first page shown: ${m.labels.join(' ')}`).toBe(1);
      expect(numbers).toContain(Number(m.current));
      expect(Math.max(...numbers), 'last page shown').toBe(8);
      // Never two gaps in a row; in the wide window a gap is two or more pages.
      for (let i = 1; i < m.labels.length; i += 1) {
        expect(m.labels[i] === '…' && m.labels[i - 1] === '…').toBe(false);
      }
      if (!m.narrow) {
        for (let i = 0; i < numbers.length - 1; i += 1) {
          expect(numbers[i + 1] - numbers[i]).not.toBe(2);
        }
      }
      // A gap is not a link, so it is not drawn in the link tint.
      expect(m.inertInks.length).toBeGreaterThan(0);
      for (const ink of m.inertInks) expect(ink).not.toBe(m.linkInk);
      for (const link of m.links) {
        expect(link.w, `${link.label} width`).toBeGreaterThanOrEqual(44);
        expect(link.h, `${link.label} height`).toBeGreaterThanOrEqual(44);
      }
      for (const step of m.steps) {
        expect(step.svgShown).toBe(m.narrow);
        if (m.narrow) {
          expect(step.dx).toBeLessThanOrEqual(2);
          expect(step.dy).toBeLessThanOrEqual(2);
          expect(step.w).toBeGreaterThanOrEqual(44);
        }
      }
      await expect(page.locator(NAV).first().getByRole('link', { name: 'Next' })).toBeVisible();
      await expect(
        page.locator(NAV).first().getByRole('link', { name: '1', exact: true }),
      ).toBeVisible();
    });
  });
}

// The current page reads as a place, not just a heavier digit: a tinted
// pill at least a 44px square, its digit centred, in light and dark.
// (It was once bare semibold text between two links of the same size.)
for (const theme of ['light', 'dark']) {
  for (const width of [393, 1280]) {
    test(`current page sits on a filled pill @${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/components/pagination/');
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const cur = page.locator(`${NAV} [aria-current]`).first();
      await cur.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const m = await cur.evaluate((a) => {
        const cs = getComputedStyle(a);
        const r = a.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(a);
        const g = range.getBoundingClientRect();
        return {
          bg: cs.backgroundColor,
          radius: parseFloat(cs.borderTopLeftRadius),
          w: r.width,
          h: r.height,
          dx: Math.abs(g.left + g.width / 2 - (r.left + r.width / 2)),
          dy: Math.abs(g.top + g.height / 2 - (r.top + r.height / 2)),
        };
      });
      expect(m.bg, 'current page has a fill').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
      expect(m.radius, 'fill is a pill').toBeGreaterThanOrEqual(m.h / 2 - 1);
      expect(m.w).toBeGreaterThanOrEqual(44);
      expect(m.h).toBeGreaterThanOrEqual(44);
      expect(m.dx).toBeLessThanOrEqual(2);
      expect(m.dy).toBeLessThanOrEqual(2);
    });
  }
}

// In the compact window the gap glyph is set off from the current-page
// pill, not drawn against its edge. A 320px phone has 34px of spare row
// for two gaps, so there the glyph only has to stay clear of the pill.
for (const [width, clear] of [[320, 0], [393, 6], [430, 6]]) {
  test(`compact gap glyph clears the current pill @${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/components/pagination/');
    const cur = page.locator(`${NAV} [aria-current]`).first();
    await cur.scrollIntoViewIfNeeded();
    const m = await cur.evaluate((a) => {
      const r = a.getBoundingClientRect();
      const out = [];
      for (const li of a.closest('ol').children) {
        const g = li.querySelector('a[aria-hidden]:not(:has(> svg))');
        if (!g || !g.offsetParent) continue;
        const range = document.createRange();
        range.selectNodeContents(g);
        const b = range.getBoundingClientRect();
        out.push(b.right <= r.left ? r.left - b.right : b.left - r.right);
      }
      return { out, nav: a.closest('nav').getBoundingClientRect().width, ol: a.closest('ol').scrollWidth };
    });
    expect(m.out.length).toBeGreaterThan(0);
    for (const d of m.out) expect(d, 'gap glyph to pill').toBeGreaterThanOrEqual(clear);
    expect(m.ol, 'row fits').toBeLessThanOrEqual(Math.ceil(m.nav) + 1);
  });
}
