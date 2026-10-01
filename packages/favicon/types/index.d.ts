// Built with BaseNative — basenative.dev

import { renderFaviconSvg } from './render.js';
import { buildManifest } from './manifest.js';
import { presets, presetList } from './presets.js';
import type { FaviconSpec } from './render.js';
import type { ManifestOpts } from './manifest.js';
import type { Preset } from './presets.js';

export { renderFaviconSvg, renderMaskableSvg, renderAppleSvg, shape } from './render.js';
export {
  monogram,
  symbol,
  sigil,
  wordmark,
  symbols,
  sigils,
  renderGlyph,
} from './glyphs.js';
export { resolvePalette, hexToRgb, rgbToHex, luminance, mix, housePalette } from './palette.js';
export { buildManifest, manifestJson } from './manifest.js';
export { presets, presetList } from './presets.js';

export type { Palette } from './palette.js';
export type { FaviconSpec, ShapeName } from './render.js';
export type { GlyphKind, GlyphSpec, SymbolName, SigilName } from './glyphs.js';
export type { ManifestOpts } from './manifest.js';
export type { Preset } from './presets.js';

export interface HtmlTagOpts {
  themeColor?: string;
  manifestHref?: string;
  appleHref?: string;
  svgHref?: string;
  maskIconColor?: string;
  sizes?: number[];
}

/** Builds the recommended `<link>` / `<meta>` tags for a favicon, one tag per array entry. */
export function htmlTags(opts?: HtmlTagOpts): string[];

export interface FaviconBundle {
  spec: FaviconSpec;
  svg: string;
  apple: string;
  maskable: string;
  htmlTags: (opts?: HtmlTagOpts) => string[];
  manifest: (opts: ManifestOpts) => string;
}

/** Turns a favicon spec, a preset, or a registered preset name into a ready-to-ship bundle. */
export function defineFavicon(input: FaviconSpec | Preset | string): FaviconBundle;

declare const _default: {
  defineFavicon: typeof defineFavicon;
  htmlTags: typeof htmlTags;
  presets: typeof presets;
  presetList: typeof presetList;
  renderFaviconSvg: typeof renderFaviconSvg;
  buildManifest: typeof buildManifest;
};
export default _default;
