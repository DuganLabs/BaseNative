// Built with BaseNative — basenative.dev
/**
 * Pure SVG renderer. Composes a `shape` primitive (the colored body) with a
 * `glyph` (the foreground mark) into a complete SVG document — viewBox
 * 0 0 1024 1024, ready to be saved as `favicon.svg` and served with
 * `Content-Type: image/svg+xml`.
 *
 * The renderer is synchronous, dependency-free, and runtime-agnostic — no
 * DOM, no canvas, no satori. The output is plain text suitable for inlining
 * in a Node script, a Cloudflare Worker, or a build step.
 *
 * @module
 */

import { resolvePalette } from "./palette.js";
import { renderGlyph } from "./glyphs.js";

/** @typedef {import("./palette.js").Palette} Palette */
/** @typedef {import("./glyphs.js").GlyphSpec} GlyphSpec */

/** @typedef {"square"|"rounded"|"circle"|"squircle"|"shield"|"diamond"} ShapeName */

/** @typedef {{
 *   glyph: { kind: "monogram"|"symbol"|"wordmark"|"sigil" } & GlyphSpec,
 *   palette?: string | Partial<Palette>,
 *   shape?: ShapeName,
 *   format?: "svg",
 *   size?: number,
 *   ariaLabel?: string,
 * }} FaviconSpec */

const VB = 1024;

/**
 * Draw the background "shape" — a clipped colored body sized to the viewBox.
 *
 * Each shape is engineered to look correct when downsampled to 16×16 by the
 * browser tab renderer. We avoid sub-pixel strokes and drop-shadows.
 *
 * @param {ShapeName} name
 * @param {Palette} palette
 * @returns {{ body: string, clipId: string, clipPath: string }}
 */
export function shape(name, palette) {
  const id = `bn-fav-clip`;
  switch (name) {
    case "square":
      return {
        body: `<rect width="${VB}" height="${VB}" fill="${palette.bg}"/>`,
        clipId: id,
        clipPath: `<rect width="${VB}" height="${VB}"/>`,
      };
    case "rounded":
      return {
        body: `<rect width="${VB}" height="${VB}" rx="180" ry="180" fill="${palette.bg}"/>`,
        clipId: id,
        clipPath: `<rect width="${VB}" height="${VB}" rx="180" ry="180"/>`,
      };
    case "circle":
      return {
        body: `<circle cx="512" cy="512" r="512" fill="${palette.bg}"/>`,
        clipId: id,
        clipPath: `<circle cx="512" cy="512" r="512"/>`,
      };
    case "squircle": {
      // iOS-style superellipse path — n≈4 approximation via cubic beziers.
      const d =
        "M 512 0 C 832 0 1024 192 1024 512 C 1024 832 832 1024 512 1024 C 192 1024 0 832 0 512 C 0 192 192 0 512 0 Z";
      return {
        body: `<path d="${d}" fill="${palette.bg}"/>`,
        clipId: id,
        clipPath: `<path d="${d}"/>`,
      };
    }
    case "shield": {
      // Heater shield — flat top, curved sides meeting at a soft point bottom.
      const d =
        "M 80 80 Q 80 40 120 40 L 904 40 Q 944 40 944 80 L 944 540 Q 944 760 720 920 Q 568 1000 512 1000 Q 456 1000 304 920 Q 80 760 80 540 Z";
      return {
        body: `<path d="${d}" fill="${palette.bg}"/>`,
        clipId: id,
        clipPath: `<path d="${d}"/>`,
      };
    }
    case "diamond": {
      // Rotated square with rounded corners — manually computed.
      const d =
        "M 512 60 L 964 512 L 512 964 L 60 512 Z";
      return {
        body: `<path d="${d}" fill="${palette.bg}"/>`,
        clipId: id,
        clipPath: `<path d="${d}"/>`,
      };
    }
    default:
      throw new Error(`@basenative/favicon: unknown shape "${name}"`);
  }
}

/**
 * Render a complete favicon SVG document.
 *
 * @param {FaviconSpec} spec
 * @returns {string}  Complete `<svg>...</svg>` markup, viewBox 0 0 1024 1024.
 */
export function renderFaviconSvg(spec) {
  const palette = resolvePalette(spec.palette || {});
  const shapeName = spec.shape || "rounded";
  const { kind, ...glyphSpec } = spec.glyph;
  const body = shape(shapeName, palette);
  const glyph = renderGlyph(kind, glyphSpec, palette);
  const ariaLabel = spec.ariaLabel || "Favicon";

  // Use a clip-path so glyph strokes that bleed past the body get trimmed
  // — important for circle / shield / diamond where a square glyph would
  // otherwise stick out at the corners.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" role="img" aria-label="${escapeAttr(ariaLabel)}">`,
    `<defs><clipPath id="${body.clipId}">${body.clipPath}</clipPath></defs>`,
    body.body,
    `<g clip-path="url(#${body.clipId})">`,
    glyph,
    `</g>`,
    `</svg>`,
  ].join("");
}

/**
 * Render a maskable variant — adds the 80% safe zone Android requires by
 * scaling the glyph down (the body fills the full canvas as the maskable
 * "icon background"). Output SVG stays 1024×1024.
 *
 * @param {FaviconSpec} spec
 * @returns {string}
 */
export function renderMaskableSvg(spec) {
  const palette = resolvePalette(spec.palette || {});
  const shapeName = "square"; // maskable icons must fill the canvas — Android masks them.
  const { kind, ...glyphSpec } = spec.glyph;
  const body = shape(shapeName, palette);
  const glyph = renderGlyph(kind, glyphSpec, palette);
  // 80% safe zone: scale glyph to 0.8 around center.
  // 1024 * 0.1 = 102.4 offset.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" role="img" aria-label="App icon">`,
    body.body,
    `<g transform="translate(102.4 102.4) scale(0.8)">`,
    glyph,
    `</g>`,
    `</svg>`,
  ].join("");
}

/**
 * Render an apple-touch-icon SVG — Apple wants a non-transparent square,
 * no rounded corners (iOS rounds them itself). 180×180 is the canonical
 * size; we still emit 1024×1024 viewBox so the consumer can rasterize.
 *
 * @param {FaviconSpec} spec
 * @returns {string}
 */
export function renderAppleSvg(spec) {
  return renderFaviconSvg({ ...spec, shape: "square" });
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
