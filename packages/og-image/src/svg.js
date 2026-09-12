// Built with BaseNative — basenative.dev
/**
 * SVG serialization primitives for card scenes.
 *
 * The scene a card produces is a plain SVG string. That is the whole reason
 * this package now runs on Cloudflare Workers: the rasterizer
 * (`@resvg/resvg-wasm`, a single static `.wasm`) does its own text shaping, so
 * there is no layout engine and no text shaper to bootstrap — no `yoga-layout`,
 * no `harfbuzzjs`, and therefore none of the emscripten environment-sniffing
 * that could not work there. See `runtime.js`.
 *
 * @module
 */

import { estimateWidth, fitText, isRtl, truncateToWidth } from "./text.js";

/**
 * Characters XML 1.0 forbids outright (they cannot be escaped — they must be
 * removed): C0 controls other than tab/LF/CR, and the two non-characters at the
 * top of the BMP.
 */
// Matching control characters is exactly the point: they have to be removed.
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
/** Surrogate code units with no partner. A lone surrogate is not valid XML. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/**
 * Escape a string for use in XML character data or a quoted attribute value.
 *
 * Also *removes* code points XML cannot represent and replaces unpaired
 * surrogates with U+FFFD. This matters: card text comes from a database column
 * a user typed into, and a single stray control character in a business name
 * would otherwise produce a document the rasterizer rejects — turning one bad
 * row into a 500 on a public page.
 *
 * @param {unknown} s
 * @returns {string}
 */
export function escapeXml(s) {
  return String(s ?? "")
    .replace(XML_ILLEGAL, "")
    .replace(LONE_SURROGATE, "\uFFFD")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format a number for an SVG attribute: finite, and never in exponential
 * notation (which SVG does not accept).
 *
 * @param {number} n
 * @returns {string}
 */
export function num(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return String(Math.round(v * 1000) / 1000);
}

/**
 * A solid rectangle.
 *
 * @param {{ x: number, y: number, width: number, height: number, fill: string, rx?: number }} o
 * @returns {string}
 */
export function rect(o) {
  const rx = o.rx ? ` rx="${num(o.rx)}"` : "";
  return `<rect x="${num(o.x)}" y="${num(o.y)}" width="${num(o.width)}" height="${num(
    o.height,
  )}" fill="${escapeXml(o.fill)}"${rx}/>`;
}

/**
 * A single `<text>` element, top-anchored.
 *
 * `dominant-baseline="hanging"` makes `y` the top of the line box rather than
 * the baseline, so a caller can lay a card out in plain top-down coordinates
 * without knowing the font's ascent.
 *
 * `direction="rtl"` is set when the content is predominantly RTL script. The
 * rasterizer applies the Unicode bidirectional algorithm to the run either way;
 * what this adds is the correct *base* direction for a mixed string, so an
 * Arabic or Hebrew business name with a Latin suffix reads in the right order.
 *
 * @param {{
 *   x: number,
 *   y: number,
 *   text: string,
 *   fontSize: number,
 *   fill: string,
 *   fontFamily?: string,
 *   weight?: number,
 *   tracking?: number,
 *   anchor?: "start" | "middle" | "end",
 *   opacity?: number,
 * }} o
 * @returns {string}
 */
export function textLine(o) {
  const content = escapeXml(o.text);
  if (content === "") return "";
  const family = escapeXml(o.fontFamily || "Inter");
  const tracking = o.tracking ? ` letter-spacing="${num(o.tracking)}"` : "";
  const opacity = o.opacity != null && o.opacity !== 1 ? ` opacity="${num(o.opacity)}"` : "";
  const dir = isRtl(o.text) ? ` direction="rtl"` : "";
  return (
    `<text x="${num(o.x)}" y="${num(o.y)}" font-family="${family}" font-size="${num(o.fontSize)}"` +
    ` font-weight="${num(o.weight ?? 600)}" fill="${escapeXml(o.fill)}"` +
    ` text-anchor="${o.anchor || "start"}" dominant-baseline="hanging"${tracking}${dir}${opacity}>` +
    `${content}</text>`
  );
}

/**
 * A run of `<text>` lines stacked downward from `y`.
 *
 * @param {{
 *   x: number,
 *   y: number,
 *   lines: string[],
 *   fontSize: number,
 *   lineHeight?: number,
 *   fill: string,
 *   fontFamily?: string,
 *   weight?: number,
 *   tracking?: number,
 *   anchor?: "start" | "middle" | "end",
 *   opacity?: number,
 * }} o
 * @returns {{ svg: string, height: number }}
 */
export function textBlock(o) {
  const lineHeight = o.lineHeight ?? 1.15;
  const advance = o.fontSize * lineHeight;
  const parts = o.lines.map((line, i) =>
    textLine({
      x: o.x,
      y: o.y + i * advance,
      text: line,
      fontSize: o.fontSize,
      fill: o.fill,
      fontFamily: o.fontFamily,
      weight: o.weight,
      tracking: o.tracking,
      anchor: o.anchor,
      opacity: o.opacity,
    }),
  );
  return { svg: parts.join(""), height: o.lines.length ? advance * (o.lines.length - 1) + o.fontSize : 0 };
}

/**
 * Lay out a headline inside a width budget: shrink-to-fit, wrap, and stack.
 *
 * Convenience over `fitText` + `textBlock` for the common case; returns the
 * measured height so the caller can flow content beneath it.
 *
 * @param {{
 *   x: number,
 *   y: number,
 *   text: string,
 *   maxWidth: number,
 *   fontSize: number,
 *   minFontSize?: number,
 *   maxLines?: number,
 *   lineHeight?: number,
 *   fill: string,
 *   fontFamily?: string,
 *   weight?: number,
 *   tracking?: number,
 * }} o
 * @returns {{ svg: string, height: number, fontSize: number, lines: string[] }}
 */
export function headline(o) {
  const { fontSize, lines } = fitText(o.text, {
    maxWidth: o.maxWidth,
    fontSize: o.fontSize,
    minFontSize: o.minFontSize,
    maxLines: o.maxLines ?? 2,
    tracking: o.tracking,
  });
  const tracking = o.tracking ? o.tracking * (fontSize / o.fontSize) : 0;
  const block = textBlock({
    x: o.x,
    y: o.y,
    lines,
    fontSize,
    lineHeight: o.lineHeight,
    fill: o.fill,
    fontFamily: o.fontFamily,
    weight: o.weight,
    tracking,
  });
  return { svg: block.svg, height: block.height, fontSize, lines };
}

/**
 * A single line clipped to a width budget at a fixed size.
 *
 * @param {{
 *   x: number,
 *   y: number,
 *   text: string,
 *   maxWidth: number,
 *   fontSize: number,
 *   fill: string,
 *   fontFamily?: string,
 *   weight?: number,
 *   tracking?: number,
 *   anchor?: "start" | "middle" | "end",
 *   opacity?: number,
 * }} o
 * @returns {string}
 */
export function clippedLine(o) {
  const text = truncateToWidth(o.text, {
    maxWidth: o.maxWidth,
    fontSize: o.fontSize,
    tracking: o.tracking ?? 0,
  });
  return textLine({ ...o, text });
}

/**
 * Wrap scene children in an SVG document.
 *
 * `width`/`height` and a matching `viewBox` are both emitted: the rasterizer is
 * told the intrinsic size *and* the user-space mapping, so a card is never
 * scaled by an inferred aspect ratio.
 *
 * @param {{ width: number, height: number, children: string }} o
 * @returns {string}
 */
export function svgDoc(o) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(o.width)}" height="${num(o.height)}"` +
    ` viewBox="0 0 ${num(o.width)} ${num(o.height)}">${o.children}</svg>`
  );
}

export { estimateWidth, fitText, isRtl, truncateToWidth };
