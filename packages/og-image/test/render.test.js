// Built with BaseNative — basenative.dev
/**
 * Shape tests for `@basenative/og-image`.
 *
 * We deliberately avoid running satori / resvg in CI — those require the
 * WASM module + font fetches and dominate runtime. Instead we test:
 *   - Scene helpers produce valid satori vh-trees.
 *   - Presets return well-shaped scenes for sensible inputs.
 *   - The font loader's KV cache path is exercised against a mock env
 *     (hit, miss, no-binding warn).
 *
 * @module
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  box,
  text,
  tile,
  tileGrid,
  parseGrid,
  theme,
  defaultTheme,
} from "../src/scene.js";
import {
  defaultPreset,
  articlePreset,
  scoreCardPreset,
  presets,
} from "../src/presets.js";
import { defineFonts, loadFonts, _resetFontsForTest } from "../src/fonts.js";

/* ─── Scene helpers ─── */

describe("scene helpers", () => {
  it("box() produces a flex div", () => {
    const node = box({ width: 10 }, []);
    assert.equal(node.type, "div");
    assert.equal(node.props.style.display, "flex");
    assert.equal(node.props.style.width, 10);
    assert.deepEqual(node.props.children, []);
  });

  it("text() carries content as children", () => {
    const node = text({ fontSize: 12 }, "hi");
    assert.equal(node.type, "div");
    assert.equal(node.props.children, "hi");
    assert.equal(node.props.style.display, "flex");
    assert.equal(node.props.style.fontSize, 12);
  });

  it("tile() honors size and theme overrides", () => {
    const node = tile("green", { size: 60, theme: { ...defaultTheme, green: "#00ff00" } });
    assert.equal(node.props.style.width, 60);
    assert.equal(node.props.style.height, 60);
    assert.equal(node.props.style.backgroundColor, "#00ff00");
    // Borders only on `empty` tiles.
    assert.equal(node.props.style.border, "none");
  });

  it("tile() draws a border on empty state", () => {
    const node = tile("empty");
    assert.match(node.props.style.border, /1px solid/);
  });

  it("parseGrid() decodes the share emoji grid", () => {
    const rows = parseGrid("\u{1F7E9}\u{1F7E8}⚫\n⬛⬜");
    // ⚫ is not part of the alphabet, so row 1 has only 🟩🟨; row 2 has ⬛⬜.
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], ["green", "yellow"]);
    assert.deepEqual(rows[1], ["absent", "empty"]);
  });

  it("parseGrid() tolerates falsy input", () => {
    assert.deepEqual(parseGrid(""), []);
    assert.deepEqual(parseGrid(null), []);
    assert.deepEqual(parseGrid(undefined), []);
  });

  it("tileGrid() produces nested rows + tiles", () => {
    const grid = tileGrid([
      ["green", "yellow"],
      ["absent", "empty"],
    ]);
    assert.equal(grid.props.style.flexDirection, "column");
    assert.equal(grid.props.children.length, 2);
    const row0 = grid.props.children[0];
    assert.equal(row0.props.style.flexDirection, "row");
    assert.equal(row0.props.children.length, 2);
  });

  it("theme() returns helpers pre-bound to merged tokens", () => {
    const t = theme({ accent: "#abc" });
    assert.equal(t.theme.accent, "#abc");
    assert.equal(t.theme.bg, defaultTheme.bg);
    const node = t.tile("green", 30);
    assert.equal(node.props.style.width, 30);
    assert.equal(node.props.style.backgroundColor, defaultTheme.green);
  });
});

/* ─── Preset shape validators ─── */

/**
 * Walk a vh-tree, asserting every container has `display: flex`. (Satori
 * throws otherwise.)
 *
 * @param {any} node
 */
function assertSatoriShape(node) {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach(assertSatoriShape);
    return;
  }
  if (typeof node !== "object") return; // text leaf
  assert.equal(typeof node.type, "string", "node missing string type");
  assert.ok(node.props, "node missing props");
  assert.equal(node.props.style.display, "flex", `node ${node.type} missing display:flex`);
  assertSatoriShape(node.props.children);
}

describe("presets", () => {
  it("defaultPreset() renders a 1200x630 scene", () => {
    const scene = defaultPreset({ title: "BaseNative", subtitle: "Hello", brand: "basenative.dev" });
    assert.equal(scene.props.style.width, 1200);
    assert.equal(scene.props.style.height, 630);
    assertSatoriShape(scene);
  });

  it("articlePreset() includes the kicker when provided", () => {
    const scene = articlePreset({
      title: "A clear-eyed look at signals",
      author: "Warren",
      kicker: "Engineering",
    });
    const json = JSON.stringify(scene);
    assert.match(json, /Engineering/);
    assert.match(json, /A clear-eyed look/);
    assert.match(json, /by Warren/);
    assertSatoriShape(scene);
  });

  it("articlePreset() omits author cleanly when absent", () => {
    const scene = articlePreset({ title: "Untitled" });
    assertSatoriShape(scene);
  });

  it("scoreCardPreset() renders the grid + score", () => {
    const scene = scoreCardPreset({
      title: "T4BS",
      verdict: "Solved",
      verdictTone: "win",
      category: "Movies of 1999",
      score: 42,
      grid: "\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}",
    });
    const json = JSON.stringify(scene);
    assert.match(json, /T4BS/);
    assert.match(json, /Solved/);
    assert.match(json, /MOVIES|Movies/);
    assert.match(json, /"42"|42/);
    assertSatoriShape(scene);
  });

  it("scoreCardPreset() degrades gracefully without a grid", () => {
    const scene = scoreCardPreset({ title: "T4BS", score: 0 });
    assertSatoriShape(scene);
  });

  it("presets map exposes all three", () => {
    assert.equal(typeof presets.default, "function");
    assert.equal(typeof presets.article, "function");
    assert.equal(typeof presets.scoreCard, "function");
  });

  it("theme tokens bleed through to preset output", () => {
    const scene = defaultPreset({
      title: "Brand",
      theme: { accent: "#ff00ff", bg: "#000111" },
    });
    assert.equal(scene.props.style.backgroundColor, "#000111");
    const json = JSON.stringify(scene);
    assert.match(json, /#ff00ff/i);
  });
});

/* ─── Font loader / KV cache path ─── */

/**
 * Mock KV namespace that records reads and writes.
 */
function mockKV(initial = {}) {
  const data = new Map(Object.entries(initial));
  /** @type {{ gets: string[], puts: string[] }} */
  const calls = { gets: [], puts: [] };
  return {
    calls,
    data,
    async get(key, _type) {
      calls.gets.push(key);
      return data.has(key) ? data.get(key) : null;
    },
    async put(key, value) {
      calls.puts.push(key);
      data.set(key, value);
    },
  };
}

// Stub global fetch so tests don't hit jsdelivr.
const _origFetch = globalThis.fetch;
function stubFetch(returnsBytes) {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => returnsBytes,
    };
  };
  return () => calls;
}

describe("font loader (KV cache path)", () => {
  beforeEach(() => {
    _resetFontsForTest();
    globalThis.fetch = _origFetch;
  });

  it("defineFonts() applies sensible defaults", () => {
    const cfg = defineFonts();
    assert.equal(cfg.family, "Inter");
    assert.deepEqual(cfg.weights, [600, 700, 800]);
    assert.equal(cfg.cacheBinding, "OG_CACHE");
    assert.equal(cfg.cacheKeyPrefix, "font:");
  });

  it("defineFonts() honors overrides", () => {
    const cfg = defineFonts({ family: "Inter Tight", weights: [400], cacheBinding: "MY_KV" });
    assert.equal(cfg.family, "Inter Tight");
    assert.deepEqual(cfg.weights, [400]);
    assert.equal(cfg.cacheBinding, "MY_KV");
  });

  it("hits KV first; skips upstream fetch on cache HIT", async () => {
    const buf = new Uint8Array([1, 2, 3]).buffer;
    const kv = mockKV({ "font:inter-700": buf });
    const counter = stubFetch(buf);

    const cfg = defineFonts({ weights: [700] });
    const fonts = await loadFonts({ OG_CACHE: kv }, cfg);

    assert.equal(fonts.length, 1);
    assert.equal(fonts[0].name, "Inter");
    assert.equal(fonts[0].weight, 700);
    assert.equal(fonts[0].data, buf);
    assert.deepEqual(kv.calls.gets, ["font:inter-700"]);
    assert.deepEqual(kv.calls.puts, []);
    assert.equal(counter(), 0, "should not hit upstream on cache HIT");
  });

  it("falls through to upstream + writes to KV on cache MISS", async () => {
    const buf = new Uint8Array([7, 7, 7]).buffer;
    const kv = mockKV();
    const counter = stubFetch(buf);

    const cfg = defineFonts({ weights: [600] });
    const fonts = await loadFonts({ OG_CACHE: kv }, cfg);

    assert.equal(fonts.length, 1);
    assert.equal(fonts[0].data, buf);
    assert.deepEqual(kv.calls.gets, ["font:inter-600"]);
    assert.deepEqual(kv.calls.puts, ["font:inter-600"]);
    assert.equal(counter(), 1);
  });

  it("warns and re-fetches when no KV binding is present", async () => {
    const buf = new Uint8Array([9]).buffer;
    const counter = stubFetch(buf);

    const warnings = [];
    const origWarn = console.warn;
    console.warn = (msg) => warnings.push(String(msg));

    try {
      const cfg = defineFonts({ weights: [800] });
      const fonts = await loadFonts({}, cfg);
      assert.equal(fonts.length, 1);
      assert.equal(counter(), 1);
      assert.ok(
        warnings.some((w) => w.includes("OG_CACHE") && w.includes("font:inter-800")),
        `expected warning, got: ${JSON.stringify(warnings)}`,
      );
    } finally {
      console.warn = origWarn;
    }
  });

  it("memoizes within a warm isolate (second call hits neither KV nor fetch)", async () => {
    const buf = new Uint8Array([4, 2]).buffer;
    const kv = mockKV();
    const counter = stubFetch(buf);

    const cfg = defineFonts({ weights: [700] });
    await loadFonts({ OG_CACHE: kv }, cfg);
    const before = { gets: kv.calls.gets.length, puts: kv.calls.puts.length, fetches: counter() };
    await loadFonts({ OG_CACHE: kv }, cfg);
    const after = { gets: kv.calls.gets.length, puts: kv.calls.puts.length, fetches: counter() };

    assert.deepEqual(before, after, "module-scoped memo should short-circuit subsequent calls");
  });

  it("supports custom cache key prefix", async () => {
    const buf = new Uint8Array([5]).buffer;
    const kv = mockKV();
    stubFetch(buf);

    const cfg = defineFonts({ weights: [700], cacheKeyPrefix: "ogfont/" });
    await loadFonts({ OG_CACHE: kv }, cfg);
    assert.deepEqual(kv.calls.puts, ["ogfont/inter-700"]);
  });
});
