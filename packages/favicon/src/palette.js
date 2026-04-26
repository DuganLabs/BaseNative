// Built with BaseNative — basenative.dev
/**
 * Color helpers for favicon palettes. A favicon needs at minimum a `bg`
 * (background fill) and an `accent` (the glyph mark). `fg` is used for
 * monogram lettering and high-contrast strokes.
 *
 * Two ergonomic input forms:
 *   - Pass a single hex string → derive bg / fg / accent.
 *   - Pass a partial `{bg, fg, accent}` map → fill in the gaps.
 *
 * Colors stay close to the DuganLabs charcoal-and-amber house style by
 * default, but every preset overrides them.
 *
 * @module
 */

/** @typedef {{ bg: string, fg: string, accent: string }} Palette */

const HOUSE = Object.freeze({
  bg: "#0C0B09", // charcoal — the DuganLabs base
  fg: "#F0EDE4", // bone — neutral foreground
  accent: "#E8920A", // amber — DuganLabs signal color
});

/**
 * Parse `#rgb` / `#rrggbb` to `[r, g, b]` (0-255). Returns null on bad input.
 *
 * @param {string} hex
 * @returns {[number, number, number] | null}
 */
export function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Encode `[r, g, b]` back to lowercase `#rrggbb`.
 *
 * @param {[number, number, number]} rgb
 * @returns {string}
 */
export function rgbToHex([r, g, b]) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Relative luminance per WCAG. 0 = black, 1 = white.
 *
 * @param {string} hex
 * @returns {number}
 */
export function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Mix two hex colors at `t` (0 → a, 1 → b).
 *
 * @param {string} a
 * @param {string} b
 * @param {number} t
 * @returns {string}
 */
export function mix(a, b, t) {
  const A = hexToRgb(a) || [0, 0, 0];
  const B = hexToRgb(b) || [0, 0, 0];
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex([
    A[0] + (B[0] - A[0]) * k,
    A[1] + (B[1] - A[1]) * k,
    A[2] + (B[2] - A[2]) * k,
  ]);
}

/**
 * Resolve a palette input to a fully-populated `{ bg, fg, accent }`.
 *
 * @param {string | Partial<Palette>} input
 * @returns {Palette}
 */
export function resolvePalette(input) {
  if (typeof input === "string") {
    // Treat the string as the accent. Pair with house bg + a high-contrast fg.
    const accent = input;
    const bg = HOUSE.bg;
    const fg = luminance(bg) < 0.5 ? "#F0EDE4" : "#0C0B09";
    return { bg, fg, accent };
  }
  const p = input || {};
  return {
    bg: p.bg || HOUSE.bg,
    fg: p.fg || (p.bg ? (luminance(p.bg) < 0.5 ? "#F0EDE4" : "#0C0B09") : HOUSE.fg),
    accent: p.accent || HOUSE.accent,
  };
}

/** The default DuganLabs palette. */
export const housePalette = HOUSE;
