import { test, expect } from '@playwright/test';
import { siteRoutes } from '../../examples/express/page.js';

// The route tests freeze the clock (see the init script), but a
// frozen instant still renders through the host's timezone — the
// playground's "Rendered" stamp read 5:00 AM on a Pacific host and
// 12:00 PM on a UTC host for the same instant. Pin the zone so the
// baselines mean the same thing on every host, CI included.
test.use({ timezoneId: 'UTC' });

const WIDTHS = [320, 768, 1280];
const THEMES = ['light', 'dark'];
const AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js';

const routes = siteRoutes.filter((route) => !route.internal).map((route) => route.path);

function slug(path) {
  return path === '/' ? 'home' : path.replace(/^\//, '').replaceAll('/', '-');
}

/**
 * Rule ids axe-core 4.10.3 reports on settled pages, re-measured
 * 2026-10-26 (both themes at 320/768/1280, axe run after the page's
 * own hydration settled, the same point in the page's life this
 * spec's axe step measures). The gate fails when a route reports an
 * id that is not listed. Every route's remaining debt is the one
 * tracked item: color-contrast (the secondary-label ladder on the
 * grouped surfaces). The 2026-10-22 map's other ids no longer occur
 * on the trinity site — every route renders an h1 (page-has-heading-
 * one is gone), the builder's aria and landmark findings were fixed
 * by the trinity chrome, and the playground's complementary-landmark
 * finding went with the platform shell — so they are pruned here;
 * if any of them recurs, this gate fails and it gets investigated,
 * not re-listed on sight.
 */
const AXE_DEBT = {
  '/': ['color-contrast'],
  '/compare': ['color-contrast'],
  '/components': ['color-contrast'],
  '/docs': ['color-contrast'],
  '/ai': ['color-contrast'],
  '/playground': ['color-contrast'],
  '/builder': ['color-contrast'],
};

function knownAxe(path) {
  return AXE_DEBT[path] ?? [];
}

async function overflow(page) {
  return page.evaluate(() => {
    const problems = [];
    // An element a clipping or scrolling ancestor contains cannot
    // paint past the viewport, however wide its own box runs — the
    // catalog specimens sit inside overflow-hidden demo figures
    // and a horizontally scrolling pipeline strip, and their boxes
    // legitimately extend past the frame that clips them. The
    // ancestor is checked as an element in its own right.
    function containedByClip(el) {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const overflow = getComputedStyle(node).overflowX;
        if (
          overflow === 'hidden' ||
          overflow === 'clip' ||
          overflow === 'auto' ||
          overflow === 'scroll'
        )
          return true;
        node = node.parentElement;
      }
      return false;
    }
    // The trinity component-root signature: variant-bearing elements and
    // the surviving data-bn app hooks (the pre-trinity scan matched
    // [data-bn^="bn-"] roots, which the catalog no longer emits).
    for (const el of document.body.querySelectorAll(
      '[data-bn^="bn-"], [variant], [data-bn-component-search]',
    )) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.display === 'contents') continue;
      if (containedByClip(el)) continue;
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
        // A spill is a defect when content is cut off or the page
        // itself must scroll sideways. A documented breakout that
        // stays inside the viewport (the builder window centres on
        // the viewport from inside a narrower column) widens its
        // host's scrollWidth without clipping anything or moving the
        // page — the boxes past the viewport are flagged above, in
        // their own right, when a breakout ever misses.
        let pastViewport = false;
        if (style.overflowX !== 'clip') {
          const box = rect;
          for (const node of el.querySelectorAll('*')) {
            const nodeBox = node.getBoundingClientRect();
            if (nodeBox.width < 1) continue;
            const spills = nodeBox.right > box.right + 1 || nodeBox.left < box.left - 1;
            if (spills && (nodeBox.right > window.innerWidth + 1 || nodeBox.left < -1)) {
              pastViewport = true;
              break;
            }
          }
        }
        if (style.overflowX === 'clip' || pastViewport) {
          const text = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 48);
          problems.push(
            `${el.getAttribute('data-bn')} "${text}" ${el.scrollWidth}>${el.clientWidth}`,
          );
        }
      }
    }
    return problems.slice(0, 8);
  });
}

async function singleLine(page) {
  return page.evaluate(() => {
    const problems = [];
    const selector = [
      'a[variant]',
      'button[variant]',
      'small[variant]',
      'aside[variant="sidebar"] a',
    ].join(',');
    for (const el of document.querySelectorAll(selector)) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      // The app bar's items are icon-over-label controls — two lines
      // by design; the bar's own gates live in shell-home.spec.js.
      if (el.closest('nav[variant="app-bar"]')) continue;
      // Catalog specimens render components inside constrained demo
      // frames (an <output> in a phone-width card): a specimen
      // control squeezed by its frame is the frame's layout, judged
      // by the screenshot. The components are gated at natural size
      // on their own /components pages.
      if (el.closest('[data-bn-showcase-stage], [data-bn-component-preview]')) continue;
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

async function visiblePopovers(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[popover]')]
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 1 && rect.height > 1;
      })
      .map((el) => el.getAttribute('data-bn') || el.tagName)
      .slice(0, 8),
  );
}

async function themeSurfaces(page, theme) {
  return page.evaluate((pageTheme) => {
    function channel(value) {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }
    function luminance(color) {
      const match = color.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => parseFloat(part));
      const alpha = parts.length > 3 ? parts[3] : 1;
      if (alpha < 0.45) return null;
      const paper = pageTheme === 'dark' ? [12, 11, 9] : [242, 242, 247];
      const rgb = [0, 1, 2].map((index) => parts[index] * alpha + paper[index] * (1 - alpha));
      return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
    }
    const selector = [
      '[data-bn-component-search]',
      '[data-bn-component-card]',
      '[data-bn="bn-search"]',
      'input[type="search"]',
      'ul[variant="default"]',
      'article',
    ].join(',');
    const problems = [];
    for (const el of document.querySelectorAll(selector)) {
      const scope = el.closest('[data-theme]');
      if (scope && scope.getAttribute('data-theme') !== pageTheme) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const tone = luminance(style.backgroundColor);
      if (tone == null) continue;
      const name =
        el.getAttribute('data-bn') ||
        (el.getAttribute('data-bn-component-search') != null && 'component-search') ||
        el.tagName;
      if (pageTheme === 'light' && tone < 0.35)
        problems.push(`dark surface in light mode: ${name} ${tone.toFixed(2)}`);
      if (pageTheme === 'dark' && tone > 0.82)
        problems.push(`light surface in dark mode: ${name} ${tone.toFixed(2)}`);
    }
    return problems.slice(0, 8);
  }, theme);
}

// Card-stack routes are the editorial pages, whose surfaces are
// prose chapters and cards. The playground is a workbench: its
// editor panels hold code wells and its stage holds rendered output
// — surfaces inside surfaces by design — so the stack gate does not
// run there; its screenshot and stage gates carry it.
const CARD_ROUTES = new Set(['/compare', '/components']);
// Routes whose catalog tables must key every restacked cell (below);
// the /components/table specimen carries the same contract in the
// adaptive spec, which runs at exactly 390px.
const TABLE_KEY_ROUTES = new Set(['/compare', '/ai']);

// When a catalog table restacks at phone width, every data cell
// carries its column heading as a visible key line — a restacked
// value with no key is a number without a framework. Returns problem
// strings; [] is the pass.
async function tableKeys(page) {
  return page.evaluate(() => {
    const problems = [];
    document
      .querySelectorAll('table[variant="default"], table[variant="striped"]')
      .forEach((table, ti) => {
        const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
        if (heads.length === 0) return;
        table.querySelectorAll('tbody tr').forEach((row, ri) => {
          [...row.children].forEach((cell, ci) => {
            if (cell.tagName !== 'TD') return;
            const key = cell.querySelector(':scope > b');
            if (!key) {
              problems.push(`table ${ti} row ${ri} cell ${ci}: no key`);
              return;
            }
            if (key.textContent.trim() !== heads[ci])
              problems.push(
                `table ${ti} row ${ri} cell ${ci}: key "${key.textContent.trim()}" != column "${heads[ci]}"`,
              );
            if (getComputedStyle(key).display === 'none')
              problems.push(`table ${ti} row ${ri} cell ${ci}: key hidden while restacked`);
          });
        });
      });
    return problems;
  });
}

async function cardStack(page) {
  return page.evaluate(() => {
    // The flow rhythm the shell composes with: stacked surfaces sit one
    // 12px step apart (the foundation's space-3). The pre-trinity sheet
    // exposed it as --bn-section-space; that token is retired, so the
    // gate holds the value it always measured.
    const token = 12;
    function paints(el) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const bg = style.backgroundColor;
      const match = bg.match(/rgba?\(([^)]+)\)/);
      const parts = match ? match[1].split(',').map((part) => parseFloat(part)) : [];
      const alpha = parts.length > 3 ? parts[3] : match ? 1 : 0;
      const bordered = parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none';
      const radius = parseFloat(style.borderTopLeftRadius) || 0;
      return (alpha > 0.45 || bordered) && radius >= 8 && parseFloat(style.paddingTop) >= 8;
    }
    const problems = [];
    const hero = document.querySelector('main figure[variant]');
    if (hero && paints(hero)) {
      const heroBox = hero.getBoundingClientRect();
      const next = [
        ...document.querySelectorAll(
          'main article, main section, main ul[variant], main [data-bn-component-card], main [data-bn-component-search]',
        ),
      ]
        .filter((el) => paints(el) && el.getBoundingClientRect().top >= heroBox.bottom - 1)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (next) {
        const gap = next.getBoundingClientRect().top - heroBox.bottom;
        if (gap < token - 1) problems.push(`hero gap ${gap.toFixed(1)}px is under ${token}px`);
      }
    }
    const selector = 'article, section, figure[variant], ul[variant], [data-bn-component-card]';
    for (const el of document.querySelectorAll(selector)) {
      if (!paints(el)) continue;
      // The catalog's component cards are tiles in a grid laid over a
      // chapter surface — the components page's deliberate pattern,
      // not a stacked surface.
      if (el.hasAttribute('data-bn-component-card')) continue;
      // Specimen and live-demo stages frame their contents as their
      // own surfaces by design (the singleLine gate scopes them out
      // the same way); their internal composition is judged by the
      // screenshot and their own pages' gates, not this one.
      if (el.closest('[data-bn-component-preview], [data-demo-display]')) continue;
      const parent = el.parentElement?.closest(selector);
      if (!parent || parent === el || !paints(parent)) continue;
      // A nested block painted identically to its parent — same
      // background, no border, no shadow — reads as the SAME surface
      // (columns of one card), not a card stacked on a card. The
      // defect is a distinguishable second surface inside the first.
      const elStyle = getComputedStyle(el);
      const parentStyle = getComputedStyle(parent);
      const bordered = parseFloat(elStyle.borderTopWidth) > 0 && elStyle.borderTopStyle !== 'none';
      const shadowed = elStyle.boxShadow !== 'none' && parentStyle.boxShadow === 'none';
      if (elStyle.backgroundColor === parentStyle.backgroundColor && !bordered && !shadowed)
        continue;
      const box = el.getBoundingClientRect();
      const outer = parent.getBoundingClientRect();
      if (box.height < 8 || box.width < 8) continue;
      if (
        box.top >= outer.top - 1 &&
        box.bottom <= outer.bottom + 1 &&
        box.left >= outer.left - 1 &&
        box.right <= outer.right + 1
      ) {
        problems.push(
          `${el.getAttribute('data-bn') || (el.getAttribute('data-bn-component-card') != null && 'component-card') || el.tagName} inside ${parent.getAttribute('data-bn') || parent.tagName}`,
        );
      }
    }
    return problems.slice(0, 8);
  });
}

// Button contrast, held at the AA text floor (4.5). The sweep covers
// the neutral paints and the unvarianted controls: the default
// variant (fill + label — the pair the shell gates also hold to AA)
// and plain buttons like the app bar's overflow control. The tint
// paints (primary, ghost, destructive) are the palette's system
// colors with white on-tint text; their contrast is the project's
// tracked color-contrast debt — axe reports it on every route and
// AXE_DEBT above carries it, measured and listed. The pre-trinity
// sweep measured the platform button roots and plain buttons; the
// trinity rewrite widened it to every variant, which put the
// palette's fills on trial in a page sweep instead of in the token
// layer where that decision lives.
async function buttonContrast(page) {
  return page.evaluate(() => {
    function channel(value) {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }
    function parse(color) {
      const match = String(color).match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => parseFloat(part));
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 ? parts[3] : 1,
      };
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
      return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
    }
    function ratio(ink, ground) {
      const lighter = Math.max(lum(ink), lum(ground));
      const darker = Math.min(lum(ink), lum(ground));
      return (lighter + 0.05) / (darker + 0.05);
    }
    function backing(el) {
      let node = el;
      let ground = { r: 242, g: 242, b: 247, a: 1 };
      const chain = [];
      while (node && node !== document.documentElement) {
        chain.push(node);
        node = node.parentElement;
      }
      for (const item of chain.reverse()) {
        const color = parse(getComputedStyle(item).backgroundColor);
        if (color && color.a > 0) ground = over(color, ground);
      }
      return ground;
    }
    // A control wearing a system tint paint for its label — the
    // accent on a current-state control, the danger strong on a
    // destructive glyph — is the tracked color-contrast debt named
    // above, not a neutral-paint failure; resolve the tint tokens
    // and leave those controls to the axe ledger.
    function tokenColor(token) {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    }
    const tintPaints = new Set([tokenColor('--color-tint'), tokenColor('--color-danger-strong')]);
    const problems = [];
    const seen = new Set();
    const buttons = document.querySelectorAll(
      'a[variant="default"], button[variant="default"], button:not([variant])',
    );
    for (const el of buttons) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.disabled) continue;
      if (tintPaints.has(style.color)) continue;
      if (el.getAttribute('data-force') === 'disabled' || Number(style.opacity) < 0.99) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const variant = el.getAttribute('variant') || 'plain';
      const theme = el.closest('[data-theme]')?.getAttribute('data-theme') || 'page';
      const key = `${theme}:${variant}:${style.color}:${style.backgroundColor}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fill = parse(style.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
      const ground = over(fill, backing(el.parentElement || el));
      const ink = parse(style.color);
      if (!ink) continue;
      const score = ratio(over(ink, ground), ground);
      const img = el.querySelector('img');
      if (img) {
        const filter = getComputedStyle(img).filter || '';
        const lightGround = lum(ground) > 0.4;
        const inverted = /invert\((?!0\))/.test(filter);
        if (lightGround && inverted) problems.push(`${variant} icon is light on a light fill`);
        if (!lightGround && filter.includes('brightness') && !inverted)
          problems.push(`${variant} icon is dark on a dark fill`);
      }
      if (score < 4.5) problems.push(`${variant} contrast ${score.toFixed(2)} ${theme}`);
    }
    return problems.slice(0, 8);
  });
}

// The pre-trinity /design-system page was the platform catalog: a
// literal "Platform catalog" h1, [data-bn="bn-material"] sample tiles on
// patterned stages, and forced-theme catalog stages with atom-state
// specimens. Those specimen gates (catalogTitle's literal string,
// materialSamples, atomStatesCard) guarded markup the trinity redesign
// replaced with token and material tables; their subjects no longer
// exist on the page, so the gates were retired in the trinity E2E
// reconciliation. What survives of their intent — the page keeps one
// clear identity — is asserted here.
async function pageIdentity(page) {
  return page.evaluate(() => {
    const titles = [...document.querySelectorAll('h1')]
      .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return titles.length === 1 ? [] : [`page has ${titles.length} h1 elements`];
  });
}

async function sharedSectionSurface(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('main figure[variant]');
    const card = document.querySelector('main > section');
    if (!hero || !card) return ['missing shared section'];
    const a = getComputedStyle(hero);
    const b = getComputedStyle(card);
    const problems = [];
    if (a.backgroundColor !== b.backgroundColor)
      problems.push(`surface ${b.backgroundColor} != hero ${a.backgroundColor}`);
    if (a.backgroundImage !== b.backgroundImage)
      problems.push(`surface image ${b.backgroundImage} != hero ${a.backgroundImage}`);
    if (a.boxShadow !== b.boxShadow) problems.push('section elevation != hero');
    if (b.backgroundImage !== 'none') problems.push('section paints a gradient');
    return problems;
  });
}

async function neutralIntro(page) {
  return page.evaluate(() => {
    const problems = [];
    const hero = document.querySelector('main figure[variant]');
    const heroImage = hero ? getComputedStyle(hero).backgroundImage : 'none';
    const bodyImage = getComputedStyle(document.body).backgroundImage;
    if (heroImage !== 'none') problems.push('intro card paints a glow');
    // The pre-trinity version also watched a "wallpaper" article on the
    // catalog page; that surface is gone, and the body check below is
    // the same guard everywhere else.
    if (
      document.documentElement.getAttribute('data-theme') === 'dark' &&
      document.body.getAttribute('data-active') !== 'home' &&
      bodyImage !== 'none'
    )
      problems.push('dark page background paints a glow');
    return problems;
  });
}

async function canvasStage(page) {
  return page.evaluate(() => {
    function channel(color) {
      const match = String(color).match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => parseFloat(part));
      const max = Math.max(parts[0], parts[1], parts[2]);
      const min = Math.min(parts[0], parts[1], parts[2]);
      return max === 0 ? 0 : (max - min) / max;
    }
    const canvas = document.querySelector('.bn-builder__pane--canvas');
    if (!canvas) return ['missing builder canvas'];
    const style = getComputedStyle(canvas);
    const problems = [];
    // The pre-trinity stage was a patterned graph paper; the redesigned
    // builder stage is flat. What this gate still guards: the canvas is
    // a neutral stage — never a brand wash, never saturated.
    if (/linear-gradient\([^)]*rgb\(232,\s*146,\s*10\)/.test(style.backgroundImage))
      problems.push('canvas is a brand wash');
    const sat = channel(style.backgroundColor);
    if (sat == null || sat > 0.2) problems.push('canvas stage is saturated');
    return problems;
  });
}

async function heroPattern(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('main figure[variant]');
    // The playground is a tool surface: since the pilot integration
    // it leads with the editor itself, not a hero figure (its h1
    // still stands, and pageIdentity gates it). Every content route
    // keeps the hero; a missing one anywhere else fails here.
    if (!hero) {
      return document.body.getAttribute('data-active') === 'playground' ? [] : ['missing hero'];
    }
    const h1 = hero.querySelector('h1');
    const problems = [];
    if (!h1) problems.push('hero has no title');
    const ems = h1 ? h1.querySelectorAll('em') : [];
    // Plain titles since the design tightening: the title is the one
    // heavy line on the page and carries no italic accent.
    if (ems.length !== 0) problems.push(`hero accent count ${ems.length}`);
    // The catalog hero's figcaption: eyebrow paragraph, title, lede
    // paragraph. One type scale at every width — the pre-trinity gate
    // switched expectations on a data-bn-platform attribute the shell
    // no longer sets, because there is no platform switch left.
    const cap = hero.querySelector('figcaption');
    const eyebrow = cap ? cap.querySelector('p') : null;
    const lede =
      h1 && h1.nextElementSibling && h1.nextElementSibling.tagName === 'P'
        ? h1.nextElementSibling
        : null;
    if (!eyebrow) problems.push('missing eyebrow');
    if (!lede) problems.push('missing lede');
    if (h1) {
      const size = parseFloat(getComputedStyle(h1).fontSize);
      // The hero title takes the large-title rung (2.125rem = 34px)
      // since the type-hierarchy pass. The home hero is the display
      // headline instead: fluid, never under 36px, 56 to 64px from a
      // desktop up.
      if (hero.querySelector('[data-bn-hero-demo]')) {
        const floor = innerWidth >= 1024 ? 56 : 36;
        if (size < floor - 0.6 || size > 64.6)
          problems.push(`title ${size} expected ${floor} to 64`);
      } else if (Math.abs(size - 34) > 0.6) problems.push(`title ${size} expected 34`);
      const weight = parseInt(getComputedStyle(h1).fontWeight, 10);
      if (weight !== 700) problems.push(`title weight ${weight} expected 700`);
    }
    if (eyebrow) {
      const size = parseFloat(getComputedStyle(eyebrow).fontSize);
      if (Math.abs(size - 12) > 0.6) problems.push(`eyebrow ${size}`);
    }
    if (lede) {
      const size = parseFloat(getComputedStyle(lede).fontSize);
      if (Math.abs(size - 17) > 0.6) problems.push(`lede ${size} expected 17`);
    }
    if (ems[0]) {
      const style = getComputedStyle(ems[0]).fontStyle;
      if (style !== 'italic') problems.push(`accent is ${style}`);
    }
    const buttons = [...hero.querySelectorAll('a[variant], button[variant]')];
    if (buttons.length > 1) {
      const heights = buttons.map((button) => Math.round(button.getBoundingClientRect().height));
      const radii = buttons.map((button) => getComputedStyle(button).borderTopLeftRadius);
      if (Math.max(...heights) - Math.min(...heights) > 1) problems.push('button heights differ');
      if (new Set(radii).size > 1) problems.push('button radii differ');
      if (window.innerWidth <= 767) {
        for (const height of heights) {
          if (height < 44) problems.push(`hit target ${height}`);
        }
      }
    }
    return problems;
  });
}

async function metricTiles(page) {
  return page.evaluate(() => {
    const problems = [];
    for (const grid of document.querySelectorAll('[data-bn="bn-card-grid"]')) {
      const tiles = [...grid.querySelectorAll('[data-bn="bn-metric"]')];
      const rows = new Map();
      for (const tile of tiles) {
        const box = tile.getBoundingClientRect();
        if (box.height < 8) continue;
        const top = Math.round(box.top);
        const key = [...rows.keys()].find((value) => Math.abs(value - top) < 4) ?? top;
        rows.set(key, [...(rows.get(key) || []), Math.round(box.height)]);
        const label = tile.querySelector('[data-bn="bn-metric-label"]');
        const value = tile.querySelector('[data-bn="bn-metric-value"]');
        if (!label || !value) continue;
        const labelStyle = getComputedStyle(label);
        const valueStyle = getComputedStyle(value);
        if (labelStyle.whiteSpace === 'nowrap' || labelStyle.textOverflow === 'ellipsis')
          problems.push('label truncates');
        if (parseFloat(valueStyle.fontSize) <= parseFloat(labelStyle.fontSize))
          problems.push('value is not larger than the label');
        if (label.scrollHeight > label.clientHeight + 2)
          problems.push(`label clipped ${(label.textContent || '').slice(0, 32)}`);
      }
      for (const heights of rows.values()) {
        if (heights.length > 1 && Math.max(...heights) - Math.min(...heights) > 1)
          problems.push(`tile heights ${heights.join(',')}`);
      }
    }
    return problems.slice(0, 6);
  });
}

async function sectionRhythm(page) {
  return page.evaluate(() => {
    // Same 12px flow rhythm cardStack holds: a section may end with at
    // most the rhythm step of margin — spacing lives in the margin
    // after an item, never stacked on top of the next section's own.
    // (The pre-trinity version also capped showcase-section padding;
    // those sections were page furniture of the removed kit pages, and
    // trinity sections are cards whose padding is their own.)
    const token = 12;
    const problems = [];
    const nodes = document.querySelectorAll(
      "main > section, aside[variant='subnav'], [data-bn-component-category]",
    );
    for (const el of nodes) {
      const style = getComputedStyle(el);
      if (style.display === 'none') continue;
      const bottom = parseFloat(style.marginBottom) || 0;
      if (bottom > token + 1) {
        const name = el.getAttribute('data-bn') || el.id || el.tagName;
        problems.push(`margin ${bottom} on ${name}`);
      }
    }
    return problems.slice(0, 6);
  });
}

async function contentMeasure(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const hero = document.querySelector('main figure[variant]');
    const side = document.querySelector('body > aside[variant="sidebar"]');
    // The playground leads with its editor, not a hero (see
    // heroPattern); the measure is hero geometry, so there is
    // nothing to measure there.
    if (!hero && document.body.getAttribute('data-active') === 'playground') return [];
    if (!main || !hero) return ['missing measure'];
    const mainBox = main.getBoundingClientRect();
    const heroBox = hero.getBoundingClientRect();
    const frame = hero.parentElement === main ? hero : hero.parentElement;
    const frameBox = frame.getBoundingClientRect();
    const problems = [];
    // The column-filling subject is the hero itself when it stands
    // directly in main, and its frame when the page heads itself with
    // an article: there the article fills the column and the hero
    // stands down inside it (transparent, borderless, unpadded, on
    // the frame's text line) — the shape the shell gates accept. A
    // framed hero that paints its own surface, or drifts off the
    // frame's text line, is the stacked-inset defect.
    const subjectBox = frame === hero ? heroBox : frameBox;
    const leftGap = subjectBox.left - mainBox.left;
    const rightGap = mainBox.right - subjectBox.right;
    if (Math.abs(leftGap - rightGap) > 2)
      problems.push(`measure off-center ${leftGap.toFixed(0)}/${rightGap.toFixed(0)}`);
    if (rightGap > 64) problems.push(`right gutter ${rightGap.toFixed(0)}`);
    if (frame === hero) {
      if (
        Math.abs(frameBox.left - heroBox.left) > 2 ||
        Math.abs(frameBox.right - heroBox.right) > 2
      )
        problems.push('header does not fill the content column');
    } else {
      const heroStyle = getComputedStyle(hero);
      const frameStyle = getComputedStyle(frame);
      const bg = heroStyle.backgroundColor.match(/rgba?\(([^)]+)\)/);
      const bgParts = bg ? bg[1].split(',').map((part) => parseFloat(part)) : [];
      const bgAlpha = bgParts.length > 3 ? bgParts[3] : bg ? 1 : 0;
      const bordered =
        parseFloat(heroStyle.borderLeftWidth) > 0 && heroStyle.borderLeftStyle !== 'none';
      if (
        bgAlpha > 0 ||
        bordered ||
        parseFloat(heroStyle.paddingLeft) > 0 ||
        parseFloat(heroStyle.paddingRight) > 0
      )
        problems.push('framed hero paints its own surface');
      const insetLeft = heroBox.left - frameBox.left;
      const insetRight = frameBox.right - heroBox.right;
      if (
        Math.abs(insetLeft - parseFloat(frameStyle.paddingLeft)) > 2 ||
        Math.abs(insetRight - parseFloat(frameStyle.paddingRight)) > 2
      )
        problems.push('framed hero is off the frame text line');
    }
    if (side) {
      const sideBox = side.getBoundingClientRect();
      if (sideBox.left > 1) problems.push('sidebar is off the grid');
      if (Math.abs(sideBox.top - mainBox.top) > 2) problems.push('sidebar and content tops differ');
    }
    return problems;
  });
}

async function tasksCountInsideCard(page) {
  return page.evaluate(() => {
    const output = document.querySelector('[data-tasks] output');
    const card = output?.closest('section');
    if (!output || !card) return ['tasks count has no card'];
    const text = output.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    if (text.top < box.top - 1 || text.bottom > box.bottom + 1)
      return ['tasks count is outside the card'];
    if (text.left < box.left - 1 || text.right > box.right + 1)
      return ['tasks count is outside the card'];
    return [];
  });
}

async function contentSplit(page) {
  return page.evaluate(() => {
    const side = document.querySelector('body > aside[variant="sidebar"]');
    const main = document.querySelector('main');
    const sideWidth = side ? side.getBoundingClientRect().width : 0;
    const available = window.innerWidth - sideWidth;
    const content = main.getBoundingClientRect().width;
    return { ratio: available > 0 ? content / available : 1 };
  });
}

async function loadAxe(page) {
  let last;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.request.get(AXE_URL, { timeout: 15_000 });
      if (!response.ok()) throw new Error(`axe ${response.status()}`);
      await page.addScriptTag({ content: await response.text() });
      const ready = await page.evaluate(() => typeof window.axe?.run === 'function');
      if (ready) return;
      last = new Error('axe did not load');
    } catch (error) {
      last = error;
    }
  }
  throw last;
}

async function partsChrome(page) {
  return page.evaluate(() => {
    const search = document.querySelector('[data-bn-component-search]');
    const filters = document.querySelector('aside[variant="subnav"]');
    const bar = document.querySelector('body > nav[variant="app-bar"]');
    if (!search || !filters || !bar) return ['missing parts chrome'];
    if (document.querySelector('aside[variant="chips"]'))
      return ['a second subnav variant is present'];
    const problems = [];
    // The filter is the same subnav as /docs: a row of items, not a chip strip.
    const filtersStyle = getComputedStyle(filters.querySelector('ul') || filters);
    if (filtersStyle.flexDirection !== 'row')
      problems.push(`subnav is ${filtersStyle.flexDirection}`);
    const sample = filters.querySelector('button');
    if (sample && getComputedStyle(sample).textTransform === 'uppercase')
      problems.push('subnav is uppercase');
    if (sample && sample.getBoundingClientRect().height < 24)
      problems.push('subnav item is under 24px');
    // The in-page nav contract (Warren, 2026-10-28): the docs
    // contents nav and this filter are one pattern, and at phone
    // width the pattern is NOT pinned — a sticky card with large
    // buttons holds a third of the screen for the whole scroll. It
    // stands down (static) and scrolls away with the page; the wide
    // layout keeps the pin.
    const stuck = getComputedStyle(search).position;
    if (stuck !== 'static') problems.push(`search is ${stuck}`);
    const scroller = document.scrollingElement;
    scroller.scrollTop = 1500;
    if (search.getBoundingClientRect().top >= 0)
      problems.push('search still in view after scrolling');
    scroller.scrollTop = 0;
    return problems;
  });
}

async function tocChrome(page) {
  return page.evaluate(() => {
    const toc = document.querySelector('aside[variant="subnav"]');
    if (!toc) return ['missing docs toc'];
    const problems = [];
    // The other half of the in-page nav contract above: the docs
    // contents nav follows the same phone rule as the components
    // filter — static, scrolling away with the page.
    const stuck = getComputedStyle(toc).position;
    if (stuck !== 'static') problems.push(`toc is ${stuck}`);
    const scroller = document.scrollingElement;
    scroller.scrollTop = 1500;
    if (toc.getBoundingClientRect().top >= 0) problems.push('toc still in view after scrolling');
    scroller.scrollTop = 0;
    return problems;
  });
}

async function sidebarAccent(page) {
  return page.evaluate(() => {
    function channels(color) {
      const raw = String(color).trim();
      const hex = raw.match(/^#([0-9a-f]{6})$/i);
      if (hex) {
        const value = Number.parseInt(hex[1], 16);
        return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
      }
      const match = raw.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      return match[1]
        .split(',')
        .slice(0, 3)
        .map((part) => Math.round(Number.parseFloat(part)));
    }
    function same(paint, token) {
      const left = channels(paint);
      const right = channels(token);
      return Boolean(left && right && left.every((channel, index) => channel === right[index]));
    }
    function resolve(el, property, token) {
      // Resolve a token through the cascade the way the component does:
      // paint a probe with it inside the same scope and read the result.
      const probe = document.createElement('span');
      probe.style.setProperty(property, `var(${token})`);
      el.appendChild(probe);
      const value = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return value;
    }
    const current = document.querySelector('aside[variant="sidebar"] [aria-current="page"]');
    if (!current) return ['missing selected sidebar item'];
    const style = getComputedStyle(current);
    // The sidebar's current item is filled with its link-current
    // token and labelled with its link-current text token (the
    // pre-CTI+ gate resolved the short-lived --tint/--on-tint bridge
    // names, which the sidebar no longer reads).
    const fill = resolve(current, 'background-color', '--color-bkg-sidebar-link-current');
    const ink = resolve(current, 'color', '--color-text-sidebar-link-current');
    const problems = [];
    if (!same(style.backgroundColor, fill))
      problems.push(
        `selected sidebar fill is ${style.backgroundColor}, link-current token is ${fill}`,
      );
    if (!same(style.color, ink))
      problems.push(`selected sidebar label is ${style.color}, link-current text token is ${ink}`);
    return problems;
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
            // GitHub's runner (playwright install --with-deps) resolves system-ui
            // to a different face than this snapshot host. Run 39810776722 failed
            // every toHaveScreenshot on that difference. Liberation Sans is on both.
            // documentElement does not exist yet when this script starts.
            function pinFont() {
              if (!document.documentElement || document.querySelector('[data-bn-snapshot-font]'))
                return;
              const style = document.createElement('style');
              style.setAttribute('data-bn-snapshot-font', '');
              style.textContent =
                'html, body, body * { font-family: "Liberation Sans", sans-serif !important; }' +
                'body[data-active="components"] span[aria-hidden="true"] { display: none !important; }';
              document.documentElement.appendChild(style);
            }
            if (document.readyState === 'loading')
              document.addEventListener('DOMContentLoaded', pinFont);
            else pinFont();
          });
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator('main')).toBeVisible();
          // page.js stamps a content hash onto every '/basenative.js'
          // in the final HTML — including the import line inside code
          // samples — so any asset change anywhere rewrites visible
          // sample text and every baseline with it rots. The hash is
          // a cache-buster, not content: normalize sample text (and
          // editor values) back to the unversioned URL, which imports
          // the same bytes. Attributes are untouched; the page's own
          // scripts keep their versioned URLs.
          await page.evaluate(() => {
            const unstamp = (text) =>
              text.replace(/\/basenative\.js\?v=[0-9a-f]+/g, '/basenative.js');
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              if (n.nodeValue.includes('/basenative.js?v=')) {
                n.nodeValue = unstamp(n.nodeValue);
              }
            }
            for (const area of document.querySelectorAll('textarea')) {
              if (area.value.includes('/basenative.js?v=')) {
                area.value = unstamp(area.value);
              }
            }
          });
          // Exactly one h1 per page — this stood behind the retired
          // /design-system branch; the invariant is every route's.
          expect(await pageIdentity(page)).toEqual([]);
          expect(await neutralIntro(page)).toEqual([]);
          if (path === '/ai') expect(await sharedSectionSurface(page)).toEqual([]);
          if (path === '/builder') expect(await canvasStage(page)).toEqual([]);
          if (path === '/components') expect(await tasksCountInsideCard(page)).toEqual([]);
          if (path === '/components' && width < 768) expect(await partsChrome(page)).toEqual([]);
          if (path === '/docs' && width < 768) expect(await tocChrome(page)).toEqual([]);
          if (width < 768 && TABLE_KEY_ROUTES.has(path)) expect(await tableKeys(page)).toEqual([]);
          expect(await heroPattern(page)).toEqual([]);
          expect(await sidebarAccent(page)).toEqual([]);
          expect(await metricTiles(page)).toEqual([]);
          expect(await sectionRhythm(page)).toEqual([]);
          await expect(page).toHaveScreenshot(`${slug(path)}-${theme}-${width}.png`, {
            fullPage: true,
            animations: 'disabled',
            timeout: 20_000,
            // Runs 39826460832 and 39831253277 differed by exactly 62 pixels on
            // /components at 768 and 1280 after the Liberation Sans pin and the
            // hidden card arrow. Run 39836500019 differed by 84–186 pixels on
            // /compare at 768 and 1280, one check mark. Both are host
            // anti-aliasing. 320 still matches exactly. Run 40723362543
            // (PR #335) differed by 109 pixels on /components dark at 768
            // and 1280 — same noise, larger glyph — so the /components
            // budget grows to 128. Run 41253278441 (PR #347) differed by
            // 38–51 pixels on /playground at 768 and 1280 in both themes,
            // editor glyph anti-aliasing; 320 matches exactly. Run 41279147211
            // (PR #357) differed by 95 pixels on /playground light 1280 while
            // the Playwright image matched locally, same noise, so 128.
            maxDiffPixels:
              path === '/components'
                ? 128
                : path === '/compare' && width >= 768
                  ? 250
                  : path === '/playground' && width >= 768
                    ? 128
                    : 0,
          });
          expect(await overflow(page)).toEqual([]);
          expect(await singleLine(page)).toEqual([]);
          expect(await visiblePopovers(page)).toEqual([]);
          expect(await themeSurfaces(page, theme)).toEqual([]);
          expect(await buttonContrast(page)).toEqual([]);
          if (CARD_ROUTES.has(path)) expect(await cardStack(page)).toEqual([]);
          if (width >= 1280) {
            const split = await contentSplit(page);
            expect(split.ratio).toBeGreaterThanOrEqual(0.7);
            expect(await contentMeasure(page)).toEqual([]);
          }
          await loadAxe(page);
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

test.describe('contents scrollspy', () => {
  test.describe.configure({ timeout: 60_000 });

  async function scrollSectionIntoBand(page, id) {
    await page.evaluate((targetId) => {
      // Center puts the section's top edge inside the observer's
      // -30%/-60% band whichever ancestor actually scrolls.
      document.getElementById(targetId).scrollIntoView({ block: 'center', behavior: 'instant' });
    }, id);
  }

  async function currentTocLink(page, navSelector) {
    return page.evaluate((selector) => {
      const nav = document.querySelector(selector);
      if (!nav) return null;
      const current = nav.querySelector('a[aria-current="true"]');
      return current ? current.getAttribute('href') : null;
    }, navSelector);
  }

  test('/docs marks the contents link for the section in view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/docs', { waitUntil: 'domcontentloaded' });
    await scrollSectionIntoBand(page, 'server-rendering');
    await expect
      .poll(() => currentTocLink(page, "aside[variant='subnav']"), { timeout: 10_000 })
      .toBe('#server-rendering');
    await scrollSectionIntoBand(page, 'api-reference');
    await expect
      .poll(() => currentTocLink(page, "aside[variant='subnav']"), { timeout: 10_000 })
      .toBe('#api-reference');
  });

  test('/components marks the category filter for the section in view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/components', { waitUntil: 'domcontentloaded' });
    const lastId = await page.evaluate(() => {
      const sections = document.querySelectorAll('[data-bn-component-category]');
      return sections[sections.length - 1].id;
    });
    await scrollSectionIntoBand(page, lastId);
    // Categories are anchor links in the one page nav, so the mark
    // lands on the category's link.
    await expect
      .poll(() => currentTocLink(page, "aside[variant='subnav']"), { timeout: 10_000 })
      .toBe(`#${lastId}`);
  });

  test('the marked TOC link carries the brand current treatment', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/docs', { waitUntil: 'domcontentloaded' });
    await scrollSectionIntoBand(page, 'template-directives');
    await expect
      .poll(() => currentTocLink(page, "aside[variant='subnav']"), { timeout: 10_000 })
      .toBe('#template-directives');
    // The marked link's fill transitions in over 0.15s; poll the
    // paint itself until it settles instead of reading one frame
    // of the transition (a first-frame read is rgba(0, 0, 0, 0)).
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const link = document.querySelector("aside[variant='subnav'] a[aria-current='true']");
            if (!link) return '';
            const style = getComputedStyle(link);
            return `${style.backgroundColor}|${style.getPropertyValue('--color-tint').trim()}`;
          }),
        { timeout: 10_000 },
      )
      .toContain('232, 146, 10');
    const paint = await page.evaluate(() => {
      const link = document.querySelector("aside[variant='subnav'] a[aria-current='true']");
      const style = getComputedStyle(link);
      return { bg: style.backgroundColor, brand: style.getPropertyValue('--color-tint') };
    });
    expect(paint.bg).toContain('232, 146, 10');
    expect(paint.brand.trim()).toBe('#e8920a');
  });
});

test('docs and components share one subnav treatment', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const measure = (pressed) => {
    const root = document.querySelector('aside[variant="subnav"]');
    const el = pressed
      ? root.querySelector('button[aria-pressed="true"]')
      : root.querySelector('a, button[aria-pressed="false"]');
    const ul = root.querySelector('ul');
    const s = getComputedStyle(el);
    const u = getComputedStyle(ul);
    return {
      fontSize: s.fontSize,
      padding: s.padding,
      radius: s.borderRadius,
      borderWidth: s.borderTopWidth,
      bg: s.backgroundColor,
      color: s.color,
      weight: s.fontWeight,
      wrap: u.flexWrap,
      direction: u.flexDirection,
    };
  };
  await page.goto('/docs');
  const docs = await page.evaluate(measure, false);
  await page.goto('/components');
  const filters = await page.evaluate(measure, false);
  expect(filters).toEqual(docs);
  expect(await page.locator('aside[variant="chips"]').count()).toBe(0);
});
