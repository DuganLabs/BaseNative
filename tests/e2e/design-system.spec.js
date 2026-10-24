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
 * and several routes have no h1. /design-system keeps color-contrast. The
 * catalog names its landmarks and dialogs; contrast on the glass surfaces
 * is still open.
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
  '/design-system': ['color-contrast'],
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
      '[data-bn-showcase-search]',
      '[data-bn-component-card]',
      '[data-bn-showcase-toc]',
      '[data-bn="bn-search"]',
      'input[type="search"]',
      '[data-bn="bn-list"][data-grouped="true"]',
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

const CARD_ROUTES = new Set(['/playground', '/compare', '/components', '/roadmap']);

async function cardStack(page) {
  return page.evaluate(() => {
    const token =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--bn-section-space'),
      ) || 12;
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
    const hero = document.querySelector('main [data-bn="bn-hero"]');
    if (hero && paints(hero)) {
      const heroBox = hero.getBoundingClientRect();
      const next = [
        ...document.querySelectorAll(
          'main article, main [data-bn="bn-list"], main [data-bn="bn-metric"], main [data-bn-component-card], main [data-bn-component-search], main [data-bn-showcase-search]',
        ),
      ]
        .filter((el) => paints(el) && el.getBoundingClientRect().top >= heroBox.bottom - 1)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (next) {
        const gap = next.getBoundingClientRect().top - heroBox.bottom;
        if (gap < token - 1) problems.push(`hero gap ${gap.toFixed(1)}px is under ${token}px`);
      }
    }
    const selector =
      'article, section, [data-bn="bn-hero"], [data-bn="bn-list"], [data-bn="bn-metric"], [data-bn-component-card]';
    for (const el of document.querySelectorAll(selector)) {
      if (!paints(el)) continue;
      const parent = el.parentElement?.closest(selector);
      if (!parent || parent === el || !paints(parent)) continue;
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
    const problems = [];
    const seen = new Set();
    const buttons = document.querySelectorAll(
      '[data-bn="bn-button"], [data-bn="bn-stepper-dec"], [data-bn="bn-stepper-inc"], button:not([data-bn])',
    );
    for (const el of buttons) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.disabled) continue;
      if (el.getAttribute('data-force') === 'disabled' || Number(style.opacity) < 0.99) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      const variant = el.getAttribute('data-variant') || el.getAttribute('data-bn') || 'plain';
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

async function materialSamples(page) {
  return page.evaluate(() => {
    function channel(color) {
      const match = String(color).match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => parseFloat(part));
      const max = Math.max(parts[0], parts[1], parts[2]);
      const min = Math.min(parts[0], parts[1], parts[2]);
      return max === 0 ? 0 : (max - min) / max;
    }
    const problems = [];
    for (const name of ['ultrathin', 'thin', 'sm']) {
      const el = document.querySelector(`[data-bn="bn-material"][data-material="${name}"]`);
      if (!el) {
        problems.push(`missing ${name}`);
        continue;
      }
      const style = getComputedStyle(el);
      const blur = style.backdropFilter || '';
      if (!blur.includes('blur')) problems.push(`${name} has no blur`);
      const stage = el.closest('[data-bn="bn-catalog-demo"]');
      const stageStyle = stage ? getComputedStyle(stage) : null;
      const back = stageStyle ? stageStyle.backgroundImage : 'none';
      if (!back.includes('repeating-linear-gradient')) problems.push(`${name} has no pattern`);
      if (/linear-gradient\([^)]*rgb\(232,\s*146,\s*10\)/.test(back))
        problems.push(`${name} backdrop is a brand wash`);
      const sat = stageStyle ? channel(stageStyle.backgroundColor) : 1;
      if (sat > 0.2) problems.push(`${name} stage is saturated`);
      const box = el.getBoundingClientRect();
      if (box.width > 120) problems.push(`${name} tile is ${Math.round(box.width)}px wide`);
      const caption = el.querySelector('figcaption');
      if (!caption || !caption.textContent.trim()) problems.push(`${name} has no label`);
    }
    return problems;
  });
}

async function catalogTitle(page) {
  return page.evaluate(() => {
    const titles = [...document.querySelectorAll('h1')].map((el) =>
      el.textContent.replace(/\s+/g, ' ').trim(),
    );
    const hits = titles.filter((text) => text === 'Platform catalog');
    return hits.length === 1 ? [] : [`Platform catalog appears ${hits.length} times`];
  });
}

async function sharedSectionSurface(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('main [data-bn="bn-hero"]');
    const card = [...document.querySelectorAll('main > section')].find((el) =>
      /Where this list came from/.test(el.textContent || ''),
    );
    if (!hero || !card) return ['missing provenance card'];
    const a = getComputedStyle(hero);
    const b = getComputedStyle(card);
    const problems = [];
    if (a.backgroundColor !== b.backgroundColor)
      problems.push(`surface ${b.backgroundColor} != hero ${a.backgroundColor}`);
    if (a.backgroundImage !== b.backgroundImage)
      problems.push(`surface image ${b.backgroundImage} != hero ${a.backgroundImage}`);
    if (a.boxShadow !== b.boxShadow) problems.push('provenance elevation != hero');
    if (b.backgroundImage !== 'none') problems.push('provenance card paints a gradient');
    return problems;
  });
}

async function atomStatesCard(page) {
  return page.evaluate(() => {
    function channels(color) {
      const raw = String(color).trim();
      const hex = raw.match(/^#([0-9a-f]{6})$/i);
      if (hex) {
        const value = Number.parseInt(hex[1], 16);
        return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
      }
      const modern = raw.match(/color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/i);
      if (modern)
        return modern.slice(1, 4).map((part) => Math.round(Number.parseFloat(part) * 255));
      const match = raw.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      return match[1]
        .split(',')
        .slice(0, 3)
        .map((part) => Math.round(Number.parseFloat(part)));
    }
    function same(a, b) {
      const left = channels(a);
      const right = channels(b);
      return Boolean(left && right && left.every((channel, index) => channel === right[index]));
    }
    function luminance(color) {
      const rgb = channels(color);
      if (!rgb) return null;
      const linear = rgb.map((value) => {
        const s = value / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    }
    const pageTheme = document.documentElement.getAttribute('data-theme');
    const stage = [...document.querySelectorAll('[data-bn="bn-catalog-stage"]')].find((el) =>
      /^Atom states/.test(el.querySelector('h2')?.textContent || ''),
    );
    if (!stage) return ['missing Atom states'];
    const problems = [];
    const theme = stage.getAttribute('data-theme');
    if (theme && theme !== pageTheme) problems.push(`Atom states theme is ${theme}`);
    const style = getComputedStyle(stage);
    if (parseFloat(style.paddingTop) < 16) problems.push('Atom states has no inset padding');
    if (parseFloat(style.borderTopLeftRadius) < 16) problems.push('Atom states has no radius');
    const tone = luminance(style.backgroundColor);
    if (pageTheme === 'dark' && tone != null && tone > 0.45)
      problems.push(`Atom states is a light panel ${style.backgroundColor}`);
    if (pageTheme === 'light' && tone != null && tone < 0.45)
      problems.push(`Atom states is a dark panel ${style.backgroundColor}`);
    const brand = style.getPropertyValue('--bn-brand');
    const green = style.getPropertyValue('--bn-plat-color-accents-green');
    const radio = stage.querySelector('[data-bn="bn-radio"] input:checked');
    const check = stage.querySelector('[data-bn="bn-checkbox"] input:checked');
    const toggle = stage.querySelector('[data-bn="bn-switch"] input:checked');
    if (!radio || !same(getComputedStyle(radio).backgroundColor, brand))
      problems.push('selected radio is not the brand accent');
    if (!check || !same(getComputedStyle(check).backgroundColor, brand))
      problems.push('selected checkbox is not the brand accent');
    if (!toggle || !same(getComputedStyle(toggle).backgroundColor, green))
      problems.push('switch on-state lost its semantic green');
    for (const el of document.querySelectorAll('[data-bn="bn-catalog-stage"]')) {
      const forced = el.getAttribute('data-theme');
      if (forced === 'light' && pageTheme === 'dark') {
        const title = (el.querySelector('h2')?.textContent || '').trim();
        problems.push(`light stage on a dark page: ${title}`);
      }
    }
    return problems;
  });
}

async function neutralIntro(page) {
  return page.evaluate(() => {
    const problems = [];
    const hero = document.querySelector('main [data-bn="bn-hero"]');
    const article = document.querySelector('[data-bn-wallpaper="true"]');
    const heroImage = hero ? getComputedStyle(hero).backgroundImage : 'none';
    const articleImage = article ? getComputedStyle(article).backgroundImage : 'none';
    const bodyImage = getComputedStyle(document.body).backgroundImage;
    if (heroImage !== 'none') problems.push('intro card paints a glow');
    if (articleImage !== 'none') problems.push('catalog wallpaper paints a glow');
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
    if (!style.backgroundImage.includes('repeating-linear-gradient'))
      problems.push('canvas has no neutral pattern');
    if (/linear-gradient\([^)]*rgb\(232,\s*146,\s*10\)/.test(style.backgroundImage))
      problems.push('canvas is a brand wash');
    const sat = channel(style.backgroundColor);
    if (sat == null || sat > 0.2) problems.push('canvas stage is saturated');
    return problems;
  });
}

async function heroPattern(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('main [data-bn="bn-hero"]');
    if (!hero) return ['missing hero'];
    const h1 = hero.querySelector('h1');
    const problems = [];
    if (!h1) problems.push('hero has no title');
    const ems = h1 ? h1.querySelectorAll('em') : [];
    if (ems.length !== 1) problems.push(`hero accent count ${ems.length}`);
    const eyebrow = hero.querySelector('[data-bn="bn-hero-eyebrow"]');
    const lede = hero.querySelector('[data-bn="bn-hero-lede"]');
    if (!eyebrow) problems.push('missing eyebrow');
    if (!lede) problems.push('missing lede');
    const platform = document.documentElement.getAttribute('data-bn-platform');
    if (h1) {
      const size = parseFloat(getComputedStyle(h1).fontSize);
      const expected = platform === 'macos' ? 28 : 34;
      if (Math.abs(size - expected) > 0.6) problems.push(`title ${size} expected ${expected}`);
    }
    if (eyebrow) {
      const size = parseFloat(getComputedStyle(eyebrow).fontSize);
      if (Math.abs(size - 13) > 0.6) problems.push(`eyebrow ${size}`);
    }
    if (lede) {
      const size = parseFloat(getComputedStyle(lede).fontSize);
      const expected = platform === 'macos' ? 15 : 17;
      if (Math.abs(size - expected) > 0.6) problems.push(`lede ${size} expected ${expected}`);
    }
    if (ems[0] && getComputedStyle(ems[0]).fontStyle !== 'italic')
      problems.push(`accent is ${getComputedStyle(ems[0]).fontStyle}`);
    const buttons = [...hero.querySelectorAll('[data-bn="bn-button"]')];
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
    const token =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--bn-section-space'),
      ) || 12;
    const problems = [];
    const nodes = document.querySelectorAll(
      'main > section, [data-bn-showcase-section], [data-bn-docs-toc], [data-bn-component-category]',
    );
    for (const el of nodes) {
      const style = getComputedStyle(el);
      if (style.display === 'none') continue;
      const bottom = parseFloat(style.marginBottom) || 0;
      if (bottom > token + 1) {
        const name = el.getAttribute('data-bn') || el.id || el.tagName;
        problems.push(`margin ${bottom} on ${name}`);
      }
      if (el.hasAttribute('data-bn-showcase-section')) {
        const pad = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
        if (pad > token + 1) problems.push(`showcase pad ${pad}`);
      }
    }
    return problems.slice(0, 6);
  });
}

async function contentMeasure(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const hero = document.querySelector('main [data-bn="bn-hero"]');
    const side = document.querySelector('body > [data-bn="bn-sidebar"]');
    if (!main || !hero) return ['missing measure'];
    const mainBox = main.getBoundingClientRect();
    const heroBox = hero.getBoundingClientRect();
    const frame = hero.parentElement === main ? hero : hero.parentElement;
    const frameBox = frame.getBoundingClientRect();
    const problems = [];
    const leftGap = heroBox.left - mainBox.left;
    const rightGap = mainBox.right - heroBox.right;
    if (Math.abs(leftGap - rightGap) > 2)
      problems.push(`measure off-center ${leftGap.toFixed(0)}/${rightGap.toFixed(0)}`);
    if (rightGap > 64) problems.push(`right gutter ${rightGap.toFixed(0)}`);
    if (Math.abs(frameBox.left - heroBox.left) > 2 || Math.abs(frameBox.right - heroBox.right) > 2)
      problems.push('header does not fill the content column');
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
    const card = output?.closest('[data-bn="bn-list"]');
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
    const side = document.querySelector('body > [data-bn="bn-sidebar"]');
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
    const filters = document.querySelector('[data-bn-component-filters]');
    const bar = document.querySelector('body > [data-bn="bn-tab-bar"]');
    const main = document.querySelector('main');
    if (!search || !filters || !bar || !main) return ['missing parts chrome'];
    main.scrollTop = search.offsetTop;
    const searchBox = search.getBoundingClientRect();
    const filterBox = filters.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    const problems = [];
    if (searchBox.height > 160) problems.push(`search chrome ${searchBox.height.toFixed(0)}px`);
    if (filterBox.height > 52) problems.push(`chips wrap to ${filterBox.height.toFixed(0)}px`);
    const room = barBox.top - searchBox.bottom;
    if (room < 280) problems.push(`content room ${room.toFixed(0)}px`);
    const stuck = getComputedStyle(search).position;
    if (stuck !== 'sticky') problems.push(`search is ${stuck}`);
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
    const current = document.querySelector(
      '#site-nav [data-bn="bn-sidebar-item"][aria-current="page"]',
    );
    if (!current) return ['missing selected sidebar item'];
    const style = getComputedStyle(current);
    const brand = style.getPropertyValue('--bn-brand');
    const ink = style.getPropertyValue('--bn-brand-ink');
    const problems = [];
    if (!same(style.backgroundColor, brand))
      problems.push(`selected sidebar fill is ${style.backgroundColor}`);
    if (!same(style.color, ink)) problems.push(`selected sidebar label is ${style.color}`);
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
          if (path === '/design-system') {
            expect(await catalogTitle(page)).toEqual([]);
            expect(await materialSamples(page)).toEqual([]);
            expect(await atomStatesCard(page)).toEqual([]);
            expect(await neutralIntro(page)).toEqual([]);
          }
          if (path !== '/design-system') expect(await neutralIntro(page)).toEqual([]);
          if (path === '/ai') expect(await sharedSectionSurface(page)).toEqual([]);
          if (path === '/builder') expect(await canvasStage(page)).toEqual([]);
          if (path === '/tasks') expect(await tasksCountInsideCard(page)).toEqual([]);
          if (path === '/components' && width < 768) expect(await partsChrome(page)).toEqual([]);
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
            // anti-aliasing. 320 still matches exactly.
            maxDiffPixels:
              path === '/components' ? 80 : path === '/compare' && width >= 768 ? 250 : 0,
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
