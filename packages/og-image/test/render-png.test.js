// Built with BaseNative — basenative.dev
/**
 * Node-runtime smoke test for `renderPng()`.
 *
 * `render.test.js` deliberately never touches satori/resvg — this file is
 * where we do, specifically to prove the `#wasm-init` bootstrap (see
 * `src/wasm.node.js`) actually links and initializes under plain Node.
 * Before the fix, `import "../src/index.js"` failed at link time even with
 * `node --experimental-wasm-modules`, because the static `.wasm` import in
 * `src/wasm.workerd.js` only resolves under wrangler's esbuild pass.
 *
 * Fonts: the default loader (`src/fonts.js`) fetches Inter from
 * cdn.jsdelivr.net. Rather than depend on that inside `renderPng` itself,
 * we fetch once up front and inject the bytes via the `fonts.buffers`
 * escape hatch, so the render call below never needs network access. If
 * the one-time fetch fails — no egress in this sandbox/CI — the test skips
 * with a clear reason instead of fabricating a pass.
 *
 * @module
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { renderPng, defaultPreset } from "../src/index.js";

const FONT_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** @type {ArrayBuffer | null} */
let fontBytes = null;
/** @type {string | null} */
let skipReason = null;

before(async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(FONT_URL, { signal: controller.signal });
    if (!res.ok) {
      skipReason = `font fetch responded ${res.status} ${res.statusText}`;
      return;
    }
    fontBytes = await res.arrayBuffer();
  } catch (err) {
    skipReason = `no network access to cdn.jsdelivr.net to fetch a test font (${
      err && err.message ? err.message : err
    })`;
  } finally {
    clearTimeout(timer);
  }
});

/**
 * @param {Uint8Array} buf
 * @param {number} offset
 * @returns {number}
 */
function readUInt32BE(buf, offset) {
  return (
    ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>>
    0
  );
}

describe("renderPng() under plain Node", () => {
  it("renders a 1200x630 PNG via satori + Node-safe resvg wasm init", async (t) => {
    if (!fontBytes) {
      t.skip(skipReason ?? "font bytes unavailable for this run");
      return;
    }

    const scene = defaultPreset({
      title: "BaseNative",
      subtitle: "Runs under plain Node too",
      brand: "basenative.dev",
    });

    // No `env` (no KV binding) — every weight is served from the injected
    // buffer, so `loadFonts` never touches `fetch` or KV.
    const png = await renderPng(
      scene,
      {},
      { fonts: { weights: [700], buffers: { 700: fontBytes } } },
    );

    assert.ok(png instanceof Uint8Array, "renderPng() should return a Uint8Array");
    assert.deepEqual(
      Array.from(png.subarray(0, 8)),
      PNG_SIGNATURE,
      "output should start with the PNG magic bytes",
    );

    // IHDR is always the first chunk: 4-byte length, 4-byte type "IHDR",
    // then 4-byte width + 4-byte height (big-endian).
    const ihdrType = String.fromCharCode(...png.subarray(12, 16));
    assert.equal(ihdrType, "IHDR", "first chunk should be IHDR");
    assert.equal(readUInt32BE(png, 16), 1200, "PNG width should be 1200");
    assert.equal(readUInt32BE(png, 20), 630, "PNG height should be 630");
  });
});
