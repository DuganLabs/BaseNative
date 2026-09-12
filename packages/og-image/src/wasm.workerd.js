// Built with BaseNative — basenative.dev
/**
 * Where the resvg WASM module comes from under a Workers-shaped bundler.
 *
 * Cloudflare Workers refuse to compile WASM at runtime — measured on workerd,
 * `new WebAssembly.Module(bytes)` answers `Wasm code generation disallowed by
 * embedder` — so the module has to be produced ahead of time. A static
 * `import ... from "*.wasm"` is how wrangler's esbuild pass does that: the
 * import resolves to an already-compiled `WebAssembly.Module`.
 *
 * Selection: `./wasm.js` imports this through the internal `#wasm-init`
 * subpath, which resolves by condition (see this package's `package.json`
 * `imports` map). wrangler resolves with `["workerd", "worker", "browser"]`, so
 * it lands here; plain Node falls through to `./wasm.node.js`. This file
 * deliberately contains **no filesystem access and no `__dirname`** — neither
 * exists on a Worker, and a dependency that assumed otherwise is exactly what
 * made this package unusable there (see `runtime.js`).
 *
 * The init guard lives in `./wasm.js`, not here: both variants expose only
 * `loadResvgWasmSource`, so they cannot drift on lifecycle behaviour.
 *
 * @module
 */

// Static WASM import — the bundler compiles this to a WebAssembly.Module.
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

/**
 * The compiled resvg WASM module.
 *
 * @returns {Promise<WebAssembly.Module>}
 */
export async function loadResvgWasmSource() {
  return resvgWasm;
}
