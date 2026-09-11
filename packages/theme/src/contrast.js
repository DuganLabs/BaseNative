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
  const re = /(--[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/gi;
  let m;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    const value = m[2];
    if (name !== undefined && value !== undefined) out.set(name, value.trim());
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
  const varMatch = /^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]+))?\)$/i.exec(raw);
  if (varMatch) {
    const alias = varMatch[1];
    const fallback = varMatch[2];
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
