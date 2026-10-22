import { test, expect } from '@playwright/test';

/**
 * Shared shell gates. The phone tab bar stays in the safe area and does not
 * cover content at rest. Home type, the macOS reading column, Liquid Glass,
 * the code sample, and the grouped footer are measured, not guessed.
 */

const THEMES = ['light', 'dark'];

async function open(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test.describe('home shell', () => {
  for (const theme of THEMES) {
    test(`phone tab bar clears content (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const problems = await page.evaluate(() => {
        const bar = document.querySelector('body > [data-bn="bn-tab-bar"]');
        const scroller = document.querySelector('main');
        document.documentElement.style.scrollBehavior = 'auto';
        scroller.style.scrollBehavior = 'auto';
        const found = [];
        function hits(where) {
          const b = bar.getBoundingClientRect();
          const view = scroller.getBoundingClientRect();
          for (const el of scroller.querySelectorAll('h1, h2, p, li, pre, a, [data-bn]')) {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) continue;
            const vx = Math.max(r.left, view.left);
            const vy = Math.max(r.top, view.top);
            const vr = Math.min(r.right, view.right);
            const vb = Math.min(r.bottom, view.bottom);
            if (vr - vx < 1 || vb - vy < 1) continue;
            const x = Math.max(vx, b.left);
            const y = Math.max(vy, b.top);
            const rt = Math.min(vr, b.right);
            const bt = Math.min(vb, b.bottom);
            if (rt - x > 1 && bt - y > 1) {
              found.push(`${where} ${el.getAttribute('data-bn') || el.tagName}`);
            }
          }
        }
        scroller.scrollTop = 0;
        hits('top');
        scroller.scrollTop = scroller.scrollHeight;
        hits('bottom');
        scroller.scrollTop = 0;
        return found.slice(0, 8);
      });
      expect(problems).toEqual([]);
    });

    test(`desktop reading column (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const box = await page.evaluate(() => {
        const article = document.querySelector('main article');
        const main = document.querySelector('main');
        const a = article.getBoundingClientRect();
        const m = main.getBoundingClientRect();
        const h1 = getComputedStyle(document.querySelector('h1'));
        return {
          width: a.width,
          centerDelta: Math.abs((a.left + a.right) / 2 - (m.left + m.right) / 2),
          h1: parseFloat(h1.fontSize),
          weight: parseInt(h1.fontWeight, 10),
          columns: getComputedStyle(article).gridTemplateColumns,
        };
      });
      expect(box.width).toBeGreaterThanOrEqual(720);
      expect(box.width).toBeLessThanOrEqual(880);
      expect(box.centerDelta).toBeLessThan(24);
      expect(box.h1).toBeGreaterThanOrEqual(26);
      expect(box.weight).toBeGreaterThanOrEqual(700);
      expect(box.columns).not.toBe('none');
    });

    test(`type scale (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const phone = await page.evaluate(() => ({
        platform: document.documentElement.getAttribute('data-bn-platform'),
        body: parseFloat(getComputedStyle(document.body).fontSize),
        h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
        title: parseFloat(
          getComputedStyle(document.querySelector('[data-bn="bn-list-title"]')).fontSize,
        ),
      }));
      expect(phone.platform).toBe('ios');
      expect(phone.body).toBeGreaterThanOrEqual(17);
      expect(phone.h1).toBeGreaterThanOrEqual(34);
      expect(phone.title).toBeGreaterThanOrEqual(17);

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.waitForFunction(
        () => document.documentElement.getAttribute('data-bn-platform') === 'macos',
      );
      const desk = await page.evaluate(() => ({
        platform: document.documentElement.getAttribute('data-bn-platform'),
        body: parseFloat(getComputedStyle(document.body).fontSize),
        h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
        title: parseFloat(
          getComputedStyle(document.querySelector('[data-bn="bn-list-title"]')).fontSize,
        ),
      }));
      expect(desk.platform).toBe('macos');
      expect(desk.body).toBeGreaterThanOrEqual(13);
      expect(desk.h1).toBeGreaterThanOrEqual(26);
      expect(desk.title).toBeGreaterThanOrEqual(13);
    });

    test(`liquid glass, tiles, and backdrop (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const glass = await page.evaluate(() => {
        const list = document.querySelector('[data-bn="bn-list"]');
        const tile = document.querySelector('[data-bn="bn-symbol-tile"]');
        const hero = document.querySelector('[data-bn="bn-hero"]');
        return {
          blur: getComputedStyle(list).backdropFilter,
          tile: tile ? getComputedStyle(tile).backgroundColor : '',
          heroBlur: getComputedStyle(hero).backdropFilter,
          backdrop: getComputedStyle(document.body).backgroundImage,
        };
      });
      expect(glass.blur).toContain('blur');
      expect(glass.heroBlur).toContain('blur');
      expect(glass.tile).not.toBe('');
      expect(glass.tile).not.toBe('rgba(0, 0, 0, 0)');
      expect(glass.backdrop).toContain('gradient');
    });

    test(`code sample does not widen the phone (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const sample = await page.evaluate(() => {
        const pre = document.querySelector('pre');
        const style = getComputedStyle(pre);
        return {
          overflowX: style.overflowX,
          wider: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          within: pre.getBoundingClientRect().width <= 320,
        };
      });
      expect(sample.overflowX).toBe('auto');
      expect(sample.wider).toBe(false);
      expect(sample.within).toBe(true);
    });

    test(`grouped footer (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const foot = await page.evaluate(() => {
        const footer = document.querySelector('main > [data-bn-site-footer]');
        const link = footer.querySelector('a');
        const ul = footer.querySelector('ul');
        return {
          rows: getComputedStyle(ul).flexDirection,
          height: link.getBoundingClientRect().height,
          size: parseFloat(getComputedStyle(link).fontSize),
          fill: getComputedStyle(footer).backgroundColor,
          blur: getComputedStyle(footer).backdropFilter,
        };
      });
      expect(foot.rows).toBe('column');
      expect(foot.height).toBeGreaterThanOrEqual(44);
      expect(foot.size).toBeGreaterThanOrEqual(17);
      expect(foot.fill).not.toBe('rgba(0, 0, 0, 0)');
      expect(foot.blur).toContain('blur');
    });
  }
});
