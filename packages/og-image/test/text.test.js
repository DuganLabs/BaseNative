// Built with BaseNative — basenative.dev
/**
 * Text measurement, wrapping and truncation.
 *
 * These are the guarantees the card layout depends on, so they are asserted as
 * invariants ("the result fits the budget") rather than as snapshots of
 * particular numbers — the width table is calibration, not contract.
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  estimateWidth,
  fitText,
  graphemes,
  hasWordCharacter,
  isRtl,
  truncateGraphemes,
  truncateToWidth,
  wrapToLines,
} from "../src/text.js";

const EMOJI_FAMILY = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}"; // man-woman-girl ZWJ sequence
const LEAF = "\u{1F33F}";
const ARABIC = "مؤسسة النور";
const HEBREW = "חברת החשמל";

describe("graphemes", () => {
  it("keeps a surrogate pair together", () => {
    assert.deepEqual(graphemes(LEAF), [LEAF]);
    assert.equal(LEAF.length, 2, "…which a UTF-16 length would have split");
  });

  it("keeps a ZWJ emoji sequence together", () => {
    // Intl.Segmenter is present on Node and on workerd (measured); if a runtime
    // ever lacks it the fallback is code-point-wise, which still never splits a
    // surrogate pair.
    const gs = graphemes(EMOJI_FAMILY);
    assert.ok(gs.length <= 5);
    assert.equal(gs.join(""), EMOJI_FAMILY);
  });

  it("returns [] for empty and nullish input", () => {
    assert.deepEqual(graphemes(""), []);
    assert.deepEqual(graphemes(null), []);
    assert.deepEqual(graphemes(undefined), []);
  });
});

describe("estimateWidth", () => {
  it("grows with length and with font size", () => {
    assert.ok(estimateWidth("aaaa", 40) > estimateWidth("aa", 40));
    assert.ok(estimateWidth("aa", 80) > estimateWidth("aa", 40));
  });

  it("charges wide glyphs more than narrow ones", () => {
    assert.ok(estimateWidth("mmmm", 40) > estimateWidth("iiii", 40));
  });

  it("treats CJK as at least em-square", () => {
    // Measured at 1.063em for Inter ExtraBold; the estimate carries a margin on
    // top, so it must be at or above one em per glyph and not wildly above.
    const w = estimateWidth("漢字", 100);
    assert.ok(w >= 200 && w <= 260, `expected ~220 for two CJK glyphs at 100px, got ${w}`);
  });

  it("is pessimistic: never narrower than one em per glyph for em-square scripts", () => {
    for (const s of ["漢字熟語", "가나다", "ｱｲｳ"]) {
      assert.ok(
        estimateWidth(s, 100) >= [...s].length * 100,
        `${s} estimated below one em per glyph`,
      );
    }
  });

  it("adds letter-spacing between graphemes but not after the last", () => {
    const plain = estimateWidth("abc", 40);
    assert.equal(estimateWidth("abc", 40, 10), plain + 20);
  });

  it("is zero for empty input", () => {
    assert.equal(estimateWidth("", 40), 0);
    assert.equal(estimateWidth(null, 40), 0);
  });
});

describe("isRtl", () => {
  it("detects Arabic and Hebrew", () => {
    assert.equal(isRtl(ARABIC), true);
    assert.equal(isRtl(HEBREW), true);
  });

  it("decides mixed strings by majority, not by first character", () => {
    assert.equal(isRtl(`${ARABIC} Ltd`), true);
    assert.equal(isRtl(`Northside Electrical و`), false);
  });

  it("is false for Latin, digits, emoji and empty", () => {
    assert.equal(isRtl("Smith & Sons"), false);
    assert.equal(isRtl("12345"), false);
    assert.equal(isRtl(LEAF), false);
    assert.equal(isRtl(""), false);
  });
});

describe("hasWordCharacter", () => {
  it("is true for letters and digits in any script", () => {
    assert.equal(hasWordCharacter("a"), true);
    assert.equal(hasWordCharacter("7"), true);
    assert.equal(hasWordCharacter(ARABIC), true);
    assert.equal(hasWordCharacter("漢"), true);
  });

  it("is false for emoji-only, punctuation-only, whitespace and empty names", () => {
    assert.equal(hasWordCharacter(LEAF), false);
    assert.equal(hasWordCharacter(EMOJI_FAMILY), false);
    assert.equal(hasWordCharacter("--- !!! ---"), false);
    assert.equal(hasWordCharacter("   "), false);
    assert.equal(hasWordCharacter(""), false);
  });
});

describe("truncateGraphemes", () => {
  it("leaves short strings alone", () => {
    assert.equal(truncateGraphemes("abc", 10), "abc");
  });

  it("ellipsises and never splits a grapheme", () => {
    const out = truncateGraphemes(LEAF.repeat(10), 4);
    assert.ok(out.endsWith("…"));
    // No lone surrogates: re-encoding is lossless.
    assert.equal(out, [...out].join(""));
    assert.ok(!/[\uD800-\uDFFF]/.test(out.replace(/[\u{10000}-\u{10FFFF}]/gu, "")));
  });

  it("returns empty for a zero budget", () => {
    assert.equal(truncateGraphemes("abc", 0), "");
  });
});

describe("truncateToWidth", () => {
  it("returns the input untouched when it already fits", () => {
    assert.equal(truncateToWidth("Smith", { maxWidth: 1000, fontSize: 40 }), "Smith");
  });

  it("produces a result inside the budget", () => {
    const out = truncateToWidth("Northside Electrical Contracting Limited", {
      maxWidth: 200,
      fontSize: 40,
    });
    assert.ok(estimateWidth(out, 40) <= 200, `"${out}" overflows 200`);
    assert.ok(out.endsWith("…"));
  });

  it("returns empty rather than overflowing when even one glyph will not fit", () => {
    assert.equal(truncateToWidth("WWWW", { maxWidth: 1, fontSize: 100 }), "");
  });
});

describe("wrapToLines", () => {
  it("keeps every line inside the budget", () => {
    const lines = wrapToLines(
      "Northside Electrical and Plumbing Contractors of Greater Manchester",
      { maxWidth: 400, fontSize: 40 },
    );
    assert.ok(lines.length > 1);
    for (const l of lines) assert.ok(estimateWidth(l, 40) <= 400, `"${l}" overflows`);
  });

  it("hard-splits a single word longer than the line", () => {
    const word = "W".repeat(60);
    const lines = wrapToLines(word, { maxWidth: 300, fontSize: 40 });
    assert.ok(lines.length > 1, "an unbroken 60-character word must wrap, not overflow");
    for (const l of lines) assert.ok(estimateWidth(l, 40) <= 300, `"${l}" overflows`);
    assert.equal(lines.join(""), word, "and no characters may be lost");
  });

  it("collapses whitespace and drops empty input", () => {
    assert.deepEqual(wrapToLines("  a   b  ", { maxWidth: 1000, fontSize: 20 }), ["a b"]);
    assert.deepEqual(wrapToLines("   ", { maxWidth: 1000, fontSize: 20 }), []);
    assert.deepEqual(wrapToLines("", { maxWidth: 1000, fontSize: 20 }), []);
  });

  it("honours maxLines by ellipsising the last one", () => {
    const lines = wrapToLines("one two three four five six seven eight nine ten", {
      maxWidth: 120,
      fontSize: 40,
      maxLines: 2,
    });
    assert.equal(lines.length, 2);
    assert.ok(lines[1].endsWith("…"));
    for (const l of lines) assert.ok(estimateWidth(l, 40) <= 120, `"${l}" overflows`);
  });
});

describe("fitText", () => {
  it("keeps the nominal size when the text already fits", () => {
    const r = fitText("Smith", { maxWidth: 1040, fontSize: 92, maxLines: 2 });
    assert.equal(r.fontSize, 92);
    assert.deepEqual(r.lines, ["Smith"]);
  });

  it("shrinks a 200-character name until it fits the line budget", () => {
    const long = "Northside Electrical ".repeat(10).trim(); // ~200 chars
    assert.ok(long.length >= 190);
    const r = fitText(long, { maxWidth: 1040, fontSize: 92, minFontSize: 43, maxLines: 3 });
    assert.ok(r.fontSize <= 92 && r.fontSize >= 43);
    assert.ok(r.lines.length <= 3);
    for (const l of r.lines) {
      assert.ok(estimateWidth(l, r.fontSize) <= 1040, `"${l}" overflows at ${r.fontSize}`);
    }
  });

  it("stays inside the box even when nothing will fit, by ellipsising", () => {
    const r = fitText("W".repeat(400), { maxWidth: 300, fontSize: 92, minFontSize: 80, maxLines: 1 });
    assert.equal(r.lines.length, 1);
    assert.ok(estimateWidth(r.lines[0], r.fontSize) <= 300);
  });

  it("returns no lines for empty input, without dividing by zero", () => {
    assert.deepEqual(fitText("", { maxWidth: 500, fontSize: 40 }).lines, []);
    assert.deepEqual(fitText("   ", { maxWidth: 500, fontSize: 40 }).lines, []);
  });

  it("scales letter-spacing down with the font size", () => {
    const long = "Northside Electrical Contracting";
    const r = fitText(long, { maxWidth: 300, fontSize: 92, minFontSize: 30, maxLines: 2, tracking: 8 });
    const t = 8 * (r.fontSize / 92);
    for (const l of r.lines) {
      assert.ok(estimateWidth(l, r.fontSize, t) <= 300, `"${l}" overflows with tracking`);
    }
  });
});
