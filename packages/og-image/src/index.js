// Built with BaseNative — basenative.dev
/**
 * `@basenative/og-image` — runtime OG / social share PNG renderer.
 *
 * **This entry point is runtime-agnostic.** It imports no layout engine and no
 * text shaper: a card is an SVG string, and `@resvg/resvg-wasm` — one static
 * `.wasm`, which does its own shaping — turns it into a PNG. That is what makes
 * it run on Cloudflare Workers, where the previous satori-based pipeline could
 * not (see `runtime.js` for the two measured failures, and the README).
 *
 * The satori pipeline still exists, unchanged, behind a separate entry point:
 *
 * ```js
 * import { renderPng } from "@basenative/og-image/satori";  // Node/Deno/Bun
 * ```
 *
 * It is a *separate* entry point rather than a lazy import so that a Workers
 * bundle importing this file cannot contain `satori`, `yoga-layout` or
 * `harfbuzzjs` even transitively — a bundler resolves what it can see, and the
 * only reliable way to keep those out of a bundle is for this module graph not
 * to mention them.
 *
 * Public API:
 *  - {@link renderCard} — the common case: card options in, PNG bytes out.
 *  - {@link renderSvg} — rasterize any SVG string you built yourself.
 *  - {@link pngHeaders} — content-type + cache headers helper.
 *  - {@link brandCard}, and the `svg`/`text` primitives, for custom scenes.
 *  - {@link provideResvgWasm} — hand in a `WebAssembly.Module` explicitly.
 *  - {@link defineFonts} — font source, format and caching.
 *  - {@link detectRuntime} — the environment check, exported because getting
 *    it wrong is what caused all of this.
 *
 * @module
 */

import { Resvg } from "@resvg/resvg-wasm";

import { brandCard, OG_SIZE } from "./cards.js";
import { defineFonts, loadFontBuffers } from "./fonts.js";
import { ensureResvg } from "./wasm.js";

export { OgImageError } from "./errors.js";
export { detectRuntime, isWorkerd, hasFilesystem, canCompileWasmFromBytes } from "./runtime.js";
export { provideResvgWasm, ensureResvg, isResvgInited } from "./wasm.js";
export { defineFonts, loadFontBuffers, loadFonts, fontUrl, fontCacheKey } from "./fonts.js";
export { brandCard, OG_SIZE } from "./cards.js";
export {
  escapeXml,
  num,
  rect,
  textLine,
  textBlock,
  headline,
  clippedLine,
  svgDoc,
} from "./svg.js";
export {
  graphemes,
  estimateWidth,
  isRtl,
  hasWordCharacter,
  truncateGraphemes,
  truncateToWidth,
  wrapToLines,
  fitText,
} from "./text.js";

// The satori scene DSL and presets are pure data builders — no satori import —
// so they stay reachable from here for callers still feeding
// `@basenative/og-image/satori`'s `renderPng`.
export { box, text, tile, tileGrid, parseGrid, theme, defaultTheme, el } from "./scene.js";
export { defaultPreset, articlePreset, scoreCardPreset, presets } from "./presets.js";

/** @typedef {import("./fonts.js").FontConfig} FontConfig */

/** @typedef {{
 *   width?: number,
 *   fonts?: FontConfig,
 *   cacheKeyPrefix?: string,
 * }} RenderOptions */

/**
 * Rasterize an SVG document to PNG bytes.
 *
 * Concurrency: font loading and WASM init are deduped by module-scoped guards
 * (`fonts.js`, `wasm.js`), so concurrent requests on a cold isolate do the work
 * once; warm isolates skip both.
 *
 * @param {string} svg An SVG document — e.g. from {@link brandCard}.
 * @param {Record<string, any>} [env]
 *   Worker env binding map. If it carries a KV namespace under the configured
 *   `cacheBinding` (default `OG_CACHE`), font files are cached there.
 * @param {RenderOptions} [opts]
 *   `width` rasterizes to that pixel width — the SVG's own `viewBox` still
 *   governs the layout, so this scales rather than re-flows.
 * @returns {Promise<Uint8Array>} PNG bytes.
 */
export async function renderSvg(svg, env = {}, opts = {}) {
  const width = opts.width ?? OG_SIZE.width;

  /** @type {FontConfig} */
  const fontInput = { ...(opts.fonts || {}) };
  if (opts.cacheKeyPrefix) fontInput.cacheKeyPrefix = opts.cacheKeyPrefix;
  // `ttf` by default: the rasterizer's font parser cannot read WOFF, and fails
  // by drawing nothing rather than by throwing. See `fonts.js`.
  const fontCfg = defineFonts(fontInput, "ttf");

  const [fontBuffers] = await Promise.all([loadFontBuffers(env, fontCfg), ensureResvg()]);

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontBuffers,
      // There are no system fonts on a Worker, and depending on them under
      // Node would make renders differ between a laptop and CI.
      loadSystemFonts: false,
      defaultFontFamily: fontCfg.family,
    },
  });
  const image = resvg.render();
  try {
    return image.asPng();
  } finally {
    // Both hold WASM-heap allocations. A warm isolate serves many requests;
    // not releasing them grows the heap until the isolate is evicted.
    image.free();
    resvg.free();
  }
}

/**
 * Build a brand card and rasterize it — the common case, in one call.
 *
 * @param {Parameters<typeof brandCard>[0]} card
 * @param {Record<string, any>} [env]
 * @param {RenderOptions} [opts]
 * @returns {Promise<Uint8Array>} PNG bytes.
 */
export async function renderCard(card, env = {}, opts = {}) {
  return renderSvg(brandCard(card), env, { width: card.width ?? OG_SIZE.width, ...opts });
}

/**
 * Standard headers for an OG PNG response.
 *
 * `immutable` is the default because the intended addressing scheme for these
 * is content-addressed — a URL that contains a hash of the card's own text, so
 * changing the text changes the URL. If your URL is *not* content-addressed,
 * pass `immutable: false`; otherwise a renamed entity keeps its old card in
 * every crawler's cache for a year.
 *
 * @param {{ immutable?: boolean, maxAge?: number }} [opts]
 * @returns {Record<string, string>}
 */
export function pngHeaders(opts = {}) {
  const immutable = opts.immutable ?? true;
  const maxAge = opts.maxAge ?? (immutable ? 31536000 : 300);
  return {
    "Content-Type": "image/png",
    "Cache-Control": immutable
      ? `public, max-age=${maxAge}, s-maxage=${maxAge}, immutable`
      : `public, max-age=${maxAge}, s-maxage=${maxAge}`,
  };
}
