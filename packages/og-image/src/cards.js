// Built with BaseNative — basenative.dev
/**
 * Card scenes: SVG documents, ready for `renderSvg`.
 *
 * These are the runtime-agnostic replacement for the satori presets in
 * `presets.js`. A card is a string of SVG, produced by arithmetic over strings
 * — so it can be snapshot-tested, diffed, and rendered on any runtime the
 * rasterizer reaches, including Cloudflare Workers.
 *
 * **Font coverage is the caller's responsibility, and it is a real limit.** The
 * rasterizer draws only glyphs present in the font buffers it is given. The
 * default loader supplies a Latin-covering variable Inter; a title in CJK,
 * Devanagari or emoji will therefore measure correctly and lay out correctly
 * and then draw *nothing* for those runs. `brandCard` protects against the worst
 * consequence of that — a card with no identifying text at all — by always
 * drawing the `brand` line, which callers should set to something ASCII they
 * control (a hostname). If you need broader coverage, pass the extra faces via
 * `defineFonts({ buffers })` or `urls`.
 *
 * @module
 */

import { clippedLine, headline, num, rect, svgDoc, textLine } from "./svg.js";
import { estimateWidth, hasWordCharacter } from "./text.js";
import { defaultTheme } from "./scene.js";

/** @typedef {import("./scene.js").Theme} Theme */

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

/**
 * 1200x630 is the size every consumer of Open Graph agrees on: it is above
 * Facebook's 600x315 minimum, exactly the 1.91:1 ratio its documentation asks
 * for, and inside the 2:1..1:1 window X requires for `summary_large_image`.
 * LinkedIn and Slack unfurl it without re-cropping. Change it only with a
 * reason for the specific platform you are targeting.
 */
export const OG_SIZE = Object.freeze({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

/**
 * Resolve theme tokens onto the defaults.
 *
 * @param {Partial<Theme>} [t]
 * @returns {Required<Theme>}
 */
function resolveTheme(t) {
  return { ...defaultTheme, ...(t || {}) };
}

/**
 * The generic brand / entity card: a name, a qualifying line beneath it, and a
 * brand line pinned to the bottom.
 *
 * Every text run is fitted to a width budget and the vertical stack is fitted
 * to the space between the top padding and the brand line, so no input can push
 * a run off the canvas or over another run. Concretely, all of these produce a
 * valid card:
 *
 *  - `title: ""` — the title is simply absent; subtitle and brand still draw.
 *  - `title` of 200 characters — shrinks and wraps, up to three lines, then
 *    ellipsises.
 *  - `title: "🌿"` — no word character, so `titleFallback` is used if given
 *    (and if it is not, the card still carries the brand line).
 *  - RTL script — base direction is set from the content.
 *
 * @param {{
 *   title: string,
 *   titleFallback?: string,
 *   subtitle?: string,
 *   badge?: string,
 *   brand?: string,
 *   theme?: Partial<Theme>,
 *   width?: number,
 *   height?: number,
 *   fontFamily?: string,
 * }} opts
 * @returns {string} An SVG document.
 */
export function brandCard(opts) {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const t = resolveTheme(opts.theme);
  const family = opts.fontFamily || "Inter";

  const pad = Math.round(width / 15); // 80 at 1200
  const contentWidth = width - pad * 2;

  const rawTitle = String(opts.title ?? "").trim();
  // A name made only of emoji or punctuation cannot be drawn by a Latin font
  // and cannot be read aloud; prefer the caller's fallback identifier over a
  // blank space where the business name should be.
  const title = hasWordCharacter(rawTitle) ? rawTitle : String(opts.titleFallback ?? "").trim();
  const subtitle = String(opts.subtitle ?? "").trim();
  const badge = String(opts.badge ?? "").trim();
  const brand = String(opts.brand ?? "").trim();

  /** @type {string[]} */
  const parts = [];
  parts.push(rect({ x: 0, y: 0, width, height, fill: t.bg }));

  // Accent rule at the top-left — a fixed mark so an otherwise text-only card
  // still reads as designed rather than as a rendering accident.
  const ruleW = Math.round(width * 0.06);
  const ruleH = Math.max(6, Math.round(height * 0.014));
  parts.push(rect({ x: pad, y: pad, width: ruleW, height: ruleH, fill: t.accent, rx: ruleH / 2 }));

  let y = pad + ruleH + Math.round(height * 0.055);

  const badgeSize = Math.round(height * 0.043); // 27 at 630
  const badgeTracking = badgeSize * 0.16;
  if (badge) {
    parts.push(
      clippedLine({
        x: pad,
        y,
        text: badge.toLocaleUpperCase(),
        maxWidth: contentWidth,
        fontSize: badgeSize,
        fill: t.muted,
        fontFamily: family,
        weight: 600,
        tracking: badgeTracking,
      }),
    );
    y += Math.round(badgeSize * 1.9);
  }

  // Brand line is pinned to the bottom; everything above has to fit what is
  // left, so compute its box before laying the title out.
  const brandSize = Math.round(height * 0.048); // 30 at 630
  const brandTop = height - pad - brandSize;
  const dividerY = brandTop - Math.round(height * 0.045);
  const available = dividerY - Math.round(height * 0.03) - y;

  const titleSize = Math.round(height * 0.146); // 92 at 630
  const titleMin = Math.round(height * 0.068); // 43 at 630
  const subSize = Math.round(height * 0.063); // 40 at 630
  const subMin = Math.round(height * 0.044); // 28 at 630

  /** @type {{ svg: string, height: number } | null} */
  let titleBlock = null;
  /** @type {{ svg: string, height: number } | null} */
  let subBlock = null;

  // Resolve the vertical stack by trying progressively tighter line budgets.
  // Width always fits — `headline` shrinks for that — so this loop only has to
  // settle height.
  for (const [titleLines, subLines] of [
    [3, 2],
    [2, 2],
    [2, 1],
    [1, 1],
  ]) {
    const th = title
      ? headline({
          x: pad,
          y,
          text: title,
          maxWidth: contentWidth,
          fontSize: titleSize,
          minFontSize: titleMin,
          maxLines: titleLines,
          lineHeight: 1.08,
          fill: t.fg,
          fontFamily: family,
          weight: 800,
          tracking: -titleSize * 0.02,
        })
      : { svg: "", height: 0 };
    const gap = title && subtitle ? Math.round(height * 0.035) : 0;
    const sh = subtitle
      ? headline({
          x: pad,
          y: y + th.height + gap,
          text: subtitle,
          maxWidth: contentWidth,
          fontSize: subSize,
          minFontSize: subMin,
          maxLines: subLines,
          lineHeight: 1.2,
          fill: t.muted,
          fontFamily: family,
          weight: 600,
        })
      : { svg: "", height: 0 };
    titleBlock = th;
    subBlock = sh;
    if (th.height + gap + sh.height <= available) break;
  }

  if (titleBlock) parts.push(titleBlock.svg);
  if (subBlock) parts.push(subBlock.svg);

  if (brand) {
    parts.push(
      rect({
        x: pad,
        y: dividerY,
        width: contentWidth,
        height: Math.max(1, Math.round(height * 0.0024)),
        fill: t.accent,
        rx: 1,
      }),
    );
    parts.push(
      clippedLine({
        x: pad,
        y: brandTop,
        text: brand,
        maxWidth: contentWidth,
        fontSize: brandSize,
        fill: t.accent,
        fontFamily: family,
        weight: 600,
      }),
    );
  }

  return svgDoc({ width, height, children: parts.join("") });
}

export { estimateWidth, num, rect, svgDoc, textLine, headline, clippedLine };
