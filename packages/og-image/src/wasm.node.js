// Built with BaseNative — basenative.dev
/**
 * Where the resvg WASM module comes from under plain Node.
 *
 * `@resvg/resvg-wasm/index_bg.wasm`'s wasm-bindgen glue imports a synthetic
 * `wbg` specifier that only a wasm-aware bundler knows how to satisfy, so a
 * static `import ... from "*.wasm"` of it fails at link time under Node even
 * with `--experimental-wasm-modules`. Node is also the one runtime here where
 * compiling WASM from bytes is allowed. So this variant resolves the file's URL
 * and reads it, and `./wasm.js` hands the bytes to `initWasm()` — the path
 * `@resvg/resvg-wasm` documents for any non-bundled environment.
 *
 * Selection: this is the `"default"` condition target of the internal
 * `#wasm-init` subpath, so plain Node — `node --test` included — lands here,
 * and workerd never does (it resolves `"workerd"`/`"browser"` to
 * `./wasm.workerd.js`). **This is the only file in the package that touches a
 * filesystem, and nothing reachable from the Workers entry imports it.**
 * `test/import-graph.test.js` asserts both of those over the real import graph
 * rather than trusting this comment.
 *
 * `import.meta.resolve` is preferred over `createRequire`: it is the standard
 * ESM resolver, needs no CommonJS shim, and — unlike anything built on
 * `__dirname` — has no meaning to fall back to on a runtime without a
 * filesystem, so it cannot silently half-work there. That distinction is the
 * whole reason this package was unusable on Workers for two releases.
 *
 * @module
 */

import { readFile } from "node:fs/promises";

const WASM_SPECIFIER = "@resvg/resvg-wasm/index_bg.wasm";

/**
 * Read the resvg WASM bytes off disk.
 *
 * @returns {Promise<Uint8Array>}
 */
export async function loadResvgWasmSource() {
  /** @type {string} */
  let url;
  if (typeof import.meta.resolve === "function") {
    url = import.meta.resolve(WASM_SPECIFIER);
  } else {
    // Node < 20.6 without --experimental-import-meta-resolve.
    const { createRequire } = await import("node:module");
    const { pathToFileURL } = await import("node:url");
    url = pathToFileURL(createRequire(import.meta.url).resolve(WASM_SPECIFIER)).href;
  }
  return new Uint8Array(await readFile(new URL(url)));
}
