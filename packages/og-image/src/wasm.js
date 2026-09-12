// Built with BaseNative — basenative.dev
/**
 * The rasterizer's WASM bootstrap.
 *
 * This file owns the single `initWasm()` call and the init guard. *Where the
 * module comes from* is the only part that varies by runtime, and it is behind
 * the internal `#wasm-init` subpath (`./wasm.workerd.js` / `./wasm.node.js`).
 * Keeping the guard here rather than duplicated in each variant means the two
 * cannot drift, and it makes room for the third source that matters:
 *
 * **`provideResvgWasm()` — the supported way to hand this package a
 * `WebAssembly.Module` from outside.** Cloudflare Workers refuse to compile
 * WASM from a buffer at runtime (measured on workerd: `new
 * WebAssembly.Module(bytes)` → `Wasm code generation disallowed by embedder`),
 * so the module must be produced ahead of time by the bundler from a static
 * `import ... from "*.wasm"`. `./wasm.workerd.js` does exactly that and covers
 * wrangler. But a host application on a different bundler, a different edge
 * runtime, or one that wants to share a single compiled module across several
 * libraries has no way to reach inside a package's import map. Now it does:
 *
 * ```js
 * import wasm from "@resvg/resvg-wasm/index_bg.wasm";     // your bundler
 * import { provideResvgWasm } from "@basenative/og-image";
 * provideResvgWasm(wasm);                                  // before first render
 * ```
 *
 * Call it at module scope, not per request. Whatever is provided wins over the
 * `#wasm-init` variant, which is then never consulted.
 *
 * @module
 */

import { initWasm } from "@resvg/resvg-wasm";

import { loadResvgWasmSource } from "#wasm-init";
import { OgImageError } from "./errors.js";

/** @typedef {WebAssembly.Module | ArrayBuffer | ArrayBufferView | Response} ResvgWasmSource */

/** @type {ResvgWasmSource | Promise<ResvgWasmSource> | null} */
let _provided = null;
let _inited = false;
/** @type {Promise<void> | null} */
let _initPromise = null;

/**
 * Supply the compiled resvg WASM module (or its bytes) explicitly.
 *
 * Idempotent-ish: calling it again before the first render replaces the source;
 * calling it after initialization has completed is a no-op, because the
 * rasterizer can only be initialized once per isolate.
 *
 * @param {ResvgWasmSource | Promise<ResvgWasmSource>} source
 *   A `WebAssembly.Module` (what a static `.wasm` import yields under
 *   wrangler/esbuild), raw bytes, a `Response`, or a promise for any of those.
 * @returns {void}
 */
export function provideResvgWasm(source) {
  if (source == null) {
    throw new OgImageError(
      "wasm-source-invalid",
      "provideResvgWasm() needs a WebAssembly.Module, bytes, or a Response — got " + String(source),
    );
  }
  const ok =
    typeof source === "object" &&
    (source instanceof WebAssembly.Module ||
      source instanceof ArrayBuffer ||
      ArrayBuffer.isView(source) ||
      typeof (/** @type {any} */ (source).then) === "function" ||
      typeof (/** @type {any} */ (source).arrayBuffer) === "function");
  if (!ok) {
    throw new OgImageError(
      "wasm-source-invalid",
      "provideResvgWasm() needs a WebAssembly.Module, bytes, a Response, or a promise for one; " +
        `got ${typeof source}`,
    );
  }
  _provided = source;
}

/**
 * Initialize the rasterizer. Idempotent for the life of the isolate/process;
 * concurrent callers share one in-flight promise, because `initWasm` throws if
 * it is called twice.
 *
 * @returns {Promise<void>}
 */
export async function ensureResvg() {
  if (_inited) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    let source = _provided;
    if (source == null) {
      try {
        source = await loadResvgWasmSource();
      } catch (cause) {
        throw new OgImageError(
          "wasm-source-unavailable",
          "Could not obtain the resvg WASM module for this runtime. Hand one in with " +
            "provideResvgWasm() — see @basenative/og-image README, 'Supplying the WASM module'.",
          { cause },
        );
      }
    }
    await initWasm(await source);
    _inited = true;
    _initPromise = null;
  })();
  try {
    return await _initPromise;
  } catch (err) {
    // Leave the isolate able to retry rather than wedged on a rejected promise.
    _initPromise = null;
    throw err;
  }
}

/**
 * Whether the rasterizer has been initialized in this isolate.
 *
 * @returns {boolean}
 */
export function isResvgInited() {
  return _inited;
}

/**
 * Test hook: forget the init state and any provided source. Not part of the
 * supported API — the underlying `initWasm` cannot actually be undone, so this
 * only resets this module's bookkeeping.
 *
 * @returns {void}
 */
export function _resetWasmForTest() {
  _inited = false;
  _initPromise = null;
  _provided = null;
}
