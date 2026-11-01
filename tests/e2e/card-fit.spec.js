// A card's free space is intentional, never a dead band. Two rules:
//   1. The home hero demo card hugs its content: no empty band between
//      the code and the live result, whatever the copy beside it does.
//   2. A bento tile's specimen sits on its stage's vertical centre: when
//      the row gives it a taller stage than it needs, the free space
//      splits evenly above and below instead of pooling underneath.
import { test, expect } from '@playwright/test';

const WIDTHS = [320, 393, 768, 1024, 1100, 1280, 1440];
const SCHEMES = ['light', 'dark'];
const TOLERANCE = 2;

for (const colorScheme of SCHEMES) {
  for (const width of WIDTHS) {
    test(`home cards fit their content @${width} ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.locator('[data-bn-gallery] > li').first().waitFor();

      const result = await page.evaluate(() => {
        const free = (box) => {
          const rect = box.getBoundingClientRect();
          const style = getComputedStyle(box);
          const kids = [...box.children]
            .map((kid) => kid.getBoundingClientRect())
            .filter((r) => r.height > 0);
          const top = Math.min(...kids.map((r) => r.top));
          const bottom = Math.max(...kids.map((r) => r.bottom));
          return {
            above: top - rect.top - parseFloat(style.paddingTop),
            below: rect.bottom - parseFloat(style.paddingBottom) - bottom,
          };
        };
        const demo = document.querySelector('[data-bn-hero-demo]');
        const code = demo.querySelector(':scope > figure');
        const tiles = [...document.querySelectorAll('[data-bn-gallery] > li')].map((li) => ({
          name: li.querySelector('figcaption').textContent.trim(),
          ...free(li.querySelector('figure > output')),
        }));
        return { code: free(code), tiles };
      });

      expect(result.code.below, 'hero demo: empty band under the code card').toBeLessThanOrEqual(
        TOLERANCE,
      );
      for (const tile of result.tiles) {
        expect(
          Math.abs(tile.above - tile.below),
          `bento "${tile.name}": ${Math.round(tile.above)}px above vs ${Math.round(tile.below)}px below its specimen`,
        ).toBeLessThanOrEqual(TOLERANCE);
      }
    });
  }
}
