// Built with BaseNative — basenative.dev
/**
 * Shape tests for `@basenative/favicon`.
 *
 * We focus on the SVG-pure path — no resvg / wasm here. The PNG path is
 * exercised in consuming integration tests where the optional peer is
 * installed.
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  defineFavicon,
  htmlTags,
  presets,
  presetList,
  renderFaviconSvg,
  renderMaskableSvg,
  resolvePalette,
  shape,
  symbols,
  sigils,
} from "../src/index.js";
import { buildManifest } from "../src/manifest.js";

const VB_RE = /viewBox="0 0 1024 1024"/;

/* ─────────── palette ─────────── */

describe("palette helpers", () => {
  it("resolvePalette() accepts a single hex as the accent", () => {
    const p = resolvePalette("#ff0000");
    assert.equal(p.accent, "#ff0000");
    assert.equal(p.bg, "#0C0B09");
    assert.equal(typeof p.fg, "string");
  });

  it("resolvePalette() honors a partial palette", () => {
    const p = resolvePalette({ bg: "#fff", accent: "#123456" });
    assert.equal(p.bg, "#fff");
    assert.equal(p.accent, "#123456");
    // White bg should pick a dark fg.
    assert.equal(p.fg, "#0C0B09");
  });

  it("resolvePalette() supplies house defaults on empty input", () => {
    const p = resolvePalette({});
    assert.equal(p.bg, "#0C0B09");
    assert.equal(p.accent, "#E8920A");
  });
});

/* ─────────── render core ─────────── */

describe("renderFaviconSvg()", () => {
  it("emits a 1024×1024 viewBox", () => {
    const svg = renderFaviconSvg({
      glyph: { kind: "monogram", text: "A" },
      shape: "rounded",
    });
    assert.match(svg, VB_RE);
    assert.match(svg, /^<svg /);
    assert.match(svg, /<\/svg>$/);
  });

  it("propagates palette tokens into the markup", () => {
    const svg = renderFaviconSvg({
      glyph: { kind: "monogram", text: "Z" },
      palette: { bg: "#abcdef", accent: "#ff00aa", fg: "#001122" },
      shape: "square",
    });
    assert.match(svg, /#abcdef/);
    assert.match(svg, /#001122/);
  });

  it("clip-paths the glyph against the body shape", () => {
    const svg = renderFaviconSvg({
      glyph: { kind: "symbol", symbol: "leaf" },
      shape: "circle",
    });
    assert.match(svg, /<clipPath id="bn-fav-clip">/);
    assert.match(svg, /clip-path="url\(#bn-fav-clip\)"/);
  });

  it("rejects unknown glyph kinds", () => {
    assert.throws(() =>
      renderFaviconSvg({
        glyph: /** @type {any} */ ({ kind: "bogus" }),
      }),
    );
  });

  it("rejects unknown shapes", () => {
    assert.throws(() =>
      renderFaviconSvg({
        glyph: { kind: "monogram", text: "A" },
        shape: /** @type {any} */ ("hexagon"),
      }),
    );
  });
});

describe("shape()", () => {
  it("supports all six primitive names", () => {
    const palette = { bg: "#000", fg: "#fff", accent: "#f00" };
    const names = ["square", "rounded", "circle", "squircle", "shield", "diamond"];
    for (const n of names) {
      const r = shape(/** @type {any} */ (n), palette);
      assert.ok(r.body.includes("#000"), `${n} body should paint bg`);
      assert.ok(r.clipPath.length > 0, `${n} should expose a clipPath`);
    }
  });
});

/* ─────────── glyph library ─────────── */

describe("glyph library", () => {
  it("ships every documented symbol", () => {
    const expected = [
      "lightbulb", "leaf", "bolt", "key", "eye", "asterisk",
      "gear", "terminal-prompt", "calendar", "beaker", "clock", "anchor",
    ];
    for (const name of expected) {
      assert.equal(typeof symbols[name], "function", `missing symbol: ${name}`);
    }
  });

  it("ships every documented sigil", () => {
    const expected = [
      "concentric-square",
      "intersecting-circles",
      "hex-grid",
      "signal-stack",
      "station-mark",
    ];
    for (const name of expected) {
      assert.equal(typeof sigils[name], "function", `missing sigil: ${name}`);
    }
  });

  it("symbol output mentions the accent color", () => {
    const palette = { bg: "#000", fg: "#fff", accent: "#abc123" };
    const out = symbols.bolt(palette);
    assert.match(out, /#abc123/);
  });
});

/* ─────────── presets ─────────── */

describe("DuganLabs presets", () => {
  const expectedNames = [
    "tabs",
    "basenative",
    "duganlabs",
    "pendingbusiness",
    "greenput",
    "warrendugan",
    "ralph-station",
    "warren-sys",
  ];

  it("registers all 8 expected presets", () => {
    for (const n of expectedNames) {
      assert.ok(presets[n], `missing preset: ${n}`);
    }
    assert.equal(presetList.length, 8);
  });

  for (const name of expectedNames) {
    it(`renders preset "${name}" without error`, () => {
      const fav = defineFavicon(name);
      assert.match(fav.svg, VB_RE);
      assert.match(fav.svg, /^<svg /);
      assert.match(fav.svg, /<\/svg>$/);
      assert.match(fav.apple, VB_RE);
      assert.match(fav.maskable, VB_RE);
    });
  }

  it("rejects unknown preset names", () => {
    assert.throws(() => defineFavicon("nope"));
  });

  it("preset palette flows through to the SVG", () => {
    const fav = defineFavicon("greenput");
    assert.match(fav.svg, /#4EAF7C/);
  });
});

/* ─────────── html tags ─────────── */

describe("htmlTags()", () => {
  it("includes the SVG icon, apple-touch-icon, manifest, mask-icon, theme-color", () => {
    const tags = htmlTags({ themeColor: "#101010" });
    const joined = tags.join("\n");
    assert.match(joined, /rel="icon"\s+type="image\/svg\+xml"/);
    assert.match(joined, /rel="apple-touch-icon"/);
    assert.match(joined, /rel="mask-icon"/);
    assert.match(joined, /rel="manifest"/);
    assert.match(joined, /name="theme-color"\s+content="#101010"/);
  });

  it("defineFavicon().htmlTags() picks themeColor from the preset", () => {
    const fav = defineFavicon("pendingbusiness");
    const tags = fav.htmlTags();
    const joined = tags.join("\n");
    assert.match(joined, /content="#0F0E0C"/);
  });

  it("respects custom hrefs", () => {
    const tags = htmlTags({ svgHref: "/icons/me.svg" });
    assert.ok(tags[0].includes('href="/icons/me.svg"'));
  });
});

/* ─────────── manifest ─────────── */

describe("buildManifest()", () => {
  it("emits the standard icon set", () => {
    const m = buildManifest({ name: "Test", themeColor: "#abc" });
    assert.equal(m.name, "Test");
    assert.equal(m.theme_color, "#abc");
    const sources = m.icons.map((i) => i.src);
    assert.ok(sources.includes("/favicon.svg"));
    assert.ok(sources.includes("/apple-touch-icon.png"));
    assert.ok(sources.includes("/icon-192.png"));
    assert.ok(sources.includes("/icon-512.png"));
    assert.ok(sources.includes("/maskable.png"));
    assert.ok(m.icons.some((i) => i.purpose === "maskable"));
  });
});

/* ─────────── maskable variant ─────────── */

describe("renderMaskableSvg()", () => {
  it("scales the glyph into the safe zone", () => {
    const svg = renderMaskableSvg({
      glyph: { kind: "monogram", text: "M" },
      palette: { accent: "#abc" },
    });
    // 80% safe zone → translate(102.4 102.4) scale(0.8).
    assert.match(svg, /translate\(102\.4 102\.4\) scale\(0\.8\)/);
    assert.match(svg, VB_RE);
  });
});
