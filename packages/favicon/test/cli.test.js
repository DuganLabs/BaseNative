// Built with BaseNative — basenative.dev
/**
 * End-to-end tests for `bn-favicon init` — the CLI surface for both
 * favicon defects fixed here:
 *
 *   1. PNG generation silently skipping instead of resolving
 *      `@resvg/resvg-wasm` (now an `optionalDependency` of this package)
 *      and producing correctly-sized PNGs.
 *   2. `manifest.json`'s `name`/`short_name` using the lowercase preset id
 *      instead of the preset's display name (or an explicit `--name`).
 *
 * We spawn the real CLI rather than calling its internals directly, since
 * the defects are only visible end-to-end (module resolution, process
 * stderr output, files actually written to disk).
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const CLI = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const SRC_DIR = fileURLToPath(new URL("../src", import.meta.url));
const require = createRequire(import.meta.url);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function resvgAvailable() {
  try {
    require.resolve("@resvg/resvg-wasm");
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} outDir
 * @param {string[]} [extraArgs]
 */
function runInit(outDir, extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    [CLI, "init", "--preset", "basenative", "--out", outDir, "--force", ...extraArgs],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, `CLI exited non-zero:\n${result.stderr}`);
  return result;
}

describe("bn-favicon init (CLI)", () => {
  it("writes favicon.svg and manifest.json with the preset's display name", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "bn-favicon-test-"));
    try {
      runInit(outDir);

      const svg = await readFile(join(outDir, "favicon.svg"), "utf8");
      assert.match(svg, /^<svg /);

      const manifest = JSON.parse(await readFile(join(outDir, "manifest.json"), "utf8"));
      // Preset id is "basenative" (lowercase); displayName is "BaseNative".
      assert.equal(manifest.name, "BaseNative");
      assert.equal(manifest.short_name, "BaseNative");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("--name overrides the manifest display name", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "bn-favicon-test-name-"));
    try {
      runInit(outDir, ["--name", "Custom Co"]);
      const manifest = JSON.parse(await readFile(join(outDir, "manifest.json"), "utf8"));
      assert.equal(manifest.name, "Custom Co");
      assert.equal(manifest.short_name, "Custom Co");
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("generates correctly-sized PNG fallbacks when @resvg/resvg-wasm is present", async (t) => {
    if (!resvgAvailable()) {
      t.skip(
        "optional dependency @resvg/resvg-wasm is not installed in this environment " +
          "(pnpm add -D @resvg/resvg-wasm to enable this assertion)",
      );
      return;
    }

    const outDir = await mkdtemp(join(tmpdir(), "bn-favicon-test-png-"));
    try {
      const { stdout } = runInit(outDir);
      assert.match(stdout, /4 PNG fallbacks/);

      const expectedSizes = {
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
        "maskable.png": 512,
      };
      for (const [filename, size] of Object.entries(expectedSizes)) {
        const buf = await readFile(join(outDir, filename));
        assert.deepEqual(
          Array.from(buf.subarray(0, 8)),
          PNG_SIGNATURE,
          `${filename} should start with the PNG magic bytes`,
        );
        assert.equal(buf.readUInt32BE(16), size, `${filename} width should be ${size}`);
        assert.equal(buf.readUInt32BE(20), size, `${filename} height should be ${size}`);
      }
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("prints one clear line naming @resvg/resvg-wasm when it's genuinely unavailable", async () => {
    // Copy `src/` into a directory with no ancestor `node_modules`, so
    // `@resvg/resvg-wasm` — an optionalDependency, not guaranteed present in
    // every install — is genuinely unresolvable. This exercises exactly the
    // path a consumer who skipped optional deps would hit, regardless of
    // whether this sandbox happens to have the dependency installed.
    const isolatedRoot = await mkdtemp(join(tmpdir(), "bn-favicon-isolated-"));
    const isolatedSrc = join(isolatedRoot, "src");
    const outDir = join(isolatedRoot, "out");
    try {
      await cp(SRC_DIR, isolatedSrc, { recursive: true });

      const result = spawnSync(
        process.execPath,
        [join(isolatedSrc, "cli.js"), "init", "--preset", "basenative", "--out", outDir, "--force"],
        { encoding: "utf8" },
      );

      assert.equal(result.status, 0, `CLI exited non-zero:\n${result.stderr}`);
      const lines = result.stderr.split("\n").filter((l) => l.trim().length > 0);
      assert.equal(
        lines.length,
        1,
        `expected exactly one clear line on stderr, got:\n${result.stderr}`,
      );
      assert.match(lines[0], /@resvg\/resvg-wasm/);
      assert.match(lines[0], /pnpm add -D @resvg\/resvg-wasm/);
      assert.doesNotMatch(lines[0], /og-image/, "should no longer blame the og-image peer");

      // The SVG-only path must still succeed.
      await readFile(join(outDir, "favicon.svg"), "utf8");
      await readFile(join(outDir, "manifest.json"), "utf8");
    } finally {
      await rm(isolatedRoot, { recursive: true, force: true });
    }
  });
});
