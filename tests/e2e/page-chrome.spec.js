import { test, expect } from '@playwright/test';

// One page chrome on every page (Warren, 2026-11-01 3:51 PM): the
// sticky one-row "On this page" subnav, one search/filter, one card
// surface. Each test runs every page so a page that drifts fails here.

const PAGES = ['/', '/compare', '/components', '/docs', '/ai', '/playground', '/builder'];
const SEARCH_PAGES = ['/', '/compare', '/components', '/docs', '/ai'];
const WIDTHS = [375, 768, 1440];
const NAV = "aside[variant='subnav'][aria-label='On this page']";

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`${path} @${width}: the page nav stays stuck, one row, after scrolling`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const nav = page.locator(NAV);
      await expect(nav).toHaveCount(1);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
      await page.waitForTimeout(150);
      const box = await nav.evaluate((n) => {
        const r = n.getBoundingClientRect();
        const tops = [...n.querySelectorAll('nav li:not([hidden])')].map((li) =>
          Math.round(li.getBoundingClientRect().top),
        );
        return { top: r.top, bottom: r.bottom, rows: new Set(tops).size };
      });
      expect(box.top, 'the bar is pinned near the top of the viewport').toBeGreaterThanOrEqual(0);
      expect(box.top).toBeLessThanOrEqual(16);
      expect(box.rows, 'the links sit in one scrolling row').toBe(1);
      // Every link is a 44px target.
      const short = await nav
        .locator('nav a')
        .evaluateAll(
          (as) => as.filter((a) => a.offsetParent && a.getBoundingClientRect().height < 44).length,
        );
      expect(short).toBe(0);
    });
  }
}

test('the current link is scrolled into the row, never off its edge', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/compare');
  await page.locator('#try').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const fit = await page.locator(NAV).evaluate((n) => {
    const ul = n.querySelector('nav ul');
    const cur = n.querySelector('[aria-current]');
    const u = ul.getBoundingClientRect();
    const c = cur.getBoundingClientRect();
    return { cur: cur.textContent.trim(), inside: c.left >= u.left - 1 && c.right <= u.right + 1 };
  });
  expect(fit.inside, `current link "${fit.cur}" is visible in the row`).toBe(true);
});

for (const path of SEARCH_PAGES) {
  test(`${path}: the shared search filters the page`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    const q = page.locator(`${NAV} input[type='search']`);
    await expect(q).toBeVisible();
    const visible = () =>
      page.evaluate(() => {
        const cfg = JSON.parse(document.querySelector('[data-bn-page-filter]').textContent);
        return [...document.querySelectorAll(cfg.items)].filter((el) => el.offsetParent !== null)
          .length;
      });
    const before = await visible();
    expect(before).toBeGreaterThan(1);
    await q.fill('zzqqxx-no-such-thing');
    await expect(page.locator(`${NAV} [role='status']`)).toBeVisible();
    expect(await visible()).toBe(0);
    await q.press('Escape');
    expect(await visible()).toBe(before);
  });
}

for (const scheme of ['light', 'dark']) {
  test(`every card on every page computes the one card surface (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1440, height: 900 });
    const drift = [];
    for (const path of PAGES) {
      await page.goto(path);
      const bad = await page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.cssText = 'background:var(--color-bkg-card)';
        document.body.append(probe);
        const card = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const sel =
          'main > section:not([aria-label="Playground workspace"]):not(#visual-builder), main article, [data-bn-component-card], [data-bn-component-preview], .pane, .console-region, section.bn-builder';
        return [...document.querySelectorAll(sel)]
          .filter((el) => el.offsetParent !== null)
          .filter((el) => {
            const bg = getComputedStyle(el).backgroundColor;
            return bg !== 'rgba(0, 0, 0, 0)' && bg !== card;
          })
          .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
      });
      for (const b of bad) drift.push(`${path} ${b}`);
    }
    expect(drift).toEqual([]);
  });
}

test('a Playground counter click adds a visible console line', async ({ page }) => {
  await page.goto('/playground');
  const lines = page.locator('#consoleList > li');
  await expect(lines.first()).toBeVisible();
  const before = await lines.count();
  const frame = page.frameLocator('#preview');
  await frame.getByRole('button', { name: '+' }).click();
  await expect(lines).toHaveCount(before + 1);
  await expect(lines.last()).toContainText('count = 1');
  await expect(lines.last()).toBeVisible();
});

for (const width of [375, 1440]) {
  test(`home table and toast demos lay out cleanly @${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const table = page.locator("[data-bn-gallery] table[variant='striped']").first();
    await table.scrollIntoViewIfNeeded();
    const t = await table.evaluate((tb) => {
      const cs = (el) => getComputedStyle(el);
      const head = tb.querySelector('thead th');
      const num = tb.querySelector('tbody tr td:has(> data), tbody tr > :nth-child(2)');
      const cell = tb.querySelector('tbody td');
      const fig = tb.closest('figure');
      return {
        headColor: cs(head).color,
        bodyColor: cs(tb.querySelector('tbody th')).color,
        numAlign: cs(num).textAlign,
        padInline: parseFloat(cs(cell).paddingInlineStart),
        overflow: tb.getBoundingClientRect().right - fig.getBoundingClientRect().right,
        stacked:
          cs(tb.querySelector('thead')).display === 'none' ||
          cs(tb.querySelector('tbody tr')).display !== 'table-row',
      };
    });
    expect(t.headColor, 'header text is the label colour, not a dim tint').toBe(t.bodyColor);
    expect(t.padInline).toBeGreaterThanOrEqual(12);
    expect(t.overflow, 'the table stays inside its tile').toBeLessThanOrEqual(1);
    if (!t.stacked) expect(['end', 'right']).toContain(t.numAlign);

    const tray = page
      .locator("[data-bn-component-preview] ol[variant='default'][aria-live]")
      .first();
    await tray.scrollIntoViewIfNeeded();
    const o = await tray.evaluate((ol) => {
      const out = ol.closest('output').getBoundingClientRect();
      const r = ol.getBoundingClientRect();
      const items = [...ol.children].map((li) => li.getBoundingClientRect());
      return {
        inside: r.left >= out.left - 1 && r.right <= out.right + 1,
        width: r.width,
        sameWidth: items.every((i) => Math.abs(i.width - items[0].width) < 1),
        overflowX: ol.scrollWidth - ol.clientWidth,
      };
    });
    expect(o.inside, 'the toast tray stays inside its preview').toBe(true);
    expect(o.sameWidth, 'every toast in the stack shares one width').toBe(true);
    expect(o.overflowX).toBeLessThanOrEqual(0);
  });
}

test('no service worker; every stylesheet is version-stamped so a deploy busts the cache', async ({
  page,
}) => {
  await page.goto('/docs');
  const sw = await page.evaluate(async () =>
    navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0,
  );
  expect(sw).toBe(0);
  const hrefs = await page
    .locator("link[rel='stylesheet']")
    .evaluateAll((ls) => ls.map((l) => l.getAttribute('href')));
  const local = hrefs.filter((h) => h.startsWith('/'));
  expect(local.length).toBeGreaterThan(0);
  const versions = new Set(local.map((h) => new URL(h, 'http://x').searchParams.get('v')));
  expect([...versions].every(Boolean), `unversioned: ${local.join(' ')}`).toBe(true);
  expect(versions.size, 'one deploy version across every stylesheet').toBe(1);
});
