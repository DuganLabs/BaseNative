// Built with BaseNative — basenative.dev
/**
 * The regression guard for the bug this package shipped with for two releases.
 *
 * `@basenative/og-image` was unusable on Cloudflare Workers because its main
 * entry point pulled in `satori`, which pulls in `harfbuzzjs`, whose emscripten
 * loader needs either a filesystem or runtime WASM compilation — and workerd
 * has neither. Nothing in a unit test that mocks a render could catch that:
 * the failure is in the *shape of the module graph*, so that is what this file
 * asserts, over the real files, with the same export conditions wrangler uses.
 *
 * It would have failed on 0.2.2, and it fails again the moment anyone adds an
 * import of satori — or of `node:fs` — to the Workers-facing entry.
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(PKG_DIR, "package.json"), "utf8"));

/**
 * Every static and dynamic specifier a file imports or re-exports.
 *
 * @param {string} src
 * @returns {string[]}
 */
function specifiersIn(src) {
  // Strip comments so a specifier named inside prose (this package's source is
  // heavily commented, and several comments quote `satori` by name) is not
  // mistaken for an import.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  /** @type {string[]} */
  const out = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g, // import … from "x" / export … from "x"
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, // import("x")
    /\bimport\s+["']([^"']+)["']/g, // import "x"
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g, // require("x")
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code))) out.push(m[1]);
  }
  return out;
}

/**
 * Resolve one specifier within this package, applying the `imports` map for
 * `#`-prefixed subpaths under a chosen condition. Returns null for bare
 * specifiers (a dependency — recorded, not followed).
 *
 * @param {string} spec
 * @param {string} fromFile
 * @param {string} condition
 * @returns {string | null}
 */
function resolveInPackage(spec, fromFile, condition) {
  if (spec.startsWith("#")) {
    const entry = pkg.imports && pkg.imports[spec];
    assert.ok(entry, `package.json "imports" has no entry for ${spec}`);
    const target = entry[condition] ?? entry.default;
    assert.ok(target, `"imports"["${spec}"] has neither "${condition}" nor "default"`);
    return join(PKG_DIR, target);
  }
  if (spec.startsWith(".")) return resolvePath(dirname(fromFile), spec);
  return null;
}

/**
 * Walk the module graph from an entry file.
 *
 * @param {string} entryFile
 * @param {string} condition Export condition to resolve `#` subpaths under.
 * @returns {{ files: string[], bare: Set<string> }}
 */
function walk(entryFile, condition) {
  /** @type {string[]} */
  const files = [];
  /** @type {Set<string>} */
  const bare = new Set();
  const seen = new Set();
  const queue = [entryFile];
  while (queue.length) {
    const file = queue.shift();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    files.push(file);
    const src = readFileSync(file, "utf8");
    for (const spec of specifiersIn(src)) {
      const target = resolveInPackage(spec, file, condition);
      if (target === null) bare.add(spec);
      else queue.push(target);
    }
  }
  return { files, bare };
}

/** Conditions wrangler's esbuild pass resolves with. */
const WORKERD_CONDITION = "workerd";

describe("the Workers-facing module graph", () => {
  const { files, bare } = walk(join(PKG_DIR, "src", "index.js"), WORKERD_CONDITION);

  it("reaches more than one file (the walker actually walked)", () => {
    assert.ok(files.length >= 6, `expected the graph to span the package; got ${files.length}`);
  });

  it("depends on nothing but the rasterizer", () => {
    const allowed = new Set(["@resvg/resvg-wasm", "@resvg/resvg-wasm/index_bg.wasm"]);
    const unexpected = [...bare].filter((s) => !allowed.has(s));
    assert.deepEqual(
      unexpected,
      [],
      "a Workers bundle must contain only the rasterizer; anything else here is a new " +
        "third-party dependency shipped to the edge without review",
    );
  });

  it("never imports satori, yoga-layout or harfbuzzjs", () => {
    for (const forbidden of ["satori", "yoga-layout", "harfbuzzjs"]) {
      assert.ok(
        ![...bare].some((s) => s === forbidden || s.startsWith(`${forbidden}/`)),
        `src/index.js's graph imports ${forbidden}; that is the 0.2.2 bug. ` +
          `The satori path belongs behind the "@basenative/og-image/satori" entry point.`,
      );
    }
  });

  it("never imports a node: builtin", () => {
    for (const spec of bare) {
      assert.ok(
        !spec.startsWith("node:"),
        `${spec} is reachable from src/index.js. Cloudflare Workers have no filesystem; ` +
          `with nodejs_compat the import succeeds and every call fails.`,
      );
    }
  });

  it("never references __dirname, __filename or require()", () => {
    for (const file of files) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const token of ["__dirname", "__filename"]) {
        assert.ok(
          !code.includes(token),
          `${file} references ${token}, which does not exist on a Worker — this is ` +
            `failure (2) from the 0.2.2 post-mortem, verbatim`,
        );
      }
      assert.ok(
        !/\brequire\s*\(/.test(code),
        `${file} calls require(); this package is ESM and Workers are ESM`,
      );
    }
  });

  it("resolves #wasm-init to the static-wasm variant under the workerd condition", () => {
    assert.ok(
      files.some((f) => f.endsWith("wasm.workerd.js")),
      "expected src/wasm.workerd.js in the workerd graph",
    );
    assert.ok(
      !files.some((f) => f.endsWith("wasm.node.js")),
      "src/wasm.node.js must not be reachable under the workerd condition — it reads a file",
    );
  });
});

describe("the Node fallback graph", () => {
  const { files, bare } = walk(join(PKG_DIR, "src", "index.js"), "default");

  it("resolves #wasm-init to the fs variant, and that is the only fs user", () => {
    const fsUsers = files.filter((f) =>
      readFileSync(f, "utf8").includes('from "node:fs/promises"'),
    );
    assert.deepEqual(
      fsUsers.map((f) => f.split("/").pop()),
      ["wasm.node.js"],
      "exactly one file in the package may touch a filesystem",
    );
    assert.ok(bare.has("@resvg/resvg-wasm"));
  });
});

describe("the satori entry point", () => {
  const { bare } = walk(join(PKG_DIR, "src", "satori.js"), WORKERD_CONDITION);

  it("does import satori — so the split above is real, not accidental", () => {
    assert.ok(
      bare.has("satori"),
      "src/satori.js should be the one place satori is imported; if it is not there, the " +
        "main entry's cleanliness proves nothing",
    );
  });
});

describe("package.json", () => {
  it("exposes the satori path as its own entry point", () => {
    assert.equal(pkg.exports["./satori"].default, "./src/satori.js");
    assert.equal(pkg.exports["."].default, "./src/index.js");
  });

  it("declares satori as an optional peer, not a dependency", () => {
    assert.equal(pkg.dependencies.satori, undefined, "satori must not be a hard dependency");
    assert.ok(pkg.peerDependencies.satori, "satori should be a peer dependency");
    assert.equal(pkg.peerDependenciesMeta.satori.optional, true);
  });

  it("keeps the #wasm-init condition map pointing workerd at the static import", () => {
    assert.equal(pkg.imports["#wasm-init"].workerd, "./src/wasm.workerd.js");
    assert.equal(pkg.imports["#wasm-init"].default, "./src/wasm.node.js");
  });
});
