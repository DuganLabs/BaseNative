// Built with BaseNative — basenative.dev
/**
 * Text measurement, wrapping and truncation for SVG card layout.
 *
 * Nothing here touches a font file, a WASM module, a filesystem or a network:
 * it is arithmetic over strings, so it runs identically on workerd, Node, Deno,
 * Bun and in a browser, and it is directly unit-testable.
 *
 * **Why estimate instead of measure.** The rasterizer (`@resvg/resvg-wasm`)
 * does its own shaping inside WASM and exposes no measurement API, so exact
 * advance widths are not available to us before the render. Rather than
 * pretend otherwise, `estimateWidth` is deliberately *pessimistic* — it rounds
 * every glyph class up. A layout that fits the estimate therefore fits the
 * canvas; the cost is that text sometimes shrinks slightly more than it had
 * to. For a share card that is the right trade: a too-small line is legible,
 * a line running off the edge is a broken card.
 *
 * @module
 */

/**
 * Advance width, in `em`, of every printable ASCII character.
 *
 * **Measured, not guessed.** Each entry is the larger of the advances at Inter
 * SemiBold (600) and ExtraBold (800) — the two weights the card layouts use —
 * read off resvg's own `getBBox()` for a 30-glyph run at 100px. Index is
 * `codePoint - 0x20`.
 *
 * A per-character table rather than per-class maxima, because the classes are
 * too coarse to be both safe and useful: charging every uppercase letter the
 * width of a `Q` over-estimated a real business name by 30%, which made a
 * title that fits on one line wrap onto two. The first version of this file did
 * the opposite — it under-estimated Latin by up to 1.16x and RTL by 1.83x, and
 * put a line 65px past the edge of a 1200px card while every shape test passed.
 *
 * `test/render-png.test.js` re-measures against the real rasterizer and fails
 * if any entry is optimistic, so this table cannot drift from the font.
 */
const ASCII_EM = [
  0.32, 0.34, 0.4, 0.66, 0.66, 0.88, 0.69, 0.22, 0.43, 0.43,
  0.59, 0.69, 0.31, 0.47, 0.31, 0.41, 0.71, 0.5, 0.64, 0.67,
  0.69, 0.66, 0.68, 0.63, 0.68, 0.68, 0.31, 0.31, 0.69, 0.69,
  0.69, 0.58, 1.07, 0.78, 0.67, 0.76, 0.73, 0.62, 0.59, 0.77,
  0.75, 0.29, 0.58, 0.71, 0.57, 0.93, 0.74, 0.79, 0.66, 0.79,
  0.67, 0.66, 0.68, 0.74, 0.78, 1.07, 0.74, 0.75, 0.68, 0.43,
  0.35, 0.43, 0.5, 0.49, 0.5, 0.59, 0.64, 0.6, 0.64, 0.61,
  0.4, 0.64, 0.64, 0.29, 0.29, 0.6, 0.29, 0.93, 0.64, 0.62,
  0.64, 0.64, 0.43, 0.58, 0.4, 0.64, 0.6, 0.87, 0.59, 0.6,
  0.59, 0.43, 0.39, 0.43, 0.69,
];

/**
 * Advance widths for everything outside ASCII, by script class. These stay
 * coarse — the classes are broad and the consequence of over-estimating a
 * non-Latin title is a slightly smaller headline, not a broken card.
 *
 * Measured the same way: `latinExt` 1.041 (Æ), `cjk` 1.063 (北),
 * `emoji` 1.063 (🌿). `rtl` measured 0.982 per code point over Arabic and
 * Hebrew samples and is carried at 1.15, because RTL text is *shaped* — a
 * per-code-point number is an approximation by nature and the margin has to
 * absorb that.
 */
const EM = {
  space: 0.32,
  latinExt: 1.05,
  cjk: 1.07,
  emoji: 1.07,
  rtl: 1.15,
  other: 1.07, // an unrecognized script: assume em-square rather than narrow
};

/**
 * Margin over the measured advances, covering kerning and the fact that a
 * different face may be substituted for a run this table has no entry for.
 */
const SAFETY = 1.03;

/**
 * Characters a line may break *after* without a hyphen being added — the ones a
 * reader already treats as a seam. Keeps a hostname or a slugged business name
 * from being split mid-syllable.
 */
const SOFT_BREAK = "-/_.";
/** Split after any soft-break character, keeping it on the left. */
const SOFT_BREAK_RE = /(?<=[-/_.])/;

/**
 * Code-point ranges that are em-square (one full advance) rather than
 * proportional: CJK ideographs, Hiragana/Katakana, Hangul, and the halfwidth/
 * fullwidth forms block.
 */
function isEmSquare(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x11ff) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303f) || // CJK radicals / punctuation
    (cp >= 0x3040 && cp <= 0x30ff) || // Hiragana + Katakana
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK unified
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7af) || // Hangul syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK compatibility
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth forms
    (cp >= 0x20000 && cp <= 0x3ffff) // CJK ext B+
  );
}

/**
 * Pictographic / emoji ranges. Used for width only — see the coverage note in
 * `cards.js` about what the shipped font can actually draw.
 */
function isPictographic(cp) {
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x1f000 && cp <= 0x1f2ff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    cp === 0xfe0f ||
    (cp >= 0x1f1e6 && cp <= 0x1f1ff) // regional indicators (flags)
  );
}

/**
 * Right-to-left script ranges: Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan,
 * Mandaic, plus the Arabic presentation forms.
 */
function isRtlCodePoint(cp) {
  return (
    (cp >= 0x0590 && cp <= 0x05ff) ||
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0700 && cp <= 0x074f) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x0780 && cp <= 0x07bf) ||
    (cp >= 0x07c0 && cp <= 0x07ff) ||
    (cp >= 0x0800 && cp <= 0x085f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb1d && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff) ||
    (cp >= 0x10800 && cp <= 0x10fff) ||
    (cp >= 0x1e800 && cp <= 0x1efff)
  );
}

/** @type {Intl.Segmenter | null} */
let _segmenter = null;
let _segmenterTried = false;

function segmenter() {
  if (_segmenterTried) return _segmenter;
  _segmenterTried = true;
  try {
    // Available on workerd (measured) and Node >= 16.
    _segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  } catch {
    _segmenter = null;
  }
  return _segmenter;
}

/**
 * Split a string into user-perceived characters.
 *
 * `Intl.Segmenter` where available (workerd and Node both have it), otherwise
 * `Array.from`, which is code-point-wise and so still never produces a lone
 * surrogate — the bug that makes a naive `String.prototype.slice` emit invalid
 * UTF-16 and, downstream, malformed XML.
 *
 * @param {string} s
 * @returns {string[]}
 */
export function graphemes(s) {
  const str = String(s ?? "");
  if (str === "") return [];
  const seg = segmenter();
  if (seg) {
    const out = [];
    for (const { segment } of seg.segment(str)) out.push(segment);
    return out;
  }
  return Array.from(str);
}

/**
 * Advance width of one grapheme in `em`.
 *
 * @param {string} g A single grapheme cluster.
 * @returns {number}
 */
function graphemeEm(g) {
  const cp = g.codePointAt(0);
  if (cp === undefined) return 0;
  if (cp >= 0x20 && cp <= 0x7e) return ASCII_EM[cp - 0x20];
  if (g === "\u00A0" || g === "\t" || g === "\u2007" || g === "\u202F") return EM.space;
  if (isPictographic(cp)) return EM.emoji;
  if (isEmSquare(cp)) return EM.cjk;
  // Latin-1/Latin Extended: Æ and Œ are as wide as W, so the class gets its own
  // (generous) entry rather than borrowing the ASCII metrics.
  if (cp >= 0x00c0 && cp <= 0x024f) return EM.latinExt;
  // RTL scripts are shaped, so a per-glyph number is an approximation by
  // nature; this is the measured per-code-point maximum, with margin.
  if (isRtlCodePoint(cp)) return EM.rtl;
  return EM.other;
}

/**
 * Pessimistic advance width of a string, in user units.
 *
 * @param {string} s
 * @param {number} fontSize
 * @param {number} [tracking] Per-grapheme letter-spacing, in user units.
 * @returns {number}
 */
export function estimateWidth(s, fontSize, tracking = 0) {
  const gs = graphemes(s);
  let em = 0;
  for (const g of gs) em += graphemeEm(g);
  return em * fontSize * SAFETY + Math.max(0, gs.length - 1) * tracking;
}

/**
 * True when `s` is predominantly right-to-left script.
 *
 * Counts strong directional characters rather than looking only at the first
 * one, so `"مؤسسة Smith"` is treated as RTL and `"Smith مؤسسة"` as LTR by
 * majority — which is what a reader of either expects of the base direction.
 *
 * @param {string} s
 * @returns {boolean}
 */
export function isRtl(s) {
  let rtl = 0;
  let ltr = 0;
  for (const ch of String(s ?? "")) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (isRtlCodePoint(cp)) rtl++;
    else if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0x00c0 && cp <= 0x02af)) ltr++;
  }
  return rtl > ltr;
}

/**
 * True when the string contains at least one character the layout can treat as
 * a word: a letter or a digit.
 *
 * Callers use this to decide whether a user-supplied display name is usable as
 * a card title at all, or whether to fall back to a known-renderable
 * identifier. A name made only of emoji or punctuation returns false.
 *
 * @param {string} s
 * @returns {boolean}
 */
export function hasWordCharacter(s) {
  return /[\p{L}\p{N}]/u.test(String(s ?? ""));
}

/**
 * Truncate to at most `max` graphemes, appending an ellipsis when it had to
 * cut. Never splits a grapheme cluster, so it cannot emit a lone surrogate.
 *
 * @param {string} s
 * @param {number} max
 * @returns {string}
 */
export function truncateGraphemes(s, max) {
  const gs = graphemes(s);
  if (max <= 0) return "";
  if (gs.length <= max) return gs.join("");
  return `${gs.slice(0, Math.max(1, max - 1)).join("").trimEnd()}…`;
}

/**
 * Truncate to fit a pixel budget at a fixed font size, appending an ellipsis.
 *
 * @param {string} s
 * @param {{ maxWidth: number, fontSize: number, tracking?: number }} opts
 * @returns {string}
 */
export function truncateToWidth(s, opts) {
  const { maxWidth, fontSize, tracking = 0 } = opts;
  const gs = graphemes(s);
  if (estimateWidth(gs.join(""), fontSize, tracking) <= maxWidth) return gs.join("");
  const ellipsisW = estimateWidth("…", fontSize, tracking);
  let width = 0;
  const kept = [];
  for (const g of gs) {
    const w = estimateWidth(g, fontSize, tracking) + (kept.length ? tracking : 0);
    if (width + w + ellipsisW > maxWidth) break;
    kept.push(g);
    width += w;
  }
  if (kept.length === 0) return "";
  return `${kept.join("").trimEnd()}…`;
}

/**
 * Break a string into lines that each fit `maxWidth` at `fontSize`.
 *
 * Words longer than the line budget — a 40-character unbroken business name,
 * a URL — are hard-split by grapheme rather than allowed to overflow, which is
 * the `word-break: break-word` behaviour the previous scene DSL had no way to
 * express. A string with no spaces at all is therefore wrapped, not clipped.
 *
 * @param {string} s
 * @param {{ maxWidth: number, fontSize: number, maxLines?: number, tracking?: number }} opts
 * @returns {string[]}
 */
export function wrapToLines(s, opts) {
  const { maxWidth, fontSize, maxLines = Infinity, tracking = 0 } = opts;
  const text = String(s ?? "").replace(/\s+/g, " ").trim();
  if (text === "") return [];
  if (maxWidth <= 0 || fontSize <= 0) return [text];

  /** @type {string[]} */
  const lines = [];
  let current = "";

  const flush = () => {
    if (current !== "") {
      lines.push(current);
      current = "";
    }
  };

  const fits = (candidate) => estimateWidth(candidate, fontSize, tracking) <= maxWidth;

  /** Append graphemes, breaking the line whenever the budget is reached. */
  const hardSplit = (chunk) => {
    for (const g of graphemes(chunk)) {
      if (current !== "" && !fits(current + g)) flush();
      current += g;
    }
  };

  for (const word of text.split(" ")) {
    if (word === "") continue;

    const whole = current === "" ? word : `${current} ${word}`;
    if (fits(whole)) {
      current = whole;
      continue;
    }

    // The word will not fit where it is. Before resorting to breaking it
    // mid-character, break it at the places a reader already reads as
    // breakable: after a hyphen, slash, underscore or dot. Business names and
    // the slugs derived from them are full of them, and
    // "greenleaf-landscapin / g" is a worse card than "greenleaf- /
    // landscaping".
    const pieces = SOFT_BREAK.length ? word.split(SOFT_BREAK_RE) : [word];
    if (pieces.length > 1) {
      let firstPiece = true;
      for (const piece of pieces) {
        if (piece === "") continue;
        const joined = current === "" ? piece : firstPiece ? `${current} ${piece}` : current + piece;
        if (fits(joined)) {
          current = joined;
          firstPiece = false;
          continue;
        }
        flush();
        if (fits(piece)) current = piece;
        else hardSplit(piece);
        firstPiece = false;
      }
      continue;
    }

    flush();
    if (fits(word)) current = word;
    else hardSplit(word);
  }
  flush();

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept.length - 1;
  kept[last] = truncateToWidth(`${kept[last]}…`, { maxWidth, fontSize, tracking });
  return kept;
}

/**
 * Choose the largest font size at or below `fontSize` at which `s` fits the
 * given box, wrapping onto at most `maxLines` lines.
 *
 * Returns the chosen size and the wrapped lines together, so callers never
 * re-wrap at a size they did not measure. If even `minFontSize` will not fit,
 * the last line is ellipsised — the layout stays inside the box no matter what
 * it was handed.
 *
 * @param {string} s
 * @param {{
 *   maxWidth: number,
 *   fontSize: number,
 *   minFontSize?: number,
 *   maxLines?: number,
 *   step?: number,
 *   tracking?: number,
 * }} opts
 * @returns {{ fontSize: number, lines: string[] }}
 */
export function fitText(s, opts) {
  const {
    maxWidth,
    fontSize,
    minFontSize = Math.max(12, Math.round(fontSize * 0.35)),
    maxLines = 2,
    step = 2,
    tracking = 0,
  } = opts;

  const text = String(s ?? "").trim();
  if (text === "") return { fontSize, lines: [] };

  for (let size = fontSize; size >= minFontSize; size -= step) {
    // `tracking` is expressed at the nominal size; scale it with the text so a
    // shrunk headline does not keep a headline's letter-spacing.
    const t = tracking * (size / fontSize);
    const lines = wrapToLines(text, { maxWidth, fontSize: size, maxLines: Infinity, tracking: t });
    if (lines.length <= maxLines) return { fontSize: size, lines };
  }
  const t = tracking * (minFontSize / fontSize);
  return {
    fontSize: minFontSize,
    lines: wrapToLines(text, { maxWidth, fontSize: minFontSize, maxLines, tracking: t }),
  };
}
