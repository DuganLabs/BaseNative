// Built with BaseNative — basenative.dev

export type Shape =
  | 'square'
  | 'rounded'
  | 'circle'
  | 'squircle'
  | 'shield'
  | 'diamond';

export interface Palette {
  bg: string;
  fg: string;
  accent: string;
}
export type PaletteInput = string | Partial<Palette>;

export type GlyphKind = 'monogram' | 'symbol' | 'sigil' | 'wordmark';

export interface MonogramGlyph {
  kind: 'monogram';
  letters: string;
  weight?: number | string;
  spacing?: number;
  accentDot?: boolean;
  stacked?: boolean;
}
export interface SymbolGlyph { kind: 'symbol'; name: string; }
export interface SigilGlyph { kind: 'sigil'; name: string; }
export interface WordmarkGlyph { kind: 'wordmark'; text: string; weight?: number | string; }
export type Glyph = MonogramGlyph | SymbolGlyph | SigilGlyph | WordmarkGlyph;

export interface FaviconSpec {
  shape: Shape;
  glyph: Glyph;
  palette: PaletteInput;
  themeColor?: string;
}

export interface Preset extends FaviconSpec {
  name: string;
  label?: string;
}

export const presets: Record<string, Preset>;
export const presetList: Preset[];

export interface HtmlTagOpts {
  themeColor?: string;
  manifestHref?: string;
  appleHref?: string;
  svgHref?: string;
  maskIconColor?: string;
  sizes?: number[];
}

export function htmlTags(opts?: HtmlTagOpts): string[];

export interface ManifestOpts {
  name: string;
  shortName?: string;
  startUrl?: string;
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  themeColor?: string;
  backgroundColor?: string;
  scope?: string;
  iconBaseHref?: string;
}

export function buildManifest(opts: ManifestOpts): unknown;
export function manifestJson(opts: ManifestOpts): string;

export interface FaviconBundle {
  spec: FaviconSpec;
  svg: string;
  apple: string;
  maskable: string;
  htmlTags(opts?: HtmlTagOpts): string[];
  manifest(opts: ManifestOpts): string;
}

export function defineFavicon(input: FaviconSpec | Preset | string): FaviconBundle;

export function renderFaviconSvg(spec: FaviconSpec): string;
export function renderMaskableSvg(spec: FaviconSpec): string;
export function renderAppleSvg(spec: FaviconSpec): string;
export function shape(name: Shape, size?: number): string;

// ─── glyphs ─────────────────────────────────────────────────────
export function monogram(opts: Omit<MonogramGlyph, 'kind'>): MonogramGlyph;
export function symbol(name: string): SymbolGlyph;
export function sigil(name: string): SigilGlyph;
export function wordmark(opts: Omit<WordmarkGlyph, 'kind'>): WordmarkGlyph;
export const symbols: string[];
export const sigils: string[];
export function renderGlyph(glyph: Glyph, palette: Palette): string;

// ─── palette ────────────────────────────────────────────────────
export function resolvePalette(input: PaletteInput): Palette;
export function hexToRgb(hex: string): { r: number; g: number; b: number };
export function rgbToHex(r: number, g: number, b: number): string;
export function luminance(hex: string): number;
export function mix(a: string, b: string, t: number): string;
export const housePalette: Palette;

declare const _default: {
  defineFavicon: typeof defineFavicon;
  htmlTags: typeof htmlTags;
  presets: typeof presets;
  presetList: typeof presetList;
  renderFaviconSvg: typeof renderFaviconSvg;
  buildManifest: typeof buildManifest;
};
export default _default;
