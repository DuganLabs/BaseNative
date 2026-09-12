// Built with BaseNative — basenative.dev
/**
 * Real rasterization, under plain Node.
 *
 * `render.test.js` and `cards.test.js` never touch WASM — this file does, so
 * that the `#wasm-init` bootstrap and the actual resvg render are proved rather
 * than assumed. That matters here specifically: the bug this release fixes was
 * invisible to every unit test in the package, because the failure lived in the
 * module graph and in a WASM bootstrap, not in any function's logic.
 *
 * Two things are asserted that a shape test cannot reach:
 *
 *  1. Every adversarial card from `cards.test.js` rasterizes to a real
 *     1200x630 PNG. resvg *is* an XML parser, so this is the strongest
 *     well-formedness check available.
 *  2. The card is not blank. A `.woff` handed to resvg loads zero faces and
 *     silently draws nothing — so the pixel check below is what stops that
 *     regression, and a passing render alone would not.
 *
 * Fonts: fetched once up front from jsdelivr and injected via
 * `defineFonts({ buffers })`, so the render itself needs no network. With no
 * egress the suite skips with a reason rather than fabricating a pass.
 *
 * @module
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { brandCard, defineFonts, provideResvgWasm, renderCard, renderSvg } from "../src/index.js";

const TTF_URL =
  "https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter@0.2.3/Inter_700Bold.ttf";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const LEAF = "\u{1F33F}";
const ARABIC = "مؤسسة النور للكهرباء";

/** @type {ArrayBuffer | null} */
let ttf = null;
/** @type {string | null} */
let skipReason = null;

before(async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(TTF_URL, { signal: controller.signal });
    if (!res.ok) {
      skipReason = `font fetch responded ${res.status} ${res.statusText}`;
      return;
    }
    ttf = await res.arrayBuffer();
    const magic = [...new Uint8Array(ttf).slice(0, 4)];
    // Guard the guard: if this ever stops being a raw sfnt, every render below
    // would still "pass" while drawing nothing, which is the failure mode the
    // pixel assertions exist for.
    assert.deepEqual(magic, [0x00, 0x01, 0x00, 0x00], `${TTF_URL} is not a TrueType file`);
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
    ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0
  );
}

/**
 * Parse the IHDR chunk of a PNG.
 *
 * @param {Uint8Array} png
 * @returns {{ width: number, height: number }}
 */
function pngSize(png) {
  assert.deepEqual([...png.slice(0, 8)], PNG_SIGNATURE, "not a PNG");
  assert.equal(
    new TextDecoder().decode(png.slice(12, 16)),
    "IHDR",
    "first chunk should be IHDR",
  );
  return { width: readUInt32BE(png, 16), height: readUInt32BE(png, 20) };
}

/** Font config that needs no network at render time. */
function fonts() {
  return { weights: [700], buffers: { 700: ttf }, cacheBinding: null };
}

describe("renderSvg / renderCard under Node", () => {
  it("rasterizes a brand card to a 1200x630 PNG", async (t) => {
    if (skipReason) return t.skip(skipReason);
    const png = await renderCard(
      {
        title: "Northside Electrical",
        subtitle: "Electrical — Manchester, NH",
        brand: "northside.greenput.com",
      },
      {},
      { fonts: fonts() },
    );
    assert.ok(png instanceof Uint8Array);
    assert.deepEqual(pngSize(png), { width: 1200, height: 630 });
    assert.ok(png.length > 3000, `suspiciously small PNG: ${png.length} bytes`);
  });

  it("draws actual glyphs — not a card with the text silently missing", async (t) => {
    if (skipReason) return t.skip(skipReason);
    const withText = await renderCard(
      { title: "Northside Electrical", subtitle: "Electrical", brand: "x.example" },
      {},
      { fonts: fonts() },
    );
    const blank = await renderSvg(
      brandCard({ title: "", subtitle: "", badge: "", brand: "" }),
      {},
      { fonts: fonts() },
    );
    // A PNG of a flat background compresses to almost nothing; one with type in
    // it does not. If resvg ever loads zero faces again, these converge.
    assert.ok(
      withText.length > blank.length * 2,
      `text-bearing card (${withText.length}B) should be much larger than an empty one ` +
        `(${blank.length}B); if it is not, no glyphs were drawn`,
    );
  });

  it("rasterizes every adversarial input to a valid 1200x630 PNG", async (t) => {
    if (skipReason) return t.skip(skipReason);
    /** @type {[string, Record<string, unknown>][]} */
    const cases = [
      ["empty title", { title: "" }],
      ["one emoji", { title: LEAF }],
      ["emoji with fallback", { title: LEAF, titleFallback: "northside" }],
      ["200 characters", { title: "Northside Electrical and Plumbing ".repeat(6).slice(0, 200) }],
      ["200 characters, no spaces", { title: "W".repeat(200) }],
      ["RTL script", { title: ARABIC }],
      ["mixed RTL and Latin", { title: `${ARABIC} Ltd` }],
      ["markup in the name", { title: '</text><rect width="9999" height="9999"/>' }],
      ["ampersand and angle brackets", { title: `Smith & Sons <Co>` }],
      ["a lone high surrogate", { title: "North\uD83Dside" }],
      ["nullish fields", { title: null, subtitle: null, badge: null, brand: null }],
    ];
    for (const [name, patch] of cases) {
      const svg = brandCard({
        subtitle: "Electrical — Manchester, NH",
        badge: "Licensed",
        brand: "northside.greenput.com",
        ...patch,
      });
      const png = await renderSvg(svg, {}, { fonts: fonts() });
      assert.deepEqual(pngSize(png), { width: 1200, height: 630 }, `${name}: wrong size`);
    }
  });

  it("honours a custom rasterization width", async (t) => {
    if (skipReason) return t.skip(skipReason);
    const png = await renderCard({ title: "Scaled", brand: "x.example" }, {}, {
      fonts: fonts(),
      width: 600,
    });
    // 1200x630 scaled to 600 wide keeps the aspect ratio.
    assert.deepEqual(pngSize(png), { width: 600, height: 315 });
  });

  it("accepts an explicitly provided WASM source", async (t) => {
    if (skipReason) return t.skip(skipReason);
    // resvg is already initialized by now, so this asserts the contract
    // (validation + no-op after init) rather than re-initializing.
    provideResvgWasm(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    const png = await renderCard({ title: "Still works", brand: "x.example" }, {}, { fonts: fonts() });
    assert.deepEqual(pngSize(png), { width: 1200, height: 630 });
  });

  it("rejects a nonsense WASM source loudly", () => {
    assert.throws(() => provideResvgWasm("/path/to/file.wasm"), /wasm-source-invalid|WebAssembly\.Module/);
    assert.throws(() => provideResvgWasm(null), /wasm-source-invalid|WebAssembly\.Module/);
    assert.throws(() => provideResvgWasm(42), /wasm-source-invalid|WebAssembly\.Module/);
  });

  it("defineFonts({ buffers }) keeps the render off the network entirely", async (t) => {
    if (skipReason) return t.skip(skipReason);
    const origFetch = globalThis.fetch;
    let fetched = 0;
    globalThis.fetch = async () => {
      fetched++;
      throw new Error("the render must not fetch when buffers are supplied");
    };
    try {
      const cfg = defineFonts(fonts());
      assert.equal(cfg.format, "ttf");
      const png = await renderCard({ title: "Offline", brand: "x.example" }, {}, { fonts: fonts() });
      assert.deepEqual(pngSize(png), { width: 1200, height: 630 });
      assert.equal(fetched, 0);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe("the width estimator against real glyph metrics", () => {
  /**
   * The estimator in `text.js` is the only thing keeping text inside the card,
   * and it is arithmetic over a table rather than a measurement — so this is
   * where the table is checked against what the rasterizer actually draws.
   *
   * It must never *under*-estimate: `fitText` treats "fits the estimate" as
   * "fits the canvas", so an optimistic table puts a line past the edge. An
   * earlier hand-guessed table did exactly that, by 65px on a real business
   * name, and every shape test still passed.
   */
  const CORPUS = [
    "Northside Electrical",
    "Contractors of Greater Manchester",
    "Northside Electrical and Plumbing",
    "WWWWWWWWWWWWWWWWWWWW",
    "mmmmmmmmmmmmmmmmmmmm",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    'Smith & Sons "The" Best',
    "General Contracting — Manchester, NH",
    "northside-electrical-and-plumbing.greenput.com",
    "LICENSED ELECTRICIAN",
    "Ærøskøbing Håndværk",
    ARABIC,
    "חברת החשמל",
    "北方電気工事株式会社",
  ];

  it("never under-estimates a rendered line", async (t) => {
    if (skipReason) return t.skip(skipReason);
    const { Resvg } = await import("@resvg/resvg-wasm");
    const { estimateWidth } = await import("../src/text.js");
    const { escapeXml } = await import("../src/svg.js");
    const FS = 100;
    const bufs = [new Uint8Array(ttf)];

    /** @type {string[]} */
    const failures = [];
    for (const s of CORPUS) {
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="20000" height="400" viewBox="0 0 20000 400">` +
        `<text x="0" y="0" font-family="Inter" font-size="${FS}" font-weight="700" fill="#fff"` +
        ` dominant-baseline="hanging">${escapeXml(s)}</text></svg>`;
      const r = new Resvg(svg, {
        font: { fontBuffers: bufs, loadSystemFonts: false, defaultFontFamily: "Inter" },
      });
      const bbox = r.getBBox();
      const actual = bbox ? bbox.x + bbox.width : 0;
      r.free();
      const estimate = estimateWidth(s, FS);
      if (actual > estimate) {
        failures.push(`${JSON.stringify(s)}: rendered ${Math.round(actual)} > estimated ${Math.round(estimate)}`);
      }
    }
    assert.deepEqual(failures, [], `the width table under-estimates:\n${failures.join("\n")}`);
  });
});

describe("the satori entry point", () => {
  it("still renders under Node, from its own entry point", async (t) => {
    if (skipReason) return t.skip(skipReason);
    let mod;
    try {
      mod = await import("../src/satori.js");
    } catch (err) {
      return t.skip(`satori is an optional peer and is not installed (${err && err.message})`);
    }
    const png = await mod.renderPng(
      mod.defaultPreset({ title: "BaseNative", subtitle: "Hello", accent: "BN" }),
      {},
      // satori reads WOFF fine, but the injected buffer is a TTF, which it also
      // accepts — so this stays network-free too.
      { fonts: { weights: [700], buffers: { 700: ttf }, cacheBinding: null } },
    );
    assert.deepEqual(pngSize(png), { width: 1200, height: 630 });
  });

  it("refuses on a workerd-shaped runtime with a named error, not a TypeError", async () => {
    let mod;
    try {
      mod = await import("../src/satori.js");
    } catch {
      return; // optional peer absent; the guard is asserted in runtime.test.js
    }
    const origNavigator = globalThis.navigator;
    try {
      // Make detectRuntime() see workerd. `navigator` is a getter on the Node
      // global, so define rather than assign.
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "Cloudflare-Workers" },
        configurable: true,
        writable: true,
      });
      await assert.rejects(
        () => mod.renderPng({ type: "div", props: { style: { display: "flex" }, children: "x" } }, {}),
        (err) => {
          assert.equal(err.name, "OgImageError");
          assert.equal(err.code, "satori-unsupported-on-this-runtime");
          assert.match(err.message, /renderCard\(\)|renderSvg\(\)/, "must name the alternative");
          return true;
        },
      );
    } finally {
      if (origNavigator === undefined) {
        delete globalThis.navigator;
      } else {
        Object.defineProperty(globalThis, "navigator", {
          value: origNavigator,
          configurable: true,
          writable: true,
        });
      }
    }
  });
});
