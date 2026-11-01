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
