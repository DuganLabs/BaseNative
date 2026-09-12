// Built with BaseNative — basenative.dev
/**
 * Card scenes, against the inputs that actually arrive from a database column a
 * user typed into: empty, one emoji, 200 characters, RTL script, markup, a
 * control character, a lone surrogate.
 *
 * The card is an SVG string, so these assertions are about the document: it is
 * well-formed, every drawn coordinate is inside the canvas, and no user text
 * escapes its element.
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { brandCard, OG_SIZE } from "../src/cards.js";
import { escapeXml } from "../src/svg.js";
import { estimateWidth } from "../src/text.js";

const LEAF = "\u{1F33F}";
const ARABIC = "مؤسسة النور للكهرباء";
const LONE_HIGH_SURROGATE = "\uD83D";

/**
 * A minimal XML well-formedness check: tags balance, attributes are quoted, and
 * character data carries no unescaped `<`, `>` or bare `&`.
 *
 * Deliberately hand-rolled rather than pulled in as a dependency — this package
 * ships no parser, and the point is to fail on exactly the corruption a bad
 * input would cause.
 *
 * @param {string} xml
 */
function assertWellFormedXml(xml) {
  /** @type {string[]} */
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+\s*=\s*"[^"<>]*")*)\s*(\/?)>/g;
  let cursor = 0;
  let m;
  while ((m = tagRe.exec(xml))) {
    const between = xml.slice(cursor, m.index);
    assert.ok(
      !/[<>]/.test(between),
      `raw angle bracket in character data: ${JSON.stringify(between.slice(0, 80))}`,
    );
    assert.ok(
      !/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9A-Fa-f]+);)/.test(between),
      `unescaped ampersand in character data: ${JSON.stringify(between.slice(0, 80))}`,
    );
    cursor = m.index + m[0].length;
    const [, closing, name, , selfClosing] = m;
    if (closing) {
      assert.equal(stack.pop(), name, `mismatched closing </${name}>`);
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  assert.ok(
    !/[<>]/.test(xml.slice(cursor)),
    "trailing character data contains an angle bracket — a tag did not parse",
  );
  assert.deepEqual(stack, [], `unclosed elements: ${stack.join(", ")}`);
}

/**
 * Every x/y/width/height in the document is finite and inside the canvas, and
 * no text baseline sits below the bottom edge.
 *
 * @param {string} svg
 * @param {number} width
 * @param {number} height
 */
function assertInsideCanvas(svg, width, height) {
  const attrRe = /\b(x|y|width|height)="([^"]*)"/g;
  let m;
  while ((m = attrRe.exec(svg))) {
    const [, name, raw] = m;
    const v = Number(raw);
    assert.ok(Number.isFinite(v), `${name}="${raw}" is not a finite number`);
    assert.ok(!/e[-+]?\d/i.test(raw), `${name}="${raw}" is in exponential notation`);
    const limit = name === "x" || name === "width" ? width : height;
    assert.ok(v >= 0 && v <= limit, `${name}="${raw}" is outside 0..${limit}`);
  }
}

/**
 * Reverse `escapeXml`, so a width assertion measures the glyphs the rasterizer
 * will draw rather than the entity spellings in the document — `&quot;` is four
 * characters of XML and one glyph of type.
 *
 * @param {string} s
 * @returns {string}
 */
function unescapeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Extract the text content of every `<text>` element.
 *
 * @param {string} svg
 * @returns {string[]}
 */
function textContents(svg) {
  return [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]);
}

/**
 * Each `<text>` run, with the font size it was drawn at and its x origin.
 *
 * @param {string} svg
 * @returns {{ x: number, fontSize: number, tracking: number, content: string }[]}
 */
function textRuns(svg) {
  return [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].map((m) => {
    const attrs = m[1];
    const pick = (n) => {
      const a = attrs.match(new RegExp(`\\b${n}="([^"]*)"`));
      return a ? Number(a[1]) : 0;
    };
    return {
      x: pick("x"),
      fontSize: pick("font-size"),
      tracking: pick("letter-spacing"),
      content: unescapeXml(m[2]),
    };
  });
}

const BASE = {
  subtitle: "Electrical — Manchester, NH",
  badge: "Licensed electrician",
  brand: "northside.greenput.com",
};

describe("brandCard — the ordinary case", () => {
  const svg = brandCard({ ...BASE, title: "Northside Electrical" });

  it("is a 1200x630 SVG document", () => {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /width="1200" height="630"/);
    assert.match(svg, /viewBox="0 0 1200 630"/);
    assert.ok(svg.endsWith("</svg>"));
    assert.deepEqual({ ...OG_SIZE }, { width: 1200, height: 630 });
  });

  it("is well-formed and stays inside the canvas", () => {
    assertWellFormedXml(svg);
    assertInsideCanvas(svg, 1200, 630);
  });

  it("draws the title, subtitle, badge and brand", () => {
    const texts = textContents(svg).join("|");
    assert.match(texts, /Northside Electrical/);
    assert.match(texts, /Manchester/);
    assert.match(texts, /LICENSED ELECTRICIAN/);
    assert.ok(texts.includes("northside.greenput.com"));
  });

  it("is deterministic — same input, same bytes", () => {
    assert.equal(svg, brandCard({ ...BASE, title: "Northside Electrical" }));
  });

  it("keeps every run inside the horizontal content box", () => {
    for (const run of textRuns(svg)) {
      const budget = 1200 - run.x * 2;
      assert.ok(
        estimateWidth(run.content, run.fontSize, run.tracking) <= budget + 1,
        `run "${run.content}" at ${run.fontSize}px overflows its ${budget}px budget`,
      );
    }
  });
});

describe("brandCard — inputs that must not break it", () => {
  /** @type {[string, Record<string, unknown>][]} */
  const cases = [
    ["empty title", { title: "" }],
    ["whitespace-only title", { title: "   \n\t " }],
    ["one emoji", { title: LEAF }],
    ["emoji plus a word", { title: `${LEAF} Northside` }],
    ["200 characters", { title: "Northside Electrical and Plumbing ".repeat(6).slice(0, 200) }],
    ["200 characters, no spaces", { title: "W".repeat(200) }],
    ["RTL script", { title: ARABIC }],
    ["mixed RTL and Latin", { title: `${ARABIC} Ltd` }],
    ["CJK", { title: "北方電気工事株式会社" }],
    ["markup in the name", { title: '</text><script>alert("x")</script>' }],
    ["ampersand and quotes", { title: `Smith & Sons "The" Best <Co>` }],
    ["a control character", { title: "North\u0007side Electrical" }],
    ["a lone high surrogate", { title: `North${LONE_HIGH_SURROGATE}side` }],
    ["everything empty", { title: "", subtitle: "", badge: "", brand: "" }],
    ["null-ish fields", { title: null, subtitle: undefined, badge: null, brand: undefined }],
  ];

  for (const [name, patch] of cases) {
    it(`${name}: produces a well-formed card inside the canvas`, () => {
      const svg = brandCard({ ...BASE, ...patch });
      assertWellFormedXml(svg);
      assertInsideCanvas(svg, 1200, 630);
      assert.match(svg, /width="1200" height="630"/);
      assert.ok(svg.endsWith("</svg>"));
    });

    it(`${name}: every run fits its width budget`, () => {
      const svg = brandCard({ ...BASE, ...patch });
      for (const run of textRuns(svg)) {
        const budget = 1200 - run.x * 2;
        assert.ok(
          estimateWidth(run.content, run.fontSize, run.tracking) <= budget + 1,
          `run "${run.content.slice(0, 40)}" at ${run.fontSize}px overflows ${budget}px`,
        );
      }
    });
  }

  it("never lets user text escape its element", () => {
    const svg = brandCard({ ...BASE, title: '</text><rect width="9999" height="9999"/>' });
    // The injected rect must not exist as an element. (A bare `</text><rect`
    // substring is not the test: the brand divider legitimately follows the
    // title's closing tag.)
    assert.ok(
      !/<rect\b[^>]*width="9999"/.test(svg),
      "markup in a name must not become markup",
    );
    assert.equal(svg.match(/<rect\b/g).length, 3, "background, accent rule, brand divider — no more");
    assert.match(svg, /&lt;\/text&gt;/);
    assertWellFormedXml(svg);
  });

  it("falls back to titleFallback when the name has no word character", () => {
    const svg = brandCard({ ...BASE, title: LEAF, titleFallback: "northside" });
    assert.match(textContents(svg).join("|"), /northside/);
  });

  it("still identifies the business by its brand line when the title is unusable", () => {
    const svg = brandCard({ title: LEAF, brand: "northside.greenput.com" });
    assert.ok(textContents(svg).join("|").includes("northside.greenput.com"));
  });

  it("sets an RTL base direction only for RTL content", () => {
    assert.match(brandCard({ ...BASE, title: ARABIC }), /direction="rtl"/);
    assert.ok(!brandCard({ ...BASE, title: "Northside" }).includes('direction="rtl"'));
  });

  it("drops characters XML cannot represent rather than emitting them", () => {
    const svg = brandCard({ ...BASE, title: "a\u0001b\u001Fc" });
    // Matching control characters is the point of the assertion.
    // eslint-disable-next-line no-control-regex
    assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(svg));
    assert.match(textContents(svg).join("|"), /abc/);
  });

  it("replaces a lone surrogate rather than emitting invalid UTF-16", () => {
    const svg = brandCard({ ...BASE, title: `a${LONE_HIGH_SURROGATE}b` });
    assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(svg));
    assert.ok(svg.includes("\uFFFD"));
  });
});

describe("escapeXml", () => {
  it("escapes the five XML significant characters", () => {
    assert.equal(escapeXml(`<&>"'`), "&lt;&amp;&gt;&quot;&apos;");
  });

  it("does not double-escape its own output's semantics", () => {
    assert.equal(escapeXml("&amp;"), "&amp;amp;");
  });

  it("coerces nullish to empty", () => {
    assert.equal(escapeXml(null), "");
    assert.equal(escapeXml(undefined), "");
  });
});

describe("brandCard — custom dimensions", () => {
  it("honours a non-default canvas and keeps everything inside it", () => {
    const svg = brandCard({ ...BASE, title: "Northside Electrical", width: 800, height: 418 });
    assert.match(svg, /width="800" height="418"/);
    assert.match(svg, /viewBox="0 0 800 418"/);
    assertWellFormedXml(svg);
    assertInsideCanvas(svg, 800, 418);
  });
});
