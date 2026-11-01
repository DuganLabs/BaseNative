import { test, expect } from '@playwright/test';

// The install command is the first thing a visitor copies. It sits
// above the fold as a copyable terminal block, before the calls to
// action, not as inline code inside the lede sentence.
for (const width of [320, 393, 1024, 1280, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`home install command is copyable above the fold @${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const m = await page.evaluate(() => {
        const hero = document.querySelector('main figure[variant="hero"], main > figure');
        const blocks = [...document.querySelectorAll('main figure[variant="code"]')];
        const install = blocks.find((f) => f.querySelector('pre')?.textContent.trim() === 'npm install @basenative/runtime');
        if (!install) return { found: false };
        const r = install.getBoundingClientRect();
        const copy = install.querySelector('button');
        const nav = install.closest('figcaption')?.querySelector(':scope > nav');
        return {
          found: true,
          inHero: !!hero && hero.contains(install),
          bottom: r.bottom,
          copy: !!copy && copy.getBoundingClientRect().width > 0,
          afterLede: r.top >= (install.closest('figcaption')?.querySelector(':scope > :is(h1, h2) + p')?.getBoundingClientRect().bottom ?? Infinity) - 1,
          beforeActions: !!nav && r.bottom <= nav.getBoundingClientRect().top + 1,
          right: r.right,
          vw: document.documentElement.clientWidth,
        };
      });
      expect(m.found, 'terminal block with the install command').toBe(true);
      expect(m.inHero, 'inside the hero').toBe(true);
      expect(m.copy, 'has a copy button').toBe(true);
      expect(m.afterLede, 'sits after the lede').toBe(true);
      expect(m.beforeActions, 'sits before the calls to action').toBe(true);
      expect(m.bottom, 'above the fold').toBeLessThanOrEqual(900);
      expect(m.right).toBeLessThanOrEqual(m.vw);
    });
  }
}
