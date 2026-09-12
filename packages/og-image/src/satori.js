// Built with BaseNative — basenative.dev
/**
 * `@basenative/og-image/satori` — the satori render path.
 *
 * **This entry point does not work on Cloudflare Workers, and cannot be made
 * to.** It is kept, and kept separate, for Node/Deno/Bun callers who want
 * satori's flexbox layout rather than the SVG card scenes in the main entry.
 *
 * Why it is a separate module rather than a lazy `import()` in the main entry:
 * a bundler resolves every specifier it can see, dynamic ones included. As long
 * as the main entry's module graph *mentions* `satori`, wrangler pulls satori,
 * `yoga-layout` and `harfbuzzjs` into the Worker bundle, and the harfbuzz
 * emscripten preamble then fails at first use. The only reliable fix is for the
 * Workers-facing graph not to reference it at all.
 *
 * What the failures are, reproduced against real workerd (`wrangler dev`,
 * `compatibility_date` 2026-04-23, `nodejs_compat`):
 *
 *  1. `TypeError: Cannot read properties of undefined (reading 'href')` —
 *     harfbuzz's emscripten preamble takes the browser-worker branch, because
 *     workerd defines `WorkerGlobalScope`, and then reads `self.location.href`,
 *     because workerd defines no `location`.
 *  2. With `location` shimmed ahead of it: `ReferenceError: __dirname is not
 *     defined` — `nodejs_compat` gives workerd a `process.versions.node`, so the
 *     same preamble next decides it is Node and goes looking for `hb.wasm` on a
 *     filesystem that does not exist. wrangler does not bundle that file, and
 *     the remaining branch compiles WASM from a buffer, which the embedder
 *     refuses outright (`Wasm code generation disallowed by embedder`).
 *
 * Fixing (2) needs `harfbuzzjs`'s entry to accept emscripten's
 * `Module.instantiateWasm` hook so a statically imported `.wasm` can be handed
 * in. `hb.js` honours the hook; `harfbuzzjs`'s `index.js` calls `hb()` with no
 * arguments, so nothing downstream — this package included — can supply it. That
 * is an upstream change in a third-party package, not one available here.
 *
 * `satori` is an **optional peer dependency**: install it yourself if you use
 * this entry point.
 *
 * @module
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-wasm";

import { OgImageError } from "./errors.js";
import { defineFonts, loadFonts } from "./fonts.js";
import { detectRuntime } from "./runtime.js";
import { ensureResvg } from "./wasm.js";
import { OG_SIZE } from "./cards.js";

export { defaultPreset, articlePreset, scoreCardPreset, presets } from "./presets.js";
export { box, text, tile, tileGrid, parseGrid, theme, defaultTheme, el } from "./scene.js";
export { pngHeaders } from "./index.js";

/** @typedef {import("./fonts.js").FontConfig} FontConfig */

/** @typedef {{
 *   width?: number,
 *   height?: number,
 *   fonts?: FontConfig,
 *   cacheKeyPrefix?: string,
 * }} RenderOptions */

/**
 * Render a satori-compatible scene (a vh-tree, e.g. from `defaultPreset`) to
 * PNG bytes.
 *
 * Throws `OgImageError` with code `satori-unsupported-on-this-runtime` on
 * Cloudflare Workers, before satori is asked to do anything — so the failure
 * names itself and points at the alternative, instead of surfacing as a
 * `TypeError` about `href` from inside a transitive dependency.
 *
 * @param {any} scene
 * @param {Record<string, any>} [env]
 * @param {RenderOptions} [opts]
 * @returns {Promise<Uint8Array>} PNG bytes.
 */
export async function renderPng(scene, env = {}, opts = {}) {
  const runtime = detectRuntime();
  if (runtime === "workerd") {
    throw new OgImageError(
      "satori-unsupported-on-this-runtime",
      "@basenative/og-image/satori cannot run on Cloudflare Workers: satori loads " +
        "harfbuzzjs, whose emscripten loader needs either a filesystem or runtime WASM " +
        "compilation, and workerd provides neither. Use renderCard()/renderSvg() from " +
        "'@basenative/og-image' instead — same output size, no layout engine.",
    );
  }

  const width = opts.width ?? OG_SIZE.width;
  const height = opts.height ?? OG_SIZE.height;

  /** @type {FontConfig} */
  const fontInput = { ...(opts.fonts || {}) };
  if (opts.cacheKeyPrefix) fontInput.cacheKeyPrefix = opts.cacheKeyPrefix;
  // satori decompresses WOFF itself, so this path keeps the smaller files.
  const fontCfg = defineFonts(fontInput, "woff");

  const [fonts] = await Promise.all([loadFonts(env, fontCfg), ensureResvg()]);
  const svg = await satori(scene, { width, height, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  const image = resvg.render();
  try {
    return image.asPng();
  } finally {
    image.free();
    resvg.free();
  }
}
