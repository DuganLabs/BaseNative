/**
 * WCAG 2.x relative-luminance and contrast maths, plus a resolver that walks
 * `var()` chains through a block of CSS custom-property declarations.
 *
 * This exists so accessibility is a computed property of a palette rather than
 * a claim about it: `audit.js` resolves every documented pairing through here
 * and a consumer's test fails the build if one drops below its threshold.
 *
 * Ported from `libs/shared/design/src/contrast.ts` in the Greenput repo, where
 * it was fused to the `--gp-*` namespace. Nothing here knows a token name.
 */

/** Body text, WCAG 2.2 SC 1.4.3 Contrast (Minimum). */
export const AA_TEXT = 4.5;

/** Large text (>=24px, or >=18.66px bold), same SC. */
export const AA_LARGE = 3;

/** SC 1.4.11 Non-text Contrast — control boundaries, focus indicators, icons. */
export const AA_NONTEXT = 3;

/**
 * A custom-property name, anchored and written so there is exactly one way to
 * match any given string: the leading `--` is literal, and no later segment may
 * begin with `-`. The obvious `--[a-z0-9-]+` is ambiguous — `-` belongs to the
 * class too, so a run of dashes can be split many ways and the engine tries all
 * of them before failing.
 */
const PROP_NAME = /^--[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/** A `var(…)` call. `[^)]*` is a negated class, so the inside is scanned once. */
const VAR_CALL = /^var\(([^)]*)\)$/i;

/**
 * Extracts `--name: value` declarations from a CSS text block.
 *
 * Later declarations win, which mirrors the cascade for a single flat block.
 * Auditing a stylesheet that carries more than one activation context (a light
 * `:root` plus a dark `@media` override) therefore reads as a blur of the two —
 * emit one scheme at a time with `toCss(theme, { only })` instead.
 *
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function parseCustomProperties(css) {
  const out = new Map();
  // Split on the delimiters first, then read each declaration, rather than
  // sweeping one regex across the whole sheet. A single pattern that has to
  // find `--name: value` at every offset is polynomial on adversarial input
  // (CodeQL js/polynomial-redos); splitting bounds the work per chunk, and
  // `lastIndexOf` plus an anchored test does the rest without backtracking.
  //
  // The name is taken from the END of the text before the colon, not the whole
  // of it: a chunk routinely opens with the tail of the previous line, as in
  // `/* 12px */\n  --bn-font-family`, and `@basenative/components`' own token
  // sheet is written that way throughout.
  for (const chunk of css.split(/[;{}]/)) {
    const colon = chunk.indexOf(':');
    if (colon === -1) continue;
    const head = chunk.slice(0, colon);
    const start = head.lastIndexOf('--');
    if (start === -1) continue;
    const name = head.slice(start).trim();
    const value = chunk.slice(colon + 1).trim();
    if (PROP_NAME.test(name) && value !== '') out.set(name, value);
  }
  return out;
}

/**
 * Follows `var(--a)` chains until a literal `#rrggbb` is reached. Throws on a
 * dangling reference, a cycle, or a non-hex terminal, so a typo in the token
 * layer is a test failure rather than a silently-transparent colour in
 * production.
 *
 * A `var(--a, #fallback)` is followed to `--a` when `--a` exists and falls back
 * to the literal when it does not — the same order a browser resolves in.
 *
 * @param {string} name
 * @param {Map<string, string>} props
 * @param {ReadonlySet<string>} [seen]
 * @returns {string} an uppercase `#RRGGBB`
 */
export function resolveColor(name, props, seen = new Set()) {
  if (seen.has(name)) {
    throw new Error(`Cyclic custom property reference at ${name}`);
  }
  const raw = props.get(name);
  if (raw === undefined) {
    throw new Error(`Unknown custom property ${name}`);
  }
  // Split the call on its first comma by hand rather than with one pattern
  // carrying `\s*` on both sides of an ambiguous name — that combination is
  // what CodeQL flags as polynomial. `VAR_CALL` is anchored and its body is a
  // negated class, so this is a single pass.
  const varMatch = VAR_CALL.exec(raw);
  if (varMatch) {
    const inner = varMatch[1];
    const comma = inner.indexOf(',');
    const alias = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();
    if (!PROP_NAME.test(alias)) {
      throw new Error(`${name} is not a plain hex colour (got "${raw}")`);
    }
    if (props.has(alias)) {
      return resolveColor(alias, props, new Set([...seen, name]));
    }
    if (fallback !== undefined && /^#[0-9a-f]{6}$/i.test(fallback.trim())) {
      return fallback.trim().toUpperCase();
    }
    throw new Error(`Unknown custom property ${alias} (referenced by ${name})`);
  }
  if (!/^#[0-9a-f]{6}$/i.test(raw)) {
    throw new Error(`${name} is not a plain hex colour (got "${raw}")`);
  }
  return raw.toUpperCase();
}

/**
 * The sRGB transfer function, per WCAG 2.x relative luminance.
 *
 * @param {number} value 0-255
 * @returns {number}
 */
function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * WCAG relative luminance of a `#rrggbb` colour.
 *
 * @param {string} hex
 * @returns {number} 0 (black) to 1 (white)
 */
export function relativeLuminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`relativeLuminance expects #rrggbb, got "${hex}"`);
  }
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG contrast ratio between two `#rrggbb` colours, 1 to 21. Order-independent.
 *
 * @param {string} foreground
 * @param {string} background
 * @returns {number}
 */
export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
