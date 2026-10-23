import { test, expect } from '@playwright/test';

/**
 * Shared shell gates. The phone tab bar is one floating capsule. Content
 * scrolls beneath it, and the footer can scroll clear of it. Home type,
 * the macOS reading column, Liquid Glass, the code sample, and the grouped
 * footer are measured, not guessed.
 */

const THEMES = ['light', 'dark'];

function contrastOnWhite(color) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return 0;
  const parts = match[1].split(',').map((part) => parseFloat(part));
  const alpha = parts.length > 3 ? parts[3] : 1;
  const rgb = parts.slice(0, 3).map((channel) => channel * alpha + 255 * (1 - alpha));
  const lin = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return 1.05 / (L + 0.05);
}

function contrastOnDark(color) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return 0;
  const parts = match[1].split(',').map((part) => parseFloat(part));
  const alpha = parts.length > 3 ? parts[3] : 1;
  const bg = [44, 44, 46];
  const rgb = parts.slice(0, 3).map((channel, index) => channel * alpha + bg[index] * (1 - alpha));
  const lin = [...rgb, ...bg].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L1 = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  const L2 = 0.2126 * lin[3] + 0.7152 * lin[4] + 0.0722 * lin[5];
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function open(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test.describe('home shell', () => {
  for (const theme of THEMES) {
    test(`phone tab bar clears content (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      for (const where of ['top', 'middle', 'bottom']) {
        const result = await page.evaluate((place) => {
          const bar = document.querySelector('body > [data-bn="bn-tab-bar"]');
          const scroller = document.querySelector('main');
          document.documentElement.style.scrollBehavior = 'auto';
          scroller.style.scrollBehavior = 'auto';
          const max = scroller.scrollHeight - scroller.clientHeight;
          scroller.scrollTop = place === 'top' ? 0 : place === 'bottom' ? max : max / 2;
          const found = [];
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
            if (rt - x > 1 && bt - y > 1)
              found.push(`${place} ${el.getAttribute('data-bn') || el.tagName}`);
          }
          return {
            problems: found.slice(0, 8),
            barTop: b.top,
            barBottom: b.bottom,
            inner: window.innerHeight,
          };
        }, where);
        expect(result.inner - result.barBottom).toBeGreaterThanOrEqual(8);
        expect(result.inner - result.barBottom).toBeLessThan(20);
        expect(result.barTop).toBeGreaterThan(result.inner - 96);
        expect(result.problems).toEqual([]);
        const png = await page.screenshot({ fullPage: false });
        await test.info().attach(`home-${theme}-320-${where}`, {
          body: png,
          contentType: 'image/png',
        });
      }
    });

    test(`desktop reading column (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const box = await page.evaluate(() => {
        const article = document.querySelector('main article');
        const main = document.querySelector('main');
        const a = article.getBoundingClientRect();
        const m = main.getBoundingClientRect();
        const h1 = getComputedStyle(document.querySelector('h1'));
        const hero = document.querySelector('[data-bn="bn-hero"]');
        const nav = hero.querySelector('nav').getBoundingClientRect();
        const hr = hero.getBoundingClientRect();
        const pad =
          parseFloat(getComputedStyle(main).paddingLeft) +
          parseFloat(getComputedStyle(main).paddingRight);
        return {
          width: a.width,
          room: m.width - pad,
          h1: parseFloat(h1.fontSize),
          weight: parseInt(h1.fontWeight, 10),
          columns: getComputedStyle(article).gridTemplateColumns,
          ledeBottom: hero.querySelector('p:last-of-type').getBoundingClientRect().bottom,
          navTop: nav.top,
          navLeft: nav.left,
          heroLeft: hr.left,
        };
      });
      expect(box.width).toBeGreaterThan(box.room - 8);
      expect(box.width).toBeGreaterThan(900);
      expect(box.h1).toBeGreaterThanOrEqual(28);
      expect(box.weight).toBeGreaterThanOrEqual(700);
      expect(box.columns).not.toBe('none');
      expect(box.navTop).toBeGreaterThanOrEqual(box.ledeBottom - 4);
      expect(box.navLeft).toBeLessThan(box.heroLeft + 48);
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
        detail: parseFloat(
          getComputedStyle(document.querySelector('[data-bn="bn-list-detail"]')).fontSize,
        ),
        detailColor: getComputedStyle(document.querySelector('[data-bn="bn-list-detail"]')).color,
      }));
      expect(desk.platform).toBe('macos');
      expect(desk.body).toBeGreaterThanOrEqual(15);
      expect(desk.h1).toBeGreaterThanOrEqual(28);
      expect(desk.title).toBeGreaterThanOrEqual(15);
      expect(desk.detail).toBeGreaterThanOrEqual(15);
      const contrast =
        theme === 'dark' ? contrastOnDark(desk.detailColor) : contrastOnWhite(desk.detailColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
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
      await open(page, 1280, theme);
      const foot = await page.evaluate(() => {
        const footer = document.querySelector('main > [data-bn-site-footer]');
        const main = document.querySelector('main');
        const link = footer.querySelector('a');
        const style = getComputedStyle(footer);
        const pad =
          parseFloat(getComputedStyle(main).paddingLeft) +
          parseFloat(getComputedStyle(main).paddingRight);
        return {
          columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
          width: footer.getBoundingClientRect().width,
          room: main.getBoundingClientRect().width - pad,
          height: footer.getBoundingClientRect().height,
          size: parseFloat(getComputedStyle(link).fontSize),
          fill: style.backgroundColor,
          shadow: style.boxShadow,
        };
      });
      expect(foot.columns).toBeGreaterThanOrEqual(3);
      expect(foot.width).toBeGreaterThan(foot.room - 8);
      expect(foot.height).toBeLessThan(220);
      expect(foot.size).toBeGreaterThanOrEqual(15);
      expect(foot.fill).toBe('rgba(0, 0, 0, 0)');
      expect(foot.shadow).toBe('none');
    });

    test(`list tiles at phone width (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const tiles = await page.evaluate(() =>
        [...document.querySelectorAll('[data-bn="bn-list-row"] [data-bn="bn-symbol-tile"]')].map(
          (tile) => {
            const rect = tile.getBoundingClientRect();
            return {
              width: rect.width,
              height: rect.height,
              fill: getComputedStyle(tile).backgroundColor,
            };
          },
        ),
      );
      expect(tiles.length).toBeGreaterThanOrEqual(10);
      for (const tile of tiles) {
        expect(tile.width).toBeGreaterThanOrEqual(28);
        expect(tile.width).toBeLessThanOrEqual(30);
        expect(tile.height).toBeGreaterThanOrEqual(28);
        expect(tile.fill).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    test(`phone hero buttons stay proportional (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const buttons = await page.evaluate(() =>
        [...document.querySelectorAll('[data-bn="bn-hero"] [data-bn="bn-button"]')].map(
          (button) => {
            const rect = button.getBoundingClientRect();
            return { top: rect.top, height: rect.height, width: rect.width };
          },
        ),
      );
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...buttons.map((button) => button.height))).toBeLessThanOrEqual(46);
      expect(Math.abs(buttons[0].top - buttons[1].top)).toBeLessThan(8);
      expect(Math.max(...buttons.map((button) => button.width))).toBeLessThan(280);
    });

    test(`desktop hero buttons keep the atom width (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      await page.waitForFunction(
        () => document.documentElement.getAttribute('data-bn-platform') === 'macos',
      );
      const buttons = await page.evaluate(() => {
        const nav = document.querySelector('[data-bn="bn-hero"] nav');
        const navBox = nav.getBoundingClientRect();
        return [...nav.querySelectorAll('[data-bn="bn-button"]')].map((button) => {
          const rect = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          return {
            top: rect.top,
            height: rect.height,
            width: rect.width,
            nav: navBox.width,
            pad: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
            radius: parseFloat(style.borderTopLeftRadius),
          };
        });
      });
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      expect(Math.abs(buttons[0].top - buttons[1].top)).toBeLessThan(8);
      for (const button of buttons) {
        expect(button.height).toBeGreaterThanOrEqual(28);
        expect(button.width).toBeLessThan(button.nav - 8);
        expect(button.pad).toBeGreaterThanOrEqual(16);
        expect(button.radius).toBeGreaterThanOrEqual(8);
      }
    });

    test(`list tiles at desktop width (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const tiles = await page.evaluate(() =>
        [...document.querySelectorAll('[data-bn="bn-list-row"] [data-bn="bn-symbol-tile"]')].map(
          (tile) => {
            const rect = tile.getBoundingClientRect();
            return {
              width: rect.width,
              height: rect.height,
              font: parseFloat(getComputedStyle(tile).fontSize),
            };
          },
        ),
      );
      expect(tiles.length).toBeGreaterThanOrEqual(10);
      for (const tile of tiles) {
        expect(tile.width).toBeGreaterThanOrEqual(28);
        expect(tile.width).toBeLessThanOrEqual(30);
        expect(tile.height).toBeGreaterThanOrEqual(28);
        expect(tile.height).toBeLessThanOrEqual(30);
        expect(tile.font).toBeGreaterThanOrEqual(17);
      }
    });

    for (const width of [320, 375]) {
      test(`tab labels do not overlap at ${width} (${theme})`, async ({ page }) => {
        await open(page, width, theme);
        await page.waitForFunction(
          () => document.documentElement.getAttribute('data-bn-platform') === 'ios',
        );
        const labels = await page.evaluate(() => {
          const bar = document.querySelector('[data-bn="bn-tab-bar"]');
          const barRect = bar.getBoundingClientRect();
          return [...bar.querySelectorAll(':scope > [data-bn="bn-tab"]')].map((tab) => {
            const label = tab.querySelector('[data-bn="bn-tab-label"]');
            const tabRect = tab.getBoundingClientRect();
            const labelRect = label.getBoundingClientRect();
            return {
              text: label.textContent,
              left: labelRect.left,
              right: labelRect.right,
              top: labelRect.top,
              bottom: labelRect.bottom,
              tabLeft: tabRect.left,
              tabRight: tabRect.right,
              barLeft: barRect.left,
              barRight: barRect.right,
              scroll: label.scrollWidth,
              client: label.clientWidth,
            };
          });
        });
        expect(labels.map((label) => label.text)).toEqual([
          'Home',
          'Compare',
          'Parts',
          'Docs',
          'More',
        ]);
        for (const label of labels) {
          expect(label.left).toBeGreaterThanOrEqual(label.barLeft - 1);
          expect(label.right).toBeLessThanOrEqual(label.barRight + 1);
          expect(label.left).toBeGreaterThanOrEqual(label.tabLeft - 1);
          expect(label.right).toBeLessThanOrEqual(label.tabRight + 1);
          expect(label.scroll).toBeLessThanOrEqual(label.client + 1);
        }
        for (let i = 0; i < labels.length; i += 1) {
          for (let j = i + 1; j < labels.length; j += 1) {
            const x =
              Math.min(labels[i].right, labels[j].right) - Math.max(labels[i].left, labels[j].left);
            const y =
              Math.min(labels[i].bottom, labels[j].bottom) - Math.max(labels[i].top, labels[j].top);
            expect(x > 1 && y > 1).toBe(false);
          }
        }
      });
    }

    test(`code card uses the list glass (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const card = await page.evaluate(() => {
        const pre = document.querySelector('body[data-active="home"] pre');
        const list = document.querySelector('[data-bn="bn-list"][data-grouped="true"]');
        const style = getComputedStyle(pre);
        return {
          background: style.backgroundColor,
          list: getComputedStyle(list).backgroundColor,
          blur: style.backdropFilter,
        };
      });
      expect(card.blur).toContain('blur');
      expect(card.background).toBe(card.list);
    });

    test(`phone code card wraps the import line (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const sample = await page.evaluate(() => {
        const pre = document.querySelector('body[data-active="home"] pre');
        const code = pre.querySelector('code');
        const style = getComputedStyle(pre);
        return {
          wrap: style.whiteSpace,
          scroll: pre.scrollWidth,
          client: pre.clientWidth,
          text: code.textContent.includes("from '@basenative/runtime'"),
        };
      });
      expect(sample.wrap).toContain('pre-wrap');
      expect(sample.text).toBe(true);
      expect(sample.scroll).toBeLessThanOrEqual(sample.client + 1);
    });

    test(`grouped lists use at most two tile hues (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const hues = await page.evaluate(() =>
        [...document.querySelectorAll('[data-bn="bn-list"][data-grouped="true"]')].map((list) => [
          ...new Set(
            [...list.querySelectorAll('[data-bn="bn-symbol-tile"]')].map(
              (tile) => getComputedStyle(tile).backgroundColor,
            ),
          ),
        ]),
      );
      expect(hues.length).toBeGreaterThanOrEqual(2);
      for (const group of hues) expect(group.length).toBeLessThanOrEqual(2);
    });

    test(`backdrop keeps one or two subtle hues (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const glow = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
      const count = glow.match(/radial-gradient/g)?.length ?? 0;
      expect(count).toBe(1);
      expect(glow).not.toContain('255, 45, 85');
      expect(glow).not.toContain('255, 55, 95');
    });

    test(`secondary button meets AA (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const button = await page.evaluate(() => {
        const hero = document.querySelector('[data-bn="bn-hero"]');
        const docs = [...hero.querySelectorAll('[data-bn="bn-button"]')].find((el) =>
          el.textContent.includes('docs'),
        );
        const style = getComputedStyle(docs);
        return {
          color: style.color,
          bg: style.backgroundColor,
          surface: getComputedStyle(hero).backgroundColor,
        };
      });
      const contrast = compositeContrast(button.color, button.bg, button.surface, theme);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    test(`more menu stays closed until opened (${theme})`, async ({ page }) => {
      await open(page, 390, theme);
      const closed = await page.evaluate(() => {
        const menu = document.querySelector('[data-bn="bn-tab-more"]');
        const style = getComputedStyle(menu);
        return { open: menu.matches(':popover-open'), display: style.display };
      });
      expect(closed.open).toBe(false);
      expect(closed.display).toBe('none');
      await page.locator('[data-bn="bn-tab-bar"] [popovertarget]').click();
      const placed = await page.evaluate(() => {
        const menu = document.querySelector('[data-bn="bn-tab-more"]');
        const bar = document.querySelector('body > [data-bn="bn-tab-bar"]');
        const menuBox = menu.getBoundingClientRect();
        const barBox = bar.getBoundingClientRect();
        return {
          open: menu.matches(':popover-open'),
          menuBottom: menuBox.bottom,
          barTop: barBox.top,
        };
      });
      expect(placed.open).toBe(true);
      expect(placed.menuBottom).toBeLessThanOrEqual(placed.barTop + 2);
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-bn="bn-tab-more"]')).toBeHidden();
    });

    test(`phone tab bar is a single floating surface (${theme})`, async ({ page }) => {
      await open(page, 390, theme);
      const bar = await page.evaluate(() => {
        const tab = document.querySelector('body > [data-bn="bn-tab-bar"]');
        const main = document.querySelector('main');
        const style = getComputedStyle(tab);
        const rect = tab.getBoundingClientRect();
        main.style.scrollBehavior = 'auto';
        main.scrollTop = main.scrollHeight;
        const footer = document.querySelector('main > [data-bn-site-footer]');
        return {
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          radius: parseFloat(style.borderTopLeftRadius),
          radiusEnd: parseFloat(style.borderBottomRightRadius),
          border: style.borderTopWidth,
          pad: parseFloat(getComputedStyle(document.body).paddingBottom),
          mainBottom: main.getBoundingClientRect().bottom,
          inner: window.innerWidth,
          height: window.innerHeight,
          footerBottom: footer.getBoundingClientRect().bottom,
          barTop: tab.getBoundingClientRect().top,
          mask: getComputedStyle(main).maskImage || getComputedStyle(main).webkitMaskImage,
        };
      });
      expect(bar.left).toBeGreaterThanOrEqual(8);
      expect(bar.right).toBeLessThanOrEqual(bar.inner - 8);
      expect(bar.height - bar.bottom).toBeGreaterThanOrEqual(8);
      expect(bar.height - bar.bottom).toBeLessThan(20);
      expect(bar.radius).toBeGreaterThanOrEqual(24);
      expect(bar.radiusEnd).toBe(bar.radius);
      expect(parseFloat(bar.border)).toBe(0);
      expect(bar.pad).toBe(0);
      expect(bar.mainBottom).toBeLessThanOrEqual(bar.barTop + 2);
      expect(bar.footerBottom).toBeLessThanOrEqual(bar.barTop + 1);
      expect(bar.mask === 'none' || bar.mask === '').toBe(true);
    });

    test(`nested surfaces do not share bounds (${theme})`, async ({ page }) => {
      await open(page, 390, theme);
      const doubled = await page.evaluate(() => {
        function paints(el) {
          const style = getComputedStyle(el);
          const bg = style.backgroundColor;
          const match = bg.match(/rgba?\(([^)]+)\)/);
          const parts = match ? match[1].split(',').map((part) => parseFloat(part)) : [];
          const alpha = parts.length > 3 ? parts[3] : match ? 1 : 0;
          const bordered =
            parseFloat(style.borderTopWidth) > 0 &&
            style.borderTopStyle !== 'none' &&
            style.borderTopColor !== 'rgba(0, 0, 0, 0)';
          return alpha > 0.04 || bordered;
        }
        const hits = [];
        for (const el of document.querySelectorAll('[data-bn]')) {
          const parent = el.parentElement?.closest('[data-bn]');
          if (!parent || !paints(el) || !paints(parent)) continue;
          const a = el.getBoundingClientRect();
          const b = parent.getBoundingClientRect();
          if (a.width < 8 || a.height < 8) continue;
          const same =
            Math.abs(a.left - b.left) < 4 &&
            Math.abs(a.right - b.right) < 4 &&
            Math.abs(a.top - b.top) < 4 &&
            Math.abs(a.bottom - b.bottom) < 4;
          if (same) hits.push(`${el.getAttribute('data-bn')} in ${parent.getAttribute('data-bn')}`);
        }
        return hits.slice(0, 8);
      });
      expect(doubled).toEqual([]);
    });
  }
});

function compositeContrast(text, fill, surface, theme) {
  function parse(color) {
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) return { r: 0, g: 0, b: 0, a: 0 };
    const parts = match[1].split(',').map((part) => parseFloat(part));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  function over(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a,
    };
  }
  function lum(rgb) {
    const lin = [rgb.r, rgb.g, rgb.b].map((channel) => {
      const s = channel / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  const page = theme === 'dark' ? { r: 44, g: 44, b: 46, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  const ground = over(parse(surface), page);
  const button = over(parse(fill), ground);
  const ink = over(parse(text), button);
  const lighter = Math.max(lum(ink), lum(button));
  const darker = Math.min(lum(ink), lum(button));
  return (lighter + 0.05) / (darker + 0.05);
}
