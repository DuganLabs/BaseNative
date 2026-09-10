// Built with BaseNative — basenative.dev
/**
 * Static WASM bootstrap for `@resvg/resvg-wasm` — the Workers/browser variant.
 *
 * Cloudflare Workers (and Pages Functions) require a static `import` of the
 * `.wasm` module so wrangler can bundle it as a `WebAssembly.Module` ahead
 * of time — dynamic instantiation from a buffer is disallowed by the
 * embedder. This file isolates that import + a single-init guard so the
 * rest of the package can stay platform-neutral.
 *
 * Selection: `src/index.js` imports the bootstrap via the internal
 * `#wasm-init` subpath (see this package's `package.json` `imports` map).
 * Bundlers that resolve with the `workerd` or `browser` condition — that's
 * wrangler's esbuild pass, which sets `conditions: ["workerd", "worker",
 * "browser"]` — land here. Everyone else (plain Node, `node --test`, etc.)
 * falls through to `./wasm.node.js`, which has no static `.wasm` import and
 * reads the module's bytes off disk at runtime instead. Keep both files'
 * exports in lockstep.
 *
 * The module-scoped `_inited` flag is intentional: warm isolates reuse the
 * already-initialized resvg instance across requests, which is what gives
 * us ~10ms warm renders.
 *
 * @module
 */

import { initWasm } from "@resvg/resvg-wasm";
// Static WASM import — wrangler bundles this as a WebAssembly.Module.
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

let _inited = false;
let _initPromise = null;

/**
 * Initialize the resvg WASM module. Idempotent across an isolate's lifetime.
 *
 * Concurrent callers receive the same in-flight promise so we never call
 * `initWasm` twice (which throws).
 *
 * @returns {Promise<void>}
 */
export async function ensureResvg() {
  if (_inited) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    await initWasm(resvgWasm);
    _inited = true;
    _initPromise = null;
  })();
  return _initPromise;
}

/**
 * Test hook: reset the init guard. Not part of the public API.
 *
 * @returns {void}
 */
export function _resetWasmForTest() {
  _inited = false;
  _initPromise = null;
}

/**
 * Inspect the init state. Useful for diagnostics.
 *
 * @returns {boolean}
 */
export function isResvgInited() {
  return _inited;
}
