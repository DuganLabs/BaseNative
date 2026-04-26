// Built with BaseNative — basenative.dev
/**
 * `@basenative/og-image` — runtime OG / social share PNG renderer for
 * Cloudflare Workers and Pages Functions.
 *
 * Public API:
 *  - {@link renderPng} — render a satori vh-tree to PNG bytes.
 *  - {@link pngHeaders} — content-type + cache headers helper.
 *  - {@link defineFonts} — opt-in font loader configuration.
 *  - Scene helpers re-exported from `./scene` — `box`, `text`, `tile`, `theme`.
 *  - Presets re-exported from `./presets` — `defaultPreset`, `articlePreset`,
 *    `scoreCardPreset`.
 *
 * @module
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-wasm";

import { ensureResvg } from "./wasm.js";
import { defineFonts, loadFonts } from "./fonts.js";

export { defineFonts } from "./fonts.js";
export {
  box,
  text,
  tile,
  tileGrid,
  parseGrid,
  theme,
  defaultTheme,
  el,
} from "./scene.js";
export {
  defaultPreset,
  articlePreset,
  scoreCardPreset,
  presets,
} from "./presets.js";

/** @typedef {import("./fonts.js").FontConfig} FontConfig */

/** @typedef {{
 *   width?: number,
 *   height?: number,
 *   fonts?: FontConfig,
 *   cacheKeyPrefix?: string,
 * }} RenderOptions */

// Module-scoped resolved font config so we don't re-allocate the defaults
// on every request when the caller passes nothing.
const _defaultFontCfg = defineFonts();

/**
 * Render a satori-compatible scene to PNG bytes.
 *
 * Concurrency model: font + wasm init are deduped via module-scoped guards
 * in `./fonts.js` and `./wasm.js`. Warm isolates skip both entirely.
 *
 * @param {import("./scene.js").VNode} scene
 *   The scene tree (e.g. output of `defaultPreset(...)` or hand-built via
 *   the scene helpers).
 * @param {Record<string, any>} env
 *   Worker env binding map. Should contain a KV namespace bound to the
 *   name configured in `defineFonts({ cacheBinding })` — defaults to
 *   `OG_CACHE`.
 * @param {RenderOptions} [opts]
 * @returns {Promise<Uint8Array>} PNG byte buffer.
 */
export async function renderPng(scene, env, opts = {}) {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 630;

  // Resolve font config; allow per-call override of the cache key prefix.
  let fontCfg = opts.fonts ? defineFonts(opts.fonts) : _defaultFontCfg;
  if (opts.cacheKeyPrefix && opts.cacheKeyPrefix !== fontCfg.cacheKeyPrefix) {
    fontCfg = { ...fontCfg, cacheKeyPrefix: opts.cacheKeyPrefix };
  }

  const [fonts] = await Promise.all([loadFonts(env, fontCfg), ensureResvg()]);
  const svg = await satori(scene, { width, height, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

/**
 * Standard headers for an OG PNG response. By default the response is
 * marked immutable (one-year cache) — flip `immutable: false` for short-
 * lived previews.
 *
 * @param {{ immutable?: boolean }} [opts]
 * @returns {Record<string, string>}
 */
export function pngHeaders(opts = {}) {
  const immutable = opts.immutable ?? true;
  return {
    "Content-Type": "image/png",
    "Cache-Control": immutable
      ? "public, max-age=31536000, s-maxage=31536000, immutable"
      : "public, max-age=300, s-maxage=300",
  };
}
