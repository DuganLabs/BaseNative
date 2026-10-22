/**
 * Increased-contrast colours derived from the kit palettes.
 *
 * Neither Apple 27 kit has an increased-contrast mode (Colors collections
 * are Light and Dark only). These values follow Apple's Increase Contrast
 * guidance — raise foreground/background contrast and reduce transparency —
 * and every one of them is labeled `derived`. They are not kit hexes.
 */

const LABEL_RANK = [
  ['primary', 7],
  ['secondary', 7],
  ['tertiary', 4.5],
];

/** @param {string} hex */
export function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (h.length === 6) h += 'ff';
  if (h.length !== 8) return null;
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
    a: Number.parseInt(h.slice(6, 8), 16) / 255,
  };
}

/** @param {string} input */
export function parseColor(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (s.startsWith('#')) return parseHex(s);
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] == null ? 1 : Number(m[4]),
  };
}

/** @param {{r:number,g:number,b:number,a:number}} c */
export function formatColor(c) {
  const r = clampByte(c.r);
  const g = clampByte(c.g);
  const b = clampByte(c.b);
  if (c.a >= 0.999) return `rgb(${r}, ${g}, ${b})`;
  const a = Math.round(c.a * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function channelLin(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of an opaque sRGB colour. */
export function luminance({ r, g, b }) {
  return 0.2126 * channelLin(r) + 0.7152 * channelLin(g) + 0.0722 * channelLin(b);
}

export function composite(fg, bg) {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

/** WCAG contrast ratio. Translucent `fg` is composited on `bg` first when asked. */
export function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export function rgbToHsl(r, g, b) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case R:
      h = (G - B) / d + (G < B ? 6 : 0);
      break;
    case G:
      h = (B - R) / d + 2;
      break;
    default:
      h = (R - G) / d + 4;
  }
  return { h: h / 6, s, l };
}

export function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const hue = (p, q, t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue(p, q, h + 1 / 3) * 255,
    g: hue(p, q, h) * 255,
    b: hue(p, q, h - 1 / 3) * 255,
  };
}

/**
 * Resolve one kit colour entry for a scheme to `{ hex, css, rgb }`.
 * Alias objects (`{ alias, resolved }`) use `resolved`. `*_css` wins when
 * the kit recorded it, so emitted kit colours stay verbatim.
 */
export function resolveEntry(entry, scheme) {
  if (!entry) return null;
  let hex = entry[scheme];
  let css = entry[`${scheme}_css`];
  if (hex && typeof hex === 'object') hex = hex.resolved;
  if (typeof css !== 'string' && typeof hex === 'string') css = formatColor(parseHex(hex));
  const rgb = parseColor(css) || (typeof hex === 'string' ? parseHex(hex) : null);
  if (!rgb || typeof css !== 'string') return null;
  return { hex: typeof hex === 'string' ? hex : null, css, rgb };
}

function labelTarget(name) {
  const n = name.toLowerCase();
  for (const [rank, ratio] of LABEL_RANK) {
    if (n.includes(rank)) return ratio;
  }
  return 3;
}

function classify(name, rgb) {
  const n = name.toLowerCase();
  const opaque = rgb.a >= 0.999;
  if (
    n.startsWith('backgrounds') ||
    n === 'window background' ||
    n.includes('sidebar - bg') ||
    n.startsWith('grays/black') ||
    n.startsWith('grays/white') ||
    /^grays\/gray [2-6]$/.test(n)
  ) {
    return 'unchanged';
  }
  if (n.includes('separator')) {
    if (n.includes('non-opaque') || n.includes('vibrant')) return 'separator';
    return opaque ? 'unchanged' : 'separator';
  }
  if (n.includes('overlay')) return 'overlay';
  if (n.includes('label')) return 'label';
  if (!opaque && (n.startsWith('fills') || n.includes('fill') || n.includes('bg -'))) return 'fill';
  if (n.startsWith('accents') || n === 'grays/gray' || n.includes('tab bar')) return 'accent';
  if (!opaque) return 'fill';
  return 'accent';
}

function roundAlpha(a) {
  return Math.min(1, Math.round(a * 1000) / 1000);
}

function withContrastFloor(fg, bg, alpha, target, floor) {
  let a = roundAlpha(Math.max(floor, alpha));
  let guard = 0;
  while (
    target &&
    contrastRatio(composite({ ...fg, a }, bg), bg) + 1e-6 < target &&
    a < 1 &&
    guard < 30
  ) {
    a = roundAlpha(a + 0.001);
    guard += 1;
  }
  if (a + 1e-9 < floor) a = roundAlpha(floor);
  return a;
}

function raiseLabel(fg, bg, target) {
  const current = contrastRatio(composite(fg, bg), bg);
  let alpha;
  if (current + 1e-6 >= target) {
    alpha = Math.min(1, fg.a + 0.12);
  } else {
    let lo = fg.a;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      const ratio = contrastRatio(composite({ ...fg, a: mid }, bg), bg);
      if (ratio >= target) hi = mid;
      else lo = mid;
    }
    alpha = hi;
  }
  alpha = withContrastFloor(fg, bg, alpha, current + 1e-6 < target ? target : null, fg.a);
  return { ...fg, a: alpha };
}

function raiseFill(fg, bg) {
  let alpha = Math.min(0.9, fg.a * 1.6);
  if (alpha < fg.a) alpha = fg.a;
  const target = 1.25;
  if (contrastRatio(composite({ ...fg, a: alpha }, bg), bg) < target && alpha < 0.9) {
    let lo = alpha;
    let hi = 0.9;
    for (let i = 0; i < 20; i += 1) {
      const mid = (lo + hi) / 2;
      if (contrastRatio(composite({ ...fg, a: mid }, bg), bg) >= target) hi = mid;
      else lo = mid;
    }
    alpha = hi;
  }
  alpha = withContrastFloor(fg, bg, alpha, null, fg.a);
  if (alpha > 0.9 && fg.a <= 0.9) alpha = 0.9;
  return { ...fg, a: alpha };
}

function raiseOverlay(fg) {
  let alpha = fg.a * 1.25;
  if (alpha > 0.85) alpha = 0.85;
  if (alpha < fg.a) alpha = fg.a;
  return { ...fg, a: roundAlpha(alpha) };
}

function walkAccent(rgb, bg) {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const bgIsLight = luminance(bg) > 0.5;
  const dir = bgIsLight ? -1 : 1;
  let l = hsl.l;
  const paint = (lightness) => ({ ...hslToRgb(hsl.h, hsl.s, lightness), a: 1 });
  let best = paint(l);
  let bestC = contrastRatio(best, bg);
  const step = () => {
    const nextL = Math.min(0.98, Math.max(0.02, l + dir * 0.02));
    if (Math.abs(nextL - l) < 1e-6) return null;
    l = nextL;
    const next = paint(l);
    return { next, c: contrastRatio(next, bg) };
  };
  if (bestC >= 4.5) {
    for (let i = 0; i < 4; i += 1) {
      const moved = step();
      if (!moved || moved.c <= bestC + 1e-6) break;
      best = moved.next;
      bestC = moved.c;
    }
    return best;
  }
  for (let i = 0; i < 46; i += 1) {
    const moved = step();
    if (!moved) break;
    best = moved.next;
    bestC = moved.c;
    if (bestC >= 4.5) break;
  }
  return best;
}

/**
 * Derive the increased-contrast palette for one platform scheme.
 *
 * @param {Record<string, object>} colors kit colour map
 * @param {'light'|'dark'} scheme
 * @param {string} backgroundName key used as the compositing background
 * @returns {Array<{name:string, slug:string, kitCss:string, derivedCss:string, role:string, method:string, provenance:'derived'}>}
 */
export function derivePalette(colors, scheme, backgroundName) {
  const bg = resolveEntry(colors[backgroundName], scheme);
  if (!bg) throw new Error(`No ${backgroundName} colour to derive increased contrast against.`);
  const opaqueKey = Object.keys(colors).find((name) => name === 'Separators/Opaque');
  const opaque = opaqueKey ? resolveEntry(colors[opaqueKey], scheme) : null;
  const out = [];
  for (const name of Object.keys(colors).sort((a, b) => a.localeCompare(b))) {
    const resolved = resolveEntry(colors[name], scheme);
    if (!resolved) continue;
    const role = classify(name, resolved.rgb);
    let next = resolved.rgb;
    let method = 'unchanged';
    if (role === 'label') {
      next = raiseLabel(resolved.rgb, bg.rgb, labelTarget(name));
      method = 'label-alpha';
    } else if (role === 'fill') {
      next = raiseFill(resolved.rgb, bg.rgb);
      method = 'fill-alpha';
    } else if (role === 'overlay') {
      next = raiseOverlay(resolved.rgb);
      method = 'overlay-alpha';
    } else if (role === 'separator') {
      if (opaque) {
        next = opaque.rgb;
        method = 'opaque-separator';
      } else {
        next = raiseFill(resolved.rgb, bg.rgb);
        method = 'fill-alpha';
      }
    } else if (role === 'accent') {
      next = walkAccent(resolved.rgb, bg.rgb);
      method = 'accent-walk';
    }
    out.push({
      name,
      slug: colorSlug(name),
      kitCss: resolved.css,
      derivedCss: method === 'unchanged' ? resolved.css : formatColor(next),
      role,
      method,
      provenance: 'derived',
    });
  }
  return out;
}

/** Kit colour name → custom-property slug (`Labels/Secondary` → `labels-secondary`). */
export function colorSlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
