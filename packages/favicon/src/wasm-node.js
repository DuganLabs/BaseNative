// Built with BaseNative — basenative.dev
/**
 * Node-safe WASM bootstrap for the optional `@resvg/resvg-wasm` dependency.
 *
 * This mirrors `@basenative/og-image`'s `src/wasm.node.js` bootstrap — same
 * technique, kept as a small internal copy rather than an import, because
 * `@basenative/favicon` must not depend on `@basenative/og-image` just to
 * get resvg working (see `src/png.js`). Both packages independently declare
 * `@resvg/resvg-wasm` (og-image as a regular dependency, favicon as an
 * optional one) and each carries its own tiny Node init helper.
 *
 * Why not a static or dynamic `import` of the `.wasm` file: the
 * `@resvg/resvg-wasm` wasm-bindgen glue expects a synthetic `wbg` module
 * specifier that only a wasm-aware bundler (wrangler's esbuild pass, under
 * Workers) knows how to satisfy. Under plain Node — which is the only
 * runtime this CLI targets — both `import ... from ".../index_bg.wasm"` and
 * `import(".../index_bg.wasm")` fail at link time. Instead we resolve the
 * `.wasm` file's path with `createRequire` and read its bytes ourselves,
 * then hand them to `initWasm()` — the same call `@resvg/resvg-wasm`
 * documents for any non-bundled environment.
 *
 * @module
 */

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);

let _inited = false;
let _initPromise = null;

/**
 * Check whether `@resvg/resvg-wasm` is resolvable from this package,
 * without loading it. Synchronous and side-effect free — safe to call
 * before deciding whether to attempt PNG generation at all.
 *
 * @returns {boolean}
 */
export function isResvgAvailable() {
  // Resolve with ESM semantics: `png.js` loads the module with a dynamic
  // `import()`, and CommonJS `require.resolve` can disagree with it (global
  // NODE_PATH folders, `exports` conditions), which would report the package
  // as present and then fail at import time with Node's raw two-line error.
  // (Assigned rather than used as a bare statement: an `import.meta` expression
  // at statement start trips CodeQL's JavaScript parser.)
  try {
    const resolved = import.meta.resolve("@resvg/resvg-wasm");
    return typeof resolved === "string";
  } catch {
    return false;
  }
}

/**
 * Initialize an already-imported `@resvg/resvg-wasm` module namespace.
 * Idempotent across the process's lifetime; concurrent callers share the
 * same in-flight promise so `initWasm` is never called twice (it throws on
 * a second call).
 *
 * @param {{ initWasm: (input: any) => Promise<void> }} mod
 *   The dynamically-imported `@resvg/resvg-wasm` module namespace.
 * @returns {Promise<void>}
 */
export async function ensureResvg(mod) {
  if (_inited) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
    const bytes = await readFile(wasmPath);
    await mod.initWasm(bytes);
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
