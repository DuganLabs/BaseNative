// Built with BaseNative — basenative.dev
/**
 * `@basenative/favicon` — SVG-first favicon generator + design primitives.
 *
 * The brand rule: **SVG is the primary asset.** Every modern browser
 * (Chrome, Edge, Firefox, Safari ≥16) renders `<link rel="icon"
 * type="image/svg+xml">` natively, including in browser tabs. PNG is only
 * needed for iOS home-screen and Android adaptive icons — and we generate
 * those on demand via the optional `@basenative/og-image` peer.
 *
 * Public API:
 *   - {@link defineFavicon} — turn a glyph + palette + shape spec into a
 *     `{ svg, htmlTags, apple, maskable }` bundle.
 *   - {@link htmlTags} — emit the `<link>` / `<meta>` tags for `<head>`.
 *   - {@link presets} — re-exported DuganLabs preset library.
 *
 * Sub-modules:
 *   - `./render`   — pure SVG renderer (`renderFaviconSvg`, `shape`).
 *   - `./glyphs`   — glyph library (`monogram`, `symbol`, `sigil`).
 *   - `./palette`  — color helpers.
 *   - `./manifest` — Web App Manifest builder.
 *   - `./png`      — optional PNG rasterizer (peer: `@basenative/og-image`).
 *   - `./presets`  — DuganLabs project presets.
 *
 * @module
 */

import { renderFaviconSvg, renderMaskableSvg, renderAppleSvg } from "./render.js";
import { resolvePalette } from "./palette.js";
import { buildManifest, manifestJson } from "./manifest.js";
import { presets, presetList } from "./presets/dl.js";

export {
  renderFaviconSvg,
  renderMaskableSvg,
  renderAppleSvg,
  shape,
} from "./render.js";
export {
  monogram,
  symbol,
  sigil,
  wordmark,
  symbols,
  sigils,
  renderGlyph,
} from "./glyphs.js";
export {
  resolvePalette,
  hexToRgb,
  rgbToHex,
  luminance,
  mix,
  housePalette,
} from "./palette.js";
export { buildManifest, manifestJson } from "./manifest.js";
export { presets, presetList } from "./presets/dl.js";

/** @typedef {import("./render.js").FaviconSpec} FaviconSpec */
/** @typedef {import("./presets/dl.js").Preset} Preset */

/** @typedef {{
 *   themeColor?: string,
 *   manifestHref?: string,
 *   appleHref?: string,
 *   svgHref?: string,
 *   maskIconColor?: string,
 *   sizes?: number[],
 * }} HtmlTagOpts */

/**
 * Build the recommended `<link>` / `<meta>` tags for a favicon. The output
 * is an array of strings — one tag per line — so consumers can join with
 * `\n` and inject into a server-rendered `<head>`, or call `.join('')` in
 * a Worker template.
 *
 * Default hrefs assume the standard public layout the CLI emits:
 *   - `/favicon.svg`
 *   - `/apple-touch-icon.png`
 *   - `/manifest.json`
 *
 * @param {HtmlTagOpts} opts
 * @returns {string[]}
 */
export function htmlTags(opts = {}) {
  const {
    themeColor = "#0C0B09",
    manifestHref = "/manifest.json",
    appleHref = "/apple-touch-icon.png",
    svgHref = "/favicon.svg",
    maskIconColor = themeColor,
  } = opts;
  return [
    // Modern browsers — SVG primary.
    `<link rel="icon" type="image/svg+xml" href="${svgHref}">`,
    // Legacy / fallback — every browser knows /favicon.ico if present.
    `<link rel="alternate icon" href="/favicon.ico">`,
    // iOS home-screen — must be a non-transparent PNG, ideally 180×180.
    `<link rel="apple-touch-icon" href="${appleHref}">`,
    // Safari pinned-tab — monochrome SVG is best, but the SVG works at a pinch.
    `<link rel="mask-icon" href="${svgHref}" color="${maskIconColor}">`,
    // Web App Manifest — drives Android install prompts + maskable icons.
    `<link rel="manifest" href="${manifestHref}">`,
    // Browser-chrome theming — colors the address bar on mobile.
    `<meta name="theme-color" content="${themeColor}">`,
  ];
}

/**
 * Turn a favicon spec (or a preset name) into a ready-to-ship bundle.
 *
 * @param {FaviconSpec | Preset | string} input
 *   Either a full spec, a preset object, or the string name of a registered
 *   DuganLabs preset.
 * @returns {{
 *   spec: FaviconSpec,
 *   svg: string,
 *   apple: string,
 *   maskable: string,
 *   htmlTags: (opts?: HtmlTagOpts) => string[],
 *   manifest: (opts: import("./manifest.js").ManifestOpts) => string,
 * }}
 */
export function defineFavicon(input) {
  let spec;
  if (typeof input === "string") {
    if (!presets[input]) {
      throw new Error(
        `@basenative/favicon: unknown preset "${input}". ` +
          `Available: ${Object.keys(presets).join(", ")}`,
      );
    }
    spec = presets[input];
  } else {
    spec = input;
  }
  // Normalize the palette once so it's available downstream.
  const palette = resolvePalette(spec.palette || {});
  const themeColor =
    /** @type {any} */ (spec).themeColor || palette.bg;

  const svg = renderFaviconSvg(spec);
  const apple = renderAppleSvg(spec);
  const maskable = renderMaskableSvg(spec);

  return {
    spec,
    svg,
    apple,
    maskable,
    htmlTags: (opts = {}) => htmlTags({ themeColor, ...opts }),
    manifest: (opts) =>
      manifestJson({ themeColor, backgroundColor: palette.bg, ...opts }),
  };
}

// Default export bundles the most-reached-for functions.
export default {
  defineFavicon,
  htmlTags,
  presets,
  presetList,
  renderFaviconSvg,
  buildManifest,
};
