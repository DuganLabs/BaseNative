import { test, expect } from '@playwright/test';
import { siteRoutes } from '../../examples/express/page.js';

const WIDTHS = [320, 768, 1280];
const THEMES = ['light', 'dark'];
const AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js';

const routes = siteRoutes.filter((route) => !route.internal).map((route) => route.path);

function slug(path) {
  return path === '/' ? 'home' : path.replace(/^\//, '').replaceAll('/', '-');
}

/**
 * Rule ids axe-core 4.10.3 already reports, measured 2026-10-22 at 320/768/1280
 * in light and dark. The gate fails when a route reports an id that is not
 * listed. Node counts are not frozen: unrebuilt pages still fail color-contrast
 * and several routes have no h1. Catalog ARIA on /design-system is organism-tier
 * debt (inline dialogs, page-control radiogroup on nav, inspector aside inside
 * main, duplicate search, usage pre, hero h1 under a catalog h3).
 */
const AXE_DEBT = {
  '/': ['color-contrast'],
  '/compare': ['color-contrast', 'page-has-heading-one'],
  '/components': ['color-contrast', 'page-has-heading-one'],
  '/docs': ['color-contrast', 'page-has-heading-one'],
  '/ai': ['color-contrast', 'page-has-heading-one'],
  '/playground': ['color-contrast', 'landmark-complementary-is-top-level', 'page-has-heading-one'],
  '/builder': [
    'aria-allowed-role',
    'aria-required-children',
    'color-contrast',
    'landmark-complementary-is-top-level',
    'page-has-heading-one',
  ],
  '/showcase': ['color-contrast'],
  '/roadmap': ['color-contrast', 'page-has-heading-one'],
  '/tasks': ['color-contrast', 'page-has-heading-one'],
  '/design-system': [
    'aria-allowed-role',
    'aria-dialog-name',
    'color-contrast',
    'heading-order',
    'landmark-complementary-is-top-level',
    'landmark-unique',
    'scrollable-region-focusable',
  ],
};

function knownAxe(path) {
  return AXE_DEBT[path] ?? [];
}

async function overflow(page) {
  return page.evaluate(() => {
    const problems = [];
    for (const el of document.body.querySelectorAll('[data-bn^="bn-"]')) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.display === 'contents') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 1 && (rect.right > window.innerWidth + 1 || rect.left < -1)) {
        problems.push(`${el.getAttribute('data-bn')} extends past the viewport`);
      }
      if (
        style.overflowX === 'auto' ||
        style.overflowX === 'scroll' ||
        style.overflowX === 'hidden'
      ) {
        continue;
      }
      if (el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1) {
        const text = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 48);
        problems.push(
          `${el.getAttribute('data-bn')} "${text}" ${el.scrollWidth}>${el.clientWidth}`,
        );
      }
    }
    return problems.slice(0, 8);
  });
}

async function singleLine(page) {
  return page.evaluate(() => {
    const problems = [];
    const selector = [
      '[data-bn="bn-button"]',
      '[data-bn="bn-tab"]',
      '[data-bn="bn-badge"]',
      '[data-bn="bn-sidebar"] a',
      '[data-bn="bn-metric-label"]',
      '[data-bn="bn-metric-value"]',
      '[data-bn="bn-dock-item"]',
    ].join(',');
    for (const el of document.querySelectorAll(selector)) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (style.whiteSpace === 'nowrap' || style.whiteSpace === 'pre') continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = [...range.getClientRects()].map((rect) => rect.top).sort((a, b) => a - b);
      let lines = 0;
      let last = -999;
      for (const top of tops) {
        if (top - last > 8) {
          lines += 1;
          last = top;
        }
      }
      if (lines > 1) {
        const text = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 48);
        problems.push(`${el.getAttribute('data-bn') || el.tagName} "${text}" wraps`);
      }
    }
    return problems.slice(0, 8);
  });
}

test.describe('design system gates', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      for (const path of routes) {
        test(`${slug(path)} ${theme} ${width}`, async ({ page }) => {
          await page.addInitScript(() => {
            const fixed = Date.parse('2026-10-22T12:00:00Z');
            const NativeDate = Date;
            function FrozenDate(...args) {
              return args.length ? new NativeDate(...args) : new NativeDate(fixed);
            }
            FrozenDate.now = () => fixed;
            FrozenDate.parse = NativeDate.parse;
            FrozenDate.UTC = NativeDate.UTC;
            FrozenDate.prototype = NativeDate.prototype;
            window.Date = FrozenDate;
            window.setInterval = () => 0;
          });
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator('main')).toBeVisible();
          await expect(page).toHaveScreenshot(`${slug(path)}-${theme}-${width}.png`, {
            fullPage: true,
            animations: 'disabled',
            timeout: 20_000,
          });
          expect(await overflow(page)).toEqual([]);
          expect(await singleLine(page)).toEqual([]);
          await page.addScriptTag({ url: AXE_URL });
          const violations = await page.evaluate(async () => {
            const out = await window.axe.run(document, { resultTypes: ['violations'] });
            return out.violations.map((item) => item.id);
          });
          const unexpected = violations.filter((id) => !knownAxe(path).includes(id));
          expect(unexpected).toEqual([]);
        });
      }
    }
  }
});
