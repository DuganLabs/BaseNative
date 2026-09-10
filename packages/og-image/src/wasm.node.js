// Built with BaseNative — basenative.dev
/**
 * Node-safe WASM bootstrap for `@resvg/resvg-wasm` — the default/Node variant.
 *
 * `@resvg/resvg-wasm/index_bg.wasm`'s wasm-bindgen glue imports a synthetic
 * `wbg` module specifier that only a wasm-aware bundler (wrangler's esbuild
 * pass, in Workers) knows how to satisfy — a static `import ... from
 * "*.wasm"` of it fails at link time under plain Node, even with
 * `--experimental-wasm-modules`. So here we resolve the `.wasm` file's path
 * with `createRequire` (works from an ESM module without needing import
 * assertions or a loader), read its bytes with `fs/promises`, and hand them
 * to `initWasm()` ourselves — the same call `@resvg/resvg-wasm` documents
 * for any non-bundled environment.
 *
 * Selection: `src/index.js` imports the bootstrap via the internal
 * `#wasm-init` subpath (see this package's `package.json` `imports` map).
 * This file is the `"default"` condition target, so plain Node — including
 * `node --test` — lands here. Workers land in `./wasm.workerd.js` instead,
 * via the `workerd`/`browser` conditions. Keep both files' exports in
 * lockstep.
 *
 * The module-scoped `_inited` flag mirrors the Workers variant: a single
 * process/isolate only ever calls `initWasm` once.
 *
 * @module
 */

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

import { initWasm } from "@resvg/resvg-wasm";

const require = createRequire(import.meta.url);

let _inited = false;
let _initPromise = null;

/**
 * Initialize the resvg WASM module. Idempotent across the process's lifetime.
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
    const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
    const bytes = await readFile(wasmPath);
    await initWasm(bytes);
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
