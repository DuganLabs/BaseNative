// Built with BaseNative — basenative.dev
/**
 * Programmatic glyph library. Every glyph is a function returning a string
 * of inner SVG markup (no `<svg>` wrapper) sized to the canonical 1024×1024
 * viewBox. The glyph is centered visually so it composes with any `shape`
 * primitive in `render.js`.
 *
 * Glyph categories:
 *   - **monogram** — 1-3 letters drawn with `<text>`, hand-tuned spacing.
 *   - **symbol**   — hand-built `<path>` glyphs (lightbulb, leaf, bolt, …).
 *   - **wordmark** — short word in a fitted condensed weight.
 *   - **sigil**    — abstract geometric marks (concentric, intersecting, hex).
 *
 * Every glyph honors the supplied `palette.fg` (lettering / stroke) and
 * `palette.accent` (highlight / dot). The background is drawn by the shape
 * primitive in `render.js` — glyphs never paint their own background.
 *
 * @module
 */

/** @typedef {import("./palette.js").Palette} Palette */

/** @typedef {{
 *   text?: string,
 *   weight?: number,
 *   letterSpacing?: number,
 *   accentDot?: boolean,
 *   stack?: boolean,
 *   symbol?: SymbolName,
 *   sigil?: SigilName,
 *   word?: string,
 * }} GlyphSpec */

/** @typedef {"lightbulb"|"leaf"|"bolt"|"key"|"eye"|"asterisk"|"gear"|"terminal-prompt"|"calendar"|"beaker"|"clock"|"anchor"} SymbolName */

/** @typedef {"concentric-square"|"intersecting-circles"|"hex-grid"|"signal-stack"|"station-mark"} SigilName */

const VB = 1024;
const C = VB / 2; // center

/** XML-escape text content. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ─────────────────────────── Monograms ─────────────────────────── */

/**
 * Monogram glyph. Draws 1-3 letters in a tight, geometric face.
 *
 * @param {GlyphSpec} spec
 * @param {Palette} palette
 * @returns {string}
 */
export function monogram(spec, palette) {
  const text = (spec.text || "").slice(0, 3);
  const weight = spec.weight ?? 800;
  const stack = !!spec.stack;
  const accentDot = !!spec.accentDot;
  const ls = spec.letterSpacing ?? -24;

  // Font sizing rules — calibrated for legibility at 16px in browser tabs.
  // 1 letter: huge. 2 letters: big. 3 letters: tighter. Stacked: 2 rows.
  const len = text.length || 1;
  let fontSize;
  if (stack && len === 2) fontSize = 540;
  else if (len === 1) fontSize = 820;
  else if (len === 2) fontSize = 600;
  else fontSize = 460;

  // Use a system geometric stack — Inter-like. The CLI / consumer can pass
  // a webfont if they want a custom face; for runtime SVG we rely on the
  // OS to render Inter / SF / Helvetica Neue.
  const family = "Inter, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif";

  if (stack && len === 2) {
    const [a, b] = text.split("");
    return [
      `<g font-family="${family}" font-weight="${weight}" font-size="${fontSize}" fill="${palette.fg}" letter-spacing="${ls}" text-anchor="middle" dominant-baseline="central">`,
      `<text x="${C}" y="${C - 200}">${esc(a)}</text>`,
      `<text x="${C}" y="${C + 200}">${esc(b)}</text>`,
      `</g>`,
      accentDot ? accentDotMark(palette) : "",
    ].join("");
  }

  return [
    `<g font-family="${family}" font-weight="${weight}" font-size="${fontSize}" fill="${palette.fg}" letter-spacing="${ls}" text-anchor="middle" dominant-baseline="central">`,
    `<text x="${C}" y="${C + 30}">${esc(text)}</text>`,
    `</g>`,
    accentDot ? accentDotMark(palette) : "",
  ].join("");
}

/** Small accent dot in the lower-right — the "tab indicator" trick. */
function accentDotMark(palette) {
  return `<circle cx="800" cy="780" r="78" fill="${palette.accent}"/>`;
}

/* ─────────────────────────── Wordmark ─────────────────────────── */

/**
 * Wordmark glyph. Short word in a single line. Sized to fit 1024 wide.
 *
 * @param {GlyphSpec} spec
 * @param {Palette} palette
 * @returns {string}
 */
export function wordmark(spec, palette) {
  const word = (spec.word || spec.text || "").slice(0, 8);
  // Naive width estimate: ~0.55em per glyph in a condensed face.
  const target = 880;
  const estW = Math.max(word.length, 1) * 0.55;
  const fontSize = Math.min(420, Math.floor(target / estW));
  const family = "Inter, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif";
  return `<g font-family="${family}" font-weight="900" font-size="${fontSize}" fill="${palette.fg}" letter-spacing="-12" text-anchor="middle" dominant-baseline="central"><text x="${C}" y="${C + 20}">${esc(word)}</text></g>`;
}

/* ─────────────────────────── Symbols ─────────────────────────── */

/**
 * Hand-tuned vector symbols. Each path is drawn inside a 1024×1024 viewBox
 * with the shape's body sitting in roughly the central 640×640 — leaves
 * enough margin for `shape` primitives like `rounded` / `circle` to crop
 * comfortably at 16×16.
 *
 * @type {Record<SymbolName, (palette: Palette) => string>}
 */
export const symbols = {
  // Lightbulb — riff on the t4bs reference.
  lightbulb: (p) => [
    // bulb body — rounded teardrop
    `<path d="M512 200 C 360 200 252 312 252 460 C 252 552 296 624 360 668 L 360 740 Q 360 768 388 768 L 636 768 Q 664 768 664 740 L 664 668 C 728 624 772 552 772 460 C 772 312 664 200 512 200 Z" fill="${p.accent}"/>`,
    // filament — three vertical bars
    `<rect x="436" y="380" width="40" height="220" rx="14" fill="${p.bg}"/>`,
    `<rect x="492" y="380" width="40" height="220" rx="14" fill="${p.bg}"/>`,
    `<rect x="548" y="380" width="40" height="220" rx="14" fill="${p.bg}"/>`,
    // base + tip
    `<rect x="396" y="788" width="232" height="36" rx="10" fill="${p.fg}"/>`,
    `<rect x="430" y="836" width="164" height="28" rx="10" fill="${p.fg}"/>`,
  ].join(""),

  // Leaf — single curl with central vein.
  leaf: (p) => [
    // leaf body
    `<path d="M820 200 C 820 200 540 180 380 340 C 220 500 200 760 200 820 C 280 820 540 800 700 640 C 860 480 820 200 820 200 Z" fill="${p.accent}"/>`,
    // central vein — thin line from tip to base
    `<path d="M780 240 L 280 800" stroke="${p.bg}" stroke-width="28" stroke-linecap="round" fill="none"/>`,
    // a couple of side veins
    `<path d="M620 280 L 460 460" stroke="${p.bg}" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.7"/>`,
    `<path d="M460 460 L 320 600" stroke="${p.bg}" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.7"/>`,
  ].join(""),

  // Bolt — classic lightning, pure sharp polygon.
  bolt: (p) =>
    `<path d="M600 140 L 280 580 L 480 580 L 380 880 L 740 460 L 540 460 L 640 140 Z" fill="${p.accent}"/>`,

  // Key — circular bow + simple bit.
  key: (p) => [
    `<circle cx="380" cy="512" r="180" fill="none" stroke="${p.accent}" stroke-width="64"/>`,
    `<rect x="540" y="484" width="380" height="56" rx="16" fill="${p.accent}"/>`,
    `<rect x="780" y="540" width="40" height="120" rx="10" fill="${p.accent}"/>`,
    `<rect x="860" y="540" width="40" height="80" rx="10" fill="${p.accent}"/>`,
    // inner notch on the bow
    `<circle cx="380" cy="512" r="60" fill="${p.bg}"/>`,
  ].join(""),

  // Eye — almond with iris.
  eye: (p) => [
    `<path d="M120 512 Q 512 200 904 512 Q 512 824 120 512 Z" fill="${p.accent}"/>`,
    `<circle cx="512" cy="512" r="160" fill="${p.bg}"/>`,
    `<circle cx="512" cy="512" r="76" fill="${p.fg}"/>`,
  ].join(""),

  // Asterisk — six radial spokes.
  asterisk: (p) => {
    const spokes = [];
    for (let i = 0; i < 6; i++) {
      spokes.push(
        `<rect x="${C - 44}" y="${C - 340}" width="88" height="680" rx="44" fill="${p.accent}" transform="rotate(${(i * 60).toFixed(2)} ${C} ${C})"/>`,
      );
    }
    return spokes.join("") + `<circle cx="${C}" cy="${C}" r="80" fill="${p.fg}"/>`;
  },

  // Gear — 8 teeth + center.
  gear: (p) => {
    const teeth = [];
    for (let i = 0; i < 8; i++) {
      teeth.push(
        `<rect x="${C - 60}" y="124" width="120" height="180" rx="22" fill="${p.accent}" transform="rotate(${(i * 45).toFixed(2)} ${C} ${C})"/>`,
      );
    }
    return [
      teeth.join(""),
      `<circle cx="${C}" cy="${C}" r="280" fill="${p.accent}"/>`,
      `<circle cx="${C}" cy="${C}" r="120" fill="${p.bg}"/>`,
    ].join("");
  },

  // Terminal prompt — chevron + cursor block.
  "terminal-prompt": (p) => [
    `<path d="M260 360 L 460 512 L 260 664" stroke="${p.accent}" stroke-width="80" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    `<rect x="540" y="600" width="240" height="64" rx="12" fill="${p.accent}"/>`,
  ].join(""),

  // Calendar — page with 4 dots and a top binding.
  calendar: (p) => [
    `<rect x="200" y="220" width="624" height="624" rx="56" fill="${p.accent}"/>`,
    `<rect x="200" y="220" width="624" height="140" rx="56" fill="${p.fg}" opacity="0.16"/>`,
    // binding rings
    `<rect x="320" y="160" width="48" height="160" rx="20" fill="${p.fg}"/>`,
    `<rect x="656" y="160" width="48" height="160" rx="20" fill="${p.fg}"/>`,
    // grid dots
    `<circle cx="360" cy="520" r="34" fill="${p.bg}"/>`,
    `<circle cx="512" cy="520" r="34" fill="${p.bg}"/>`,
    `<circle cx="664" cy="520" r="34" fill="${p.bg}"/>`,
    `<circle cx="360" cy="660" r="34" fill="${p.bg}"/>`,
    `<circle cx="512" cy="660" r="34" fill="${p.bg}" opacity="0.55"/>`,
    `<circle cx="664" cy="660" r="34" fill="${p.bg}" opacity="0.55"/>`,
  ].join(""),

  // Beaker — flask + meniscus.
  beaker: (p) => [
    `<path d="M380 180 L 380 440 L 220 800 Q 200 860 268 860 L 756 860 Q 824 860 804 800 L 644 440 L 644 180 Z" fill="none" stroke="${p.accent}" stroke-width="56" stroke-linejoin="round"/>`,
    `<rect x="360" y="160" width="304" height="56" rx="20" fill="${p.accent}"/>`,
    // liquid line
    `<path d="M312 620 Q 412 580 512 620 Q 612 660 712 620 L 780 770 Q 800 820 750 820 L 274 820 Q 224 820 244 770 Z" fill="${p.accent}" opacity="0.9"/>`,
    // bubble
    `<circle cx="468" cy="700" r="22" fill="${p.fg}" opacity="0.7"/>`,
    `<circle cx="568" cy="740" r="14" fill="${p.fg}" opacity="0.7"/>`,
  ].join(""),

  // Clock — outer ring + 12/3 ticks + hands at 10:10 (the friendly time).
  clock: (p) => [
    `<circle cx="${C}" cy="${C}" r="360" fill="none" stroke="${p.accent}" stroke-width="56"/>`,
    // tick marks at 12/3/6/9
    `<rect x="${C - 14}" y="180" width="28" height="80" rx="10" fill="${p.accent}"/>`,
    `<rect x="${C - 14}" y="764" width="28" height="80" rx="10" fill="${p.accent}"/>`,
    `<rect x="180" y="${C - 14}" width="80" height="28" rx="10" fill="${p.accent}"/>`,
    `<rect x="764" y="${C - 14}" width="80" height="28" rx="10" fill="${p.accent}"/>`,
    // hour hand to ~10
    `<path d="M${C} ${C} L 320 380" stroke="${p.fg}" stroke-width="48" stroke-linecap="round"/>`,
    // minute hand to ~2
    `<path d="M${C} ${C} L 700 320" stroke="${p.fg}" stroke-width="36" stroke-linecap="round"/>`,
    `<circle cx="${C}" cy="${C}" r="34" fill="${p.fg}"/>`,
  ].join(""),

  // Anchor — ring + crossbar + hooked stem.
  anchor: (p) => [
    // ring
    `<circle cx="${C}" cy="240" r="76" fill="none" stroke="${p.accent}" stroke-width="44"/>`,
    // shaft
    `<rect x="${C - 26}" y="316" width="52" height="380" rx="14" fill="${p.accent}"/>`,
    // crossbar
    `<rect x="360" y="384" width="304" height="46" rx="14" fill="${p.accent}"/>`,
    // arc / fluke — drawn as two strokes meeting at base
    `<path d="M260 700 Q 260 860 ${C} 860 Q 764 860 764 700" stroke="${p.accent}" stroke-width="48" fill="none" stroke-linecap="round"/>`,
    // flukes (the hooks)
    `<path d="M260 700 L 200 660" stroke="${p.accent}" stroke-width="48" stroke-linecap="round"/>`,
    `<path d="M764 700 L 824 660" stroke="${p.accent}" stroke-width="48" stroke-linecap="round"/>`,
  ].join(""),
};

/**
 * Symbol glyph entry point.
 *
 * @param {GlyphSpec} spec
 * @param {Palette} palette
 * @returns {string}
 */
export function symbol(spec, palette) {
  const name = /** @type {SymbolName} */ (spec.symbol || "asterisk");
  const draw = symbols[name];
  if (!draw) {
    throw new Error(`@basenative/favicon: unknown symbol "${name}"`);
  }
  return draw(palette);
}

/* ─────────────────────────── Sigils ─────────────────────────── */

/**
 * Hand-tuned abstract sigils. Each one is a recognizable signal mark.
 *
 * @type {Record<SigilName, (palette: Palette) => string>}
 */
export const sigils = {
  // Three concentric squares — BaseNative house mark.
  "concentric-square": (p) => [
    `<rect x="200" y="200" width="624" height="624" rx="40" fill="none" stroke="${p.accent}" stroke-width="56"/>`,
    `<rect x="324" y="324" width="376" height="376" rx="32" fill="none" stroke="${p.accent}" stroke-width="44" opacity="0.75"/>`,
    `<rect x="436" y="436" width="152" height="152" rx="20" fill="${p.accent}"/>`,
  ].join(""),

  // Two circles overlapping — Venn-style identity.
  "intersecting-circles": (p) => [
    `<circle cx="400" cy="512" r="260" fill="none" stroke="${p.accent}" stroke-width="56"/>`,
    `<circle cx="624" cy="512" r="260" fill="none" stroke="${p.fg}" stroke-width="56"/>`,
  ].join(""),

  // Hex grid — 7 hexagons (1 center + 6 around).
  "hex-grid": (p) => {
    const hex = (cx, cy, r, fill) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
    };
    const r = 140;
    const dy = r * Math.sqrt(3); // pointy-top stack height
    const dx = r * 1.5;
    const cells = [
      hex(C, C, r, p.accent),
      hex(C - dx, C - dy / 2, r, p.fg),
      hex(C + dx, C - dy / 2, r, p.fg),
      hex(C - dx, C + dy / 2, r, p.fg),
      hex(C + dx, C + dy / 2, r, p.fg),
      hex(C, C - dy, r, p.accent),
      hex(C, C + dy, r, p.accent),
    ];
    return cells.join("");
  },

  // BaseNative signal-stack — three concentric upward triangles.
  "signal-stack": (p) => {
    const tri = (size, fill, op = 1) => {
      const half = size / 2;
      const top = C - size * 0.55;
      const bottom = C + size * 0.45;
      const left = C - half;
      const right = C + half;
      return `<polygon points="${C},${top} ${right},${bottom} ${left},${bottom}" fill="${fill}" opacity="${op}"/>`;
    };
    return [
      tri(720, p.accent, 0.28),
      tri(520, p.accent, 0.55),
      tri(320, p.accent, 1),
    ].join("");
  },

  // Station mark — circle with a horizontal beam, rail-station tag style.
  "station-mark": (p) => [
    `<circle cx="${C}" cy="${C}" r="320" fill="none" stroke="${p.accent}" stroke-width="64"/>`,
    `<rect x="120" y="${C - 36}" width="784" height="72" rx="20" fill="${p.accent}"/>`,
    `<circle cx="${C}" cy="${C}" r="120" fill="${p.bg}"/>`,
    `<circle cx="${C}" cy="${C}" r="56" fill="${p.accent}"/>`,
  ].join(""),
};

/**
 * Sigil glyph entry point.
 *
 * @param {GlyphSpec} spec
 * @param {Palette} palette
 * @returns {string}
 */
export function sigil(spec, palette) {
  const name = /** @type {SigilName} */ (spec.sigil || "concentric-square");
  const draw = sigils[name];
  if (!draw) {
    throw new Error(`@basenative/favicon: unknown sigil "${name}"`);
  }
  return draw(palette);
}

/**
 * Dispatch a glyph by `kind`.
 *
 * @param {"monogram"|"symbol"|"wordmark"|"sigil"} kind
 * @param {GlyphSpec} spec
 * @param {Palette} palette
 * @returns {string}
 */
export function renderGlyph(kind, spec, palette) {
  switch (kind) {
    case "monogram":
      return monogram(spec, palette);
    case "wordmark":
      return wordmark(spec, palette);
    case "symbol":
      return symbol(spec, palette);
    case "sigil":
      return sigil(spec, palette);
    default:
      throw new Error(`@basenative/favicon: unknown glyph kind "${kind}"`);
  }
}
