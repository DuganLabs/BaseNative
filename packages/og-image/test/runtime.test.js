// Built with BaseNative — basenative.dev
/**
 * Environment detection, against synthetic globals shaped like each runtime.
 *
 * The workerd shape below is not invented — it is what a real workerd isolate
 * reported (`wrangler dev`, `compatibility_date` 2026-04-23, `nodejs_compat`,
 * 2026-09-12):
 *
 * ```json
 * { "navigator.userAgent": "Cloudflare-Workers", "typeof WorkerGlobalScope": "function",
 *   "self === globalThis": true, "typeof location": "undefined",
 *   "typeof document": "undefined", "typeof window": "undefined",
 *   "process.versions.node": "22.19.0", "typeof Deno": "undefined",
 *   "typeof Bun": "undefined" }
 * ```
 *
 * Every assertion here about that shape fails under the two heuristics that
 * actually broke this package in production — "`process.versions.node` means
 * Node" and "`WorkerGlobalScope` means browser" — which is the point of the
 * file.
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  detectRuntime,
  isWorkerd,
  hasFilesystem,
  canCompileWasmFromBytes,
} from "../src/runtime.js";

/** A workerd isolate with `nodejs_compat`, as measured. */
function workerdGlobal() {
  const g = {
    navigator: { userAgent: "Cloudflare-Workers" },
    WorkerGlobalScope: function WorkerGlobalScope() {},
    process: { versions: { node: "22.19.0" } },
    caches: { default: {} },
    // No `location`. No `document`. No `window`. That is the whole trap.
  };
  g.self = g;
  return g;
}

/** workerd with the userAgent removed, to exercise the secondary fingerprint. */
function workerdGlobalNoUserAgent() {
  const g = workerdGlobal();
  delete g.navigator;
  return g;
}

function nodeGlobal() {
  return { process: { versions: { node: "22.23.2" } } };
}

function browserWindowGlobal() {
  const g = {
    document: {},
    navigator: { userAgent: "Mozilla/5.0 (X11; Linux x86_64)" },
    location: { href: "https://example.com/" },
  };
  g.window = g;
  g.self = g;
  return g;
}

/** A real browser DedicatedWorker: WorkerGlobalScope *and* a WorkerLocation. */
function browserWorkerGlobal() {
  const g = {
    WorkerGlobalScope: function WorkerGlobalScope() {},
    navigator: { userAgent: "Mozilla/5.0 (X11; Linux x86_64)" },
    location: { href: "https://example.com/worker.js" },
  };
  g.self = g;
  return g;
}

function denoGlobal() {
  return {
    Deno: { version: { deno: "2.1.4" } },
    process: { versions: { node: "22.0.0" } },
  };
}

function bunGlobal() {
  return { Bun: { version: "1.2.0" }, process: { versions: { node: "22.6.0" } } };
}

describe("detectRuntime", () => {
  it("identifies workerd by its userAgent, despite process.versions.node", () => {
    const g = workerdGlobal();
    // The trap: nodejs_compat means workerd *does* report a Node version.
    assert.equal(g.process.versions.node, "22.19.0");
    assert.equal(detectRuntime(g), "workerd");
    assert.equal(isWorkerd(g), true);
  });

  it("identifies workerd without a userAgent, by WorkerGlobalScope + no location", () => {
    const g = workerdGlobalNoUserAgent();
    assert.equal(typeof g.WorkerGlobalScope, "function");
    assert.equal(typeof g.location, "undefined");
    assert.equal(detectRuntime(g), "workerd");
  });

  it("does not mistake workerd for a browser, though it defines WorkerGlobalScope and self", () => {
    const g = workerdGlobal();
    assert.equal(typeof g.WorkerGlobalScope, "function");
    assert.equal(g.self, g);
    assert.notEqual(detectRuntime(g), "browser");
  });

  it("distinguishes a real browser worker from workerd by the presence of location", () => {
    assert.equal(detectRuntime(browserWorkerGlobal()), "browser");
    assert.equal(detectRuntime(workerdGlobal()), "workerd");
  });

  it("identifies node, browser, deno and bun", () => {
    assert.equal(detectRuntime(nodeGlobal()), "node");
    assert.equal(detectRuntime(browserWindowGlobal()), "browser");
    assert.equal(detectRuntime(denoGlobal()), "deno");
    assert.equal(detectRuntime(bunGlobal()), "bun");
  });

  it("checks deno and bun before node, since both report a node version", () => {
    assert.equal(denoGlobal().process.versions.node, "22.0.0");
    assert.equal(bunGlobal().process.versions.node, "22.6.0");
    assert.equal(detectRuntime(denoGlobal()), "deno");
    assert.equal(detectRuntime(bunGlobal()), "bun");
  });

  it("answers 'unknown' rather than guessing", () => {
    assert.equal(detectRuntime({}), "unknown");
    assert.equal(detectRuntime(null), "unknown");
    assert.equal(detectRuntime(7), "unknown");
    assert.equal(detectRuntime("globalThis"), "unknown");
  });
});

describe("capability checks", () => {
  it("refuses the filesystem on workerd even though node:fs is importable there", () => {
    assert.equal(hasFilesystem(workerdGlobal()), false);
    assert.equal(hasFilesystem(nodeGlobal()), true);
    assert.equal(hasFilesystem(denoGlobal()), true);
    assert.equal(hasFilesystem(bunGlobal()), true);
    assert.equal(hasFilesystem(browserWindowGlobal()), false);
  });

  it("knows workerd forbids compiling WASM from bytes", () => {
    // Measured: `new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0]))`
    // on workerd throws "Wasm code generation disallowed by embedder".
    assert.equal(canCompileWasmFromBytes(workerdGlobal()), false);
    assert.equal(canCompileWasmFromBytes(nodeGlobal()), true);
  });
});

describe("the heuristics that broke this package", () => {
  it("'process.versions.node means Node' is wrong on workerd", () => {
    const g = workerdGlobal();
    const naive = g.process && g.process.versions && g.process.versions.node ? "node" : "other";
    assert.equal(naive, "node", "the naive check does conclude Node");
    assert.equal(detectRuntime(g), "workerd", "ours does not");
  });

  it("'WorkerGlobalScope means browser worker, so read self.location.href' is wrong on workerd", () => {
    const g = workerdGlobal();
    const naiveIsWorker = typeof g.WorkerGlobalScope === "function";
    assert.equal(naiveIsWorker, true, "the naive check does conclude browser worker");
    assert.throws(
      () => String(g.self.location.href),
      /Cannot read properties of undefined/,
      "and then throws exactly the TypeError this package shipped with",
    );
    assert.equal(detectRuntime(g), "workerd");
  });
});
