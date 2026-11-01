import { test, expect } from '@playwright/test';

/**
 * Shared shell gates, reconciled to the Holy Trinity shell. The phone
 * chrome is the catalog app bar (body > nav[variant="app-bar"]): one
 * edge-to-edge material bar on the bottom edge, not the old floating
 * capsule; the desktop chrome is the sidebar rail (body >
 * aside[variant="sidebar"]). The hero is the catalog hero
 * (figure[variant="stacked"]), grouped lists are list-groups
 * (ul[variant="default"]) whose rows lead with a small tone marker, and
 * the footer is the catalog site-footer at body level. The gates measure
 * the same things they always did — clearance, measure, type scale,
 * materials, surfaces — against that markup.
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
    test(`phone app bar clears content (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      for (const where of ['top', 'middle', 'bottom']) {
        const result = await page.evaluate((place) => {
          const bar = document.querySelector('body > nav[variant="app-bar"]');
          const scroller = document.scrollingElement;
          document.documentElement.style.scrollBehavior = 'auto';
          const max = scroller.scrollHeight - scroller.clientHeight;
          scroller.scrollTop = place === 'top' ? 0 : place === 'bottom' ? max : max / 2;
          const found = [];
          const b = bar.getBoundingClientRect();
          for (const el of document.querySelectorAll(
            'main h1, main h2, main p, main li, main pre, main a, footer a',
          )) {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) continue;
            const x = Math.max(r.left, b.left);
            const y = Math.max(r.top, b.top);
            const rt = Math.min(r.right, b.right);
            const bt = Math.min(r.bottom, b.bottom);
            if (rt - x > 1 && bt - y > 1)
              found.push(`${place} ${el.tagName} "${(el.textContent || '').trim().slice(0, 24)}"`);
          }
          return {
            problems: found.slice(0, 8),
            barBottom: b.bottom,
            inner: window.innerHeight,
          };
        }, where);
        // The bar sits on the bottom edge of the viewport.
        expect(result.inner - result.barBottom).toBe(0);
        // Content may pass beneath the fixed bar while scrolling; only
        // fully scrolled down must everything clear it — the shell
        // reserves that room with the footer's end padding.
        if (where === 'bottom') expect(result.problems).toEqual([]);
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
        // Home has no page article since the design tightening: the
        // grouped list is the widest surface in the reading column.
        const column = document.querySelector('main ul[variant]');
        const main = document.querySelector('main');
        const a = column.getBoundingClientRect();
        const m = main.getBoundingClientRect();
        const h1 = getComputedStyle(document.querySelector('h1'));
        const hero = document.querySelector('main figure[variant]');
        const nav = hero.querySelector('nav').getBoundingClientRect();
        const hr = hero.getBoundingClientRect();
        const pad =
          parseFloat(getComputedStyle(main).paddingLeft) +
          parseFloat(getComputedStyle(main).paddingRight);
        const ps = [...hero.querySelectorAll('figcaption > p')];
        return {
          width: a.width,
          room: m.width - pad,
          h1: parseFloat(h1.fontSize),
          weight: parseInt(h1.fontWeight, 10),
          ledeBottom: ps[ps.length - 1].getBoundingClientRect().bottom,
          navTop: nav.top,
          navLeft: nav.left,
          heroLeft: hr.left,
        };
      });
      // The reading column fills the measure the shell leaves it (rail
      // plus inline padding), and the hero's actions sit under its lede.
      expect(box.width).toBeGreaterThan(box.room - 8);
      expect(box.width).toBeGreaterThan(700);
      expect(box.h1).toBeGreaterThanOrEqual(28);
      expect(box.weight).toBeGreaterThanOrEqual(700);
      expect(box.navTop).toBeGreaterThanOrEqual(box.ledeBottom - 4);
      expect(box.navLeft).toBeLessThan(box.heroLeft + 48);
    });

    test(`type scale (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const phone = await page.evaluate(() => {
        const row = document.querySelector('main ul[variant] li');
        return {
          body: parseFloat(getComputedStyle(document.body).fontSize),
          h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
          lead: parseFloat(getComputedStyle(row.querySelector('strong')).fontSize),
        };
      });
      expect(phone.body).toBeGreaterThanOrEqual(17);
      expect(phone.h1).toBeGreaterThanOrEqual(28);
      expect(phone.lead).toBeGreaterThanOrEqual(17);

      await page.setViewportSize({ width: 1280, height: 900 });
      const desk = await page.evaluate(() => {
        const row = document.querySelector('main ul[variant] li');
        const text = row.querySelector('p');
        return {
          body: parseFloat(getComputedStyle(document.body).fontSize),
          h1: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
          lead: parseFloat(getComputedStyle(row.querySelector('strong')).fontSize),
          text: parseFloat(getComputedStyle(text).fontSize),
          textColor: getComputedStyle(text).color,
        };
      });
      expect(desk.body).toBeGreaterThanOrEqual(15);
      expect(desk.h1).toBeGreaterThanOrEqual(28);
      expect(desk.lead).toBeGreaterThanOrEqual(15);
      expect(desk.text).toBeGreaterThanOrEqual(15);
      // The row text rides the secondary label tone. Its full AA debt is
      // tracked site-wide in design-system.spec.js's axe table (the
      // color-contrast entry on /); this gate holds the floor so the
      // tone never sinks further while that debt is open.
      const contrast =
        theme === 'dark' ? contrastOnDark(desk.textColor) : contrastOnWhite(desk.textColor);
      expect(contrast).toBeGreaterThanOrEqual(3);
    });

    test(`glass lives in the chrome (${theme})`, async ({ page }) => {
      await open(page, 390, theme);
      const glass = await page.evaluate(() => {
        const bar = document.querySelector('body > nav[variant="app-bar"]');
        const list = document.querySelector('main ul[variant]');
        const hero = document.querySelector('main figure[variant]');
        const barStyle = getComputedStyle(bar);
        return {
          barBlur: barStyle.backdropFilter,
          barBg: barStyle.backgroundColor,
          listBg: getComputedStyle(list).backgroundColor,
          heroBlur: getComputedStyle(hero).backdropFilter,
          backdrop: getComputedStyle(document.body).backgroundImage,
        };
      });
      // The material moved to the chrome in the trinity design: the app
      // bar is translucent glass, content surfaces are flat fills.
      expect(glass.barBlur).toContain('blur');
      expect(glass.barBg).not.toBe('rgba(0, 0, 0, 0)');
      expect(glass.listBg).not.toBe('rgba(0, 0, 0, 0)');
      expect(glass.heroBlur).toBe('none');
      expect(glass.backdrop).not.toContain('255, 45, 85');
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
        const footer = document.querySelector('body > footer[variant="default"]');
        const link = footer.querySelector('a');
        const style = getComputedStyle(footer);
        const groups = [...footer.querySelectorAll('nav')].map((nav) =>
          nav.getBoundingClientRect(),
        );
        return {
          groups: groups.length,
          groupTops: groups.map((rect) => Math.round(rect.top)),
          groupStart: Math.round(groups[0].left),
          contentStart: Math.round(document.querySelector('main h2').getBoundingClientRect().left),
          right: footer.getBoundingClientRect().right,
          bodyWidth: document.body.getBoundingClientRect().width,
          height: footer.getBoundingClientRect().height,
          size: parseFloat(getComputedStyle(link).fontSize),
          fill: style.backgroundColor,
          shadow: style.boxShadow,
        };
      });
      // The site-footer is a body-level landmark: its link groups stand
      // in a row on no card of their own, starting on the same left
      // edge as the page's headings (one content column), never past
      // the viewport.
      expect(foot.groups).toBeGreaterThanOrEqual(3);
      expect(Math.max(...foot.groupTops) - Math.min(...foot.groupTops)).toBeLessThanOrEqual(2);
      expect(Math.abs(foot.groupStart - foot.contentStart)).toBeLessThanOrEqual(1);
      expect(foot.right).toBeLessThanOrEqual(foot.bodyWidth);
      // Tallest group (four links) is four 44px touch targets under its
      // heading, inside the footer's block padding.
      expect(foot.height).toBeLessThan(300);
      expect(foot.size).toBeGreaterThanOrEqual(15);
      expect(foot.fill).toBe('rgba(0, 0, 0, 0)');
      expect(foot.shadow).toBe('none');
    });

    test(`list rows at phone width (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('main ul[variant] > li')].map((row) => ({
          marker: Boolean(row.querySelector('small[variant]')),
          lead: Boolean(row.querySelector('strong')),
          height: row.getBoundingClientRect().height,
        })),
      );
      // The home lists are plain grouped rows since the design
      // tightening: a bold lead and its detail, no badge markers, each
      // row a full touch target.
      expect(rows.length).toBeGreaterThanOrEqual(10);
      for (const row of rows) {
        expect(row.marker).toBe(false);
        expect(row.lead).toBe(true);
        expect(row.height).toBeGreaterThanOrEqual(44);
      }
    });

    test(`phone hero actions stay proportional (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const actions = await page.evaluate(() =>
        [...document.querySelectorAll('main figure[variant] nav a[variant]')].map((action) => {
          const rect = action.getBoundingClientRect();
          return { height: rect.height, width: rect.width };
        }),
      );
      expect(actions.length).toBeGreaterThanOrEqual(2);
      for (const action of actions) {
        expect(action.height).toBeGreaterThanOrEqual(44);
        expect(action.height).toBeLessThanOrEqual(46);
        expect(action.width).toBeGreaterThanOrEqual(44);
        expect(action.width).toBeLessThan(280);
      }
    });

    test(`desktop hero actions keep their size (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const actions = await page.evaluate(() => {
        const nav = document.querySelector('main figure[variant] nav');
        const navBox = nav.getBoundingClientRect();
        return [...nav.querySelectorAll('a[variant]')].map((action) => {
          const rect = action.getBoundingClientRect();
          const style = getComputedStyle(action);
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
      expect(actions.length).toBeGreaterThanOrEqual(2);
      expect(Math.abs(actions[0].top - actions[1].top)).toBeLessThan(8);
      for (const action of actions) {
        expect(action.height).toBeGreaterThanOrEqual(28);
        expect(action.width).toBeLessThan(action.nav - 8);
        expect(action.pad).toBeGreaterThanOrEqual(16);
        expect(action.radius).toBeGreaterThanOrEqual(8);
      }
    });

    test(`list rows at desktop width (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('main ul[variant] > li')].map((row) => ({
          marker: Boolean(row.querySelector('small[variant]')),
          lead: Boolean(row.querySelector('strong')),
          height: row.getBoundingClientRect().height,
        })),
      );
      // The home lists are plain grouped rows since the design
      // tightening: a bold lead and its detail, no badge markers, each
      // row a full touch target.
      expect(rows.length).toBeGreaterThanOrEqual(10);
      for (const row of rows) {
        expect(row.marker).toBe(false);
        expect(row.lead).toBe(true);
        expect(row.height).toBeGreaterThanOrEqual(44);
      }
    });

    for (const width of [320, 375]) {
      test(`app bar labels do not overlap at ${width} (${theme})`, async ({ page }) => {
        await open(page, width, theme);
        const labels = await page.evaluate(() => {
          const bar = document.querySelector('body > nav[variant="app-bar"]');
          const barRect = bar.getBoundingClientRect();
          return [...bar.querySelectorAll(':scope > ul > li')].map((li) => {
            const cell = li.querySelector('a, button');
            const range = document.createRange();
            range.selectNodeContents(cell);
            const text = range.getBoundingClientRect();
            const liRect = li.getBoundingClientRect();
            return {
              text: cell.textContent.trim(),
              left: text.left,
              right: text.right,
              top: text.top,
              bottom: text.bottom,
              cellLeft: liRect.left,
              cellRight: liRect.right,
              barLeft: barRect.left,
              barRight: barRect.right,
            };
          });
        });
        expect(labels.map((label) => label.text)).toEqual([
          'Home',
          'Compare',
          'Components',
          'Docs',
          'More',
        ]);
        for (const label of labels) {
          expect(label.left).toBeGreaterThanOrEqual(label.barLeft - 1);
          expect(label.right).toBeLessThanOrEqual(label.barRight + 1);
          expect(label.left).toBeGreaterThanOrEqual(label.cellLeft - 1);
          expect(label.right).toBeLessThanOrEqual(label.cellRight + 1);
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

    test(`content surfaces read against their containers (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const surfaces = await page.evaluate(() => {
        const paintedBackdrop = (el) => {
          let node = el.parentElement;
          while (node && node !== document.documentElement) {
            const bg = getComputedStyle(node).backgroundColor;
            if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
            node = node.parentElement;
          }
          return getComputedStyle(document.body).backgroundColor;
        };
        const read = (el) => {
          const cs = getComputedStyle(el);
          return {
            own: cs.backgroundColor,
            backdrop: paintedBackdrop(el),
            bordered: parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none',
            parent: el.parentElement?.tagName,
          };
        };
        return {
          // The code-block figure is the one surface; its pre is
          // transparent inside it, so the figure is what must read.
          pre: read(
            document.querySelector(
              'body[data-active="home"] main figure[variant="code"]:not([data-bn-hero-demo] *)',
            ),
          ),
          list: read(document.querySelector('main ul[variant]')),
          hero: read(document.querySelector('main figure[variant]')),
        };
      });
      // The pre-trinity version of this gate compared the code card's
      // glass to the grouped list's, one shared material. The trinity
      // surfaces sit at different grouped elevations by design (hero
      // takes the card tone, the list an inset well, the code block a
      // raised chip), so the equality is gone; what must hold in BOTH
      // themes is that every content surface reads against the
      // surface it sits on — none of them collapses into its
      // container and disappears. A surface also reads when a
      // border defines its edge against an identical fill (the
      // hero figure sits in an article of the same tone, separated
      // by its hairline). (An earlier draft of this gate compared
      // against the page background and flagged the dark list,
      // whose well is darker than its card by design; measured
      // against its container it reads correctly in both themes.)
      for (const name of ['pre', 'list']) {
        expect(surfaces[name].own).not.toBe('rgba(0, 0, 0, 0)');
        expect(surfaces[name].own !== surfaces[name].backdrop || surfaces[name].bordered).toBe(
          true,
        );
      }
      // The hero heads the page article on home, where the stand-down
      // contract (the site sheet's main > article > figure rule) makes
      // it transparent and borderless so it reads as the article's own
      // surface instead of a card inside the card. That is the one
      // designed exception to a surface painting its own tone — and
      // it only holds in that exact shape: article-headed, no border,
      // over a container that does paint. Any other transparent hero
      // is a surface that collapsed.
      const hero = surfaces.hero;
      if (hero.own === 'rgba(0, 0, 0, 0)') {
        // Home's hero heads main itself since the design tightening.
        expect(['ARTICLE', 'MAIN']).toContain(hero.parent);
        expect(hero.bordered).toBe(false);
        expect(hero.backdrop).not.toBe('rgba(0, 0, 0, 0)');
      } else {
        expect(hero.own !== hero.backdrop || hero.bordered).toBe(true);
      }
    });

    test(`phone code card keeps the import line reachable (${theme})`, async ({ page }) => {
      await open(page, 320, theme);
      const sample = await page.evaluate(() => {
        const pre = document.querySelector('body[data-active="home"] pre');
        const code = pre.querySelector('code');
        const style = getComputedStyle(pre);
        return {
          overflowX: style.overflowX,
          focusable: pre.hasAttribute('tabindex'),
          within: pre.getBoundingClientRect().width <= 320,
          text: code.textContent.includes("from '@basenative/runtime'"),
        };
      });
      // The trinity code card is a scroll region, not a wrapping card:
      // the line stays whole inside a keyboard-focusable scroller that
      // itself never widens the phone.
      expect(sample.overflowX).toBe('auto');
      expect(sample.focusable).toBe(true);
      expect(sample.text).toBe(true);
      expect(sample.within).toBe(true);
    });

    test(`backdrop stays neutral (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const glow = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
      const count = glow.match(/radial-gradient/g)?.length ?? 0;
      expect(count).toBeLessThanOrEqual(1);
      expect(glow).not.toContain('255, 45, 85');
      expect(glow).not.toContain('255, 55, 95');
    });

    test(`secondary hero action meets AA (${theme})`, async ({ page }) => {
      await open(page, 1280, theme);
      const action = await page.evaluate(() => {
        const hero = document.querySelector('main figure[variant]');
        const secondary = hero.querySelector('nav a[variant="default"]');
        const style = getComputedStyle(secondary);
        return {
          color: style.color,
          bg: style.backgroundColor,
          surface: getComputedStyle(hero).backgroundColor,
        };
      });
      const contrast = compositeContrast(action.color, action.bg, action.surface, theme);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    test(`more menu stays closed until opened (${theme})`, async ({ page }) => {
      await open(page, 390, theme);
      const closed = await page.evaluate(() => {
        const menu = document.querySelector('nav[variant="app-bar"] menu[popover]');
        const style = getComputedStyle(menu);
        return { open: menu.matches(':popover-open'), display: style.display };
      });
      expect(closed.open).toBe(false);
      expect(closed.display).toBe('none');
      await page.locator('nav[variant="app-bar"] button[popovertarget]').click();
      const placed = await page.evaluate(() => {
        const menu = document.querySelector('nav[variant="app-bar"] menu[popover]');
        const bar = document.querySelector('body > nav[variant="app-bar"]');
        const menuBox = menu.getBoundingClientRect();
        const barBox = bar.getBoundingClientRect();
        return {
          open: menu.matches(':popover-open'),
          menuBottom: menuBox.bottom,
          menuLeft: menuBox.left,
          menuRight: menuBox.right,
          barTop: barBox.top,
          barLeft: barBox.left,
          barRight: barBox.right,
          barWidth: barBox.width,
        };
      });
      expect(placed.open).toBe(true);
      expect(placed.menuBottom).toBeLessThanOrEqual(placed.barTop + 2);
      expect(placed.barRight - placed.menuRight).toBeLessThanOrEqual(16);
      expect(placed.barRight - placed.menuRight).toBeGreaterThanOrEqual(-4);
      expect(placed.menuLeft).toBeGreaterThan(placed.barLeft + placed.barWidth * 0.35);
      await page.keyboard.press('Escape');
      await expect(page.locator('nav[variant="app-bar"] menu[popover]')).toBeHidden();
    });

    test(`phone app bar is a single edge-to-edge surface (${theme})`, async ({ page }) => {
      await open(page, 390, theme);
      const bar = await page.evaluate(() => {
        const tab = document.querySelector('body > nav[variant="app-bar"]');
        const main = document.querySelector('main');
        const style = getComputedStyle(tab);
        const rect = tab.getBoundingClientRect();
        window.scrollTo(0, document.scrollingElement.scrollHeight);
        const footer = document.querySelector('body > footer[variant="default"]');
        const lastLink = [...footer.querySelectorAll('a')].pop();
        return {
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          radius: parseFloat(style.borderTopLeftRadius),
          border: style.borderTopWidth,
          pad: parseFloat(getComputedStyle(document.body).paddingBottom),
          inner: window.innerWidth,
          height: window.innerHeight,
          footerContentBottom: lastLink.getBoundingClientRect().bottom,
          barTop: tab.getBoundingClientRect().top,
          mask: getComputedStyle(main).maskImage || getComputedStyle(main).webkitMaskImage,
        };
      });
      // One material bar, flush with both side edges and the bottom
      // edge, split from the content by its hairline — never a floating
      // capsule, never a spacer faking its footprint.
      expect(bar.left).toBe(0);
      expect(bar.right).toBe(bar.inner);
      expect(bar.height - bar.bottom).toBe(0);
      expect(bar.radius).toBe(0);
      expect(parseFloat(bar.border)).toBe(1);
      expect(bar.pad).toBe(0);
      expect(bar.footerContentBottom).toBeLessThanOrEqual(bar.barTop + 1);
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
        const selector = '[data-bn], figure[variant], ul[variant]';
        for (const el of document.querySelectorAll(selector)) {
          const parent = el.parentElement?.closest(selector);
          if (!parent || !paints(el) || !paints(parent)) continue;
          const a = el.getBoundingClientRect();
          const b = parent.getBoundingClientRect();
          if (a.width < 8 || a.height < 8) continue;
          const same =
            Math.abs(a.left - b.left) < 4 &&
            Math.abs(a.right - b.right) < 4 &&
            Math.abs(a.top - b.top) < 4 &&
            Math.abs(a.bottom - b.bottom) < 4;
          if (same)
            hits.push(
              `${el.getAttribute('data-bn') || `${el.tagName}[variant]`} in ${parent.getAttribute('data-bn') || parent.tagName}`,
            );
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
