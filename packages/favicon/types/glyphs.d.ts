// Built with BaseNative — basenative.dev

import type { Palette } from './palette.js';

export type SymbolName =
  | 'lightbulb'
  | 'leaf'
  | 'bolt'
  | 'key'
  | 'eye'
  | 'asterisk'
  | 'gear'
  | 'terminal-prompt'
  | 'calendar'
  | 'beaker'
  | 'clock'
  | 'anchor';

export type SigilName =
  | 'concentric-square'
  | 'intersecting-circles'
  | 'hex-grid'
  | 'signal-stack'
  | 'station-mark';

export type GlyphKind = 'monogram' | 'symbol' | 'wordmark' | 'sigil';

export interface GlyphSpec {
  text?: string;
  weight?: number;
  letterSpacing?: number;
  accentDot?: boolean;
  stack?: boolean;
  symbol?: SymbolName;
  sigil?: SigilName;
  word?: string;
}

/** Monogram glyph: 1-3 letters. Returns inner SVG markup for a 1024x1024 viewBox. */
export function monogram(spec: GlyphSpec, palette: Palette): string;
/** Wordmark glyph: a short word on one line. */
export function wordmark(spec: GlyphSpec, palette: Palette): string;
/** Symbol glyph; `spec.symbol` defaults to `asterisk`. Throws on an unknown name. */
export function symbol(spec: GlyphSpec, palette: Palette): string;
/** Sigil glyph; `spec.sigil` defaults to `concentric-square`. Throws on an unknown name. */
export function sigil(spec: GlyphSpec, palette: Palette): string;
/** Hand-tuned vector symbols, keyed by name. */
export const symbols: Record<SymbolName, (palette: Palette) => string>;
/** Hand-tuned abstract sigils, keyed by name. */
export const sigils: Record<SigilName, (palette: Palette) => string>;
/** Dispatch a glyph by `kind`. Throws on an unknown kind. */
export function renderGlyph(kind: GlyphKind, spec: GlyphSpec, palette: Palette): string;
