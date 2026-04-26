// Built with BaseNative — basenative.dev
/**
 * Optional PNG rasterizer for cases where consumers need raster output —
 * iOS home-screen icons (`apple-touch-icon.png`, 180×180) and the
 * maskable / Android adaptive icons (`maskable.png`, 512×512).
 *
 * This module deliberately defers loading `@resvg/resvg-wasm` until call
 * time so the SVG-only happy path stays dependency-free. We pull resvg in
 * via the optional peer `@basenative/og-image`, which already ships and
 * caches the wasm module; if that peer is not installed we fall back to a
 * direct `@resvg/resvg-wasm` import. If neither is available, the call
 * throws a clear error pointing the user at the install command.
 *
 * @module
 */

let _resvgInit = null;

/**
 * Resolve the Resvg constructor + wasm-init promise. Memoized per isolate.
 *
 * @returns {Promise<{ Resvg: any }>}
 */
async function loadResvg() {
  if (_resvgInit) return _resvgInit;
  _resvgInit = (async () => {
    let mod;
    try {
      mod = await import("@resvg/resvg-wasm");
    } catch (err) {
      throw new Error(
        "@basenative/favicon: PNG conversion requires `@resvg/resvg-wasm`, " +
          "shipped transitively via the optional peer `@basenative/og-image`. " +
          "Install with: pnpm add @basenative/og-image\n" +
          `Underlying error: ${err && /** @type {any} */ (err).message}`,
      );
    }
    // resvg-wasm needs initWasm() called once per isolate. The `@basenative/
    // og-image` package handles this via its own helper; if that's available
    // we reuse it so we don't re-fetch the wasm bytes.
    try {
      const og = await import("@basenative/og-image");
      if (typeof (/** @type {any} */ (og).ensureResvg) === "function") {
        await (/** @type {any} */ (og).ensureResvg)();
        return { Resvg: mod.Resvg };
      }
    } catch {
      // og-image isn't installed — fall through to direct init.
    }
    if (typeof mod.initWasm === "function") {
      // Direct init: pull bytes from the package's bundled wasm.
      const wasm = await import("@resvg/resvg-wasm/index_bg.wasm").catch(() => null);
      if (wasm && wasm.default) {
        await mod.initWasm(wasm.default);
      }
    }
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
