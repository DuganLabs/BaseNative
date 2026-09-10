// Built with BaseNative — basenative.dev
/**
 * Optional PNG rasterizer for cases where consumers need raster output —
 * iOS home-screen icons (`apple-touch-icon.png`, 180×180) and the
 * maskable / Android adaptive icons (`maskable.png`, 512×512).
 *
 * This module deliberately defers loading `@resvg/resvg-wasm` until call
 * time so the SVG-only happy path stays dependency-free. `@resvg/resvg-wasm`
 * is declared as an `optionalDependency` of this package (same version
 * `@basenative/og-image` uses) — not pulled in transitively through
 * og-image, which this package must not depend on. If it's genuinely not
 * installed, the call throws one clear error naming it and how to install
 * it, instead of silently skipping.
 *
 * @module
 */

import { isResvgAvailable, ensureResvg } from "./wasm-node.js";

let _resvgInit = null;

/**
 * Resolve the Resvg constructor, initializing the WASM module on first
 * call. Memoized for the life of the process.
 *
 * @returns {Promise<{ Resvg: any }>}
 */
async function loadResvg() {
  if (_resvgInit) return _resvgInit;
  _resvgInit = (async () => {
    if (!isResvgAvailable()) {
      throw new Error(
        'PNG generation skipped — optional dependency "@resvg/resvg-wasm" is not installed. ' +
          "Install it with: pnpm add -D @resvg/resvg-wasm",
      );
    }
    const mod = await import("@resvg/resvg-wasm");
    await ensureResvg(mod);
    return { Resvg: mod.Resvg };
  })();
  return _resvgInit;
}

/**
 * Rasterize an SVG string to PNG bytes at the requested square size.
 *
 * Common sizes:
 *   - 180  → `apple-touch-icon.png`
 *   - 192  → `icon-192.png`     (Android Chrome)
 *   - 512  → `icon-512.png` / `maskable.png`
 *
 * @param {string} svg
 * @param {number} [size]  Output edge length in pixels (default 512).
 * @returns {Promise<Uint8Array>}  PNG byte buffer.
 */
export async function toPng(svg, size = 512) {
  const { Resvg } = await loadResvg();
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  return resvg.render().asPng();
}

/**
 * Convenience: rasterize the canonical icon set in one call. Returns a map
 * of filename → PNG bytes ready to write under `public/`.
 *
 * @param {{ favicon: string, maskable: string }} svgs
 * @returns {Promise<Record<string, Uint8Array>>}
 */
export async function toIconSet({ favicon, maskable }) {
  const out = {};
  out["apple-touch-icon.png"] = await toPng(favicon, 180);
  out["icon-192.png"] = await toPng(favicon, 192);
  out["icon-512.png"] = await toPng(favicon, 512);
  out["maskable.png"] = await toPng(maskable, 512);
  return out;
}
