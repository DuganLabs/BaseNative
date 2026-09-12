// Built with BaseNative — basenative.dev
/**
 * Runtime detection.
 *
 * This module exists because getting the *order* of these checks wrong is what
 * made this package unusable on Cloudflare Workers for two releases. The
 * failure was not in our code — it was in a transitive dependency
 * (`harfbuzzjs`, via `satori`) whose emscripten preamble asks two questions in
 * the wrong order — but the lesson is the same and it is encoded here so
 * nothing in this package repeats it.
 *
 * Measured on real workerd (`wrangler dev`, `compatibility_date` 2026-04-23,
 * `nodejs_compat`):
 *
 * ```json
 * { "navigator.userAgent": "Cloudflare-Workers", "typeof WorkerGlobalScope": "function",
 *   "self === globalThis": true, "typeof location": "undefined",
 *   "typeof document": "undefined", "process.versions.node": "22.19.0",
 *   "typeof Intl.Segmenter": "function", "typeof caches.default": "object" }
 * ```
 *
 * Two traps follow directly from that shape:
 *
 *  1. **`process.versions.node` does not mean Node.** With `nodejs_compat`,
 *     workerd reports a Node version. Code that sniffs it first concludes it
 *     may read the filesystem, and fails with `__dirname is not defined`.
 *  2. **`WorkerGlobalScope` / `self` does not mean browser.** workerd defines
 *     both and defines *no* `location`. Code that treats them as a browser
 *     signal reads `self.location.href` and fails with
 *     `Cannot read properties of undefined (reading 'href')`.
 *
 * So: check workerd BEFORE node, and workerd BEFORE browser. The distinguishing
 * signal for a real browser worker is that it *has* a `location`.
 *
 * @module
 */

/** @typedef {"workerd" | "node" | "deno" | "bun" | "browser" | "unknown"} RuntimeName */

/**
 * Identify the current JavaScript runtime.
 *
 * Pass a stand-in global for testing; defaults to the real `globalThis`.
 *
 * @param {any} [g] Global object to inspect.
 * @returns {RuntimeName}
 */
export function detectRuntime(g = globalThis) {
  if (!g || typeof g !== "object") return "unknown";

  // Deno and Bun both provide `process.versions.node` under their Node
  // compatibility layers, so they have to be asked before Node.
  if (g.Deno && g.Deno.version && g.Deno.version.deno) return "deno";
  if (g.Bun && g.Bun.version) return "bun";

  // workerd, before Node (it reports a Node version) and before browser (it
  // defines WorkerGlobalScope and self).
  const nav = g.navigator;
  if (nav && nav.userAgent === "Cloudflare-Workers") return "workerd";
  // Secondary fingerprint, in case the userAgent string ever changes: a worker
  // global scope with no `location` at all is not any browser — a real
  // DedicatedWorkerGlobalScope always has a WorkerLocation.
  if (typeof g.WorkerGlobalScope === "function" && typeof g.location === "undefined") {
    return "workerd";
  }

  if (typeof g.document !== "undefined" && typeof g.window !== "undefined") return "browser";
  // A real browser worker: WorkerGlobalScope *and* a location.
  if (typeof g.WorkerGlobalScope === "function" && typeof g.location !== "undefined") {
    return "browser";
  }

  if (g.process && g.process.versions && g.process.versions.node) return "node";

  return "unknown";
}

/**
 * True on Cloudflare Workers / Pages Functions.
 *
 * @param {any} [g]
 * @returns {boolean}
 */
export function isWorkerd(g = globalThis) {
  return detectRuntime(g) === "workerd";
}

/**
 * True where reading from a filesystem is a legitimate option. Deliberately
 * false on workerd even though `nodejs_compat` makes `node:fs` importable
 * there — importing it succeeds and then every read fails.
 *
 * @param {any} [g]
 * @returns {boolean}
 */
export function hasFilesystem(g = globalThis) {
  const rt = detectRuntime(g);
  return rt === "node" || rt === "deno" || rt === "bun";
}

/**
 * True where `new WebAssembly.Module(bytes)` is permitted. On workerd it is
 * not — the embedder answers `Wasm code generation disallowed by embedder`,
 * measured, which is why a `WebAssembly.Module` has to arrive as a static
 * import or be handed in by the host application.
 *
 * @param {any} [g]
 * @returns {boolean}
 */
export function canCompileWasmFromBytes(g = globalThis) {
  return detectRuntime(g) !== "workerd";
}
