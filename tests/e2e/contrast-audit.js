// Text contrast audit, run in the page. Every element in <main> (and the
// site chrome) that paints its own text is checked against the
// composited background behind it, AA floors: 4.5 for body text, 3 for
// large text (24px, or 18.66px at weight 600+). Disabled controls and
// invisible text are exempt, as WCAG exempts them. Background images and
// gradients are not modeled, so elements over one are skipped.
export function contrastAudit() {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const parse = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (top, base) => ({
    r: top.r * top.a + base.r * (1 - top.a),
    g: top.g * top.a + base.g * (1 - top.a),
    b: top.b * top.a + base.b * (1 - top.a),
    a: 1,
  });
  const background = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let base = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (!base || base.a < 1)
      base = matchMedia('(prefers-color-scheme: dark)').matches
        ? { r: 0, g: 0, b: 0, a: 1 }
        : { r: 255, g: 255, b: 255, a: 1 };
    if (layers.length && layers[layers.length - 1].a >= 1) base = layers.pop();
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const v = el.getAttribute('variant');
    return `${el.tagName.toLowerCase()}${id}${v ? `[variant=${v}]` : ''}`;
  };
  const out = [];
  for (const el of document.querySelectorAll(
    'main *, body > header *, body > nav *, body > footer *',
  )) {
    if (!el.getClientRects().length) continue;
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('')
      .trim();
    if (!text) continue;
    if (el.closest('[disabled], [aria-disabled="true"], [hidden], svg, pre, code, kbd, option'))
      continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || parseFloat(cs.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    // sr-only / clipped text paints nothing.
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') continue;
    const bg = background(el);
    if (!bg) continue;
    let fg = parse(cs.color);
    if (!fg || fg.a === 0) continue;
    fg = over(fg, bg);
    const a = lum(fg);
    const b = lum(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 600);
    const floor = large ? 3 : 4.5;
    if (ratio + 0.005 < floor) {
      out.push({
        rule: 'contrast',
        at: describe(el),
        text: text.slice(0, 32),
        ratio: +ratio.toFixed(2),
        floor,
      });
    }
  }
  return out;
}
