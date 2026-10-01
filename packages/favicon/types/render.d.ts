// Built with BaseNative — basenative.dev

import type { Palette } from './palette.js';
import type { GlyphKind, GlyphSpec } from './glyphs.js';

export type ShapeName = 'square' | 'rounded' | 'circle' | 'squircle' | 'shield' | 'diamond';

export interface FaviconSpec {
  glyph: { kind: GlyphKind } & GlyphSpec;
  palette?: string | Partial<Palette>;
  /** Defaults to `rounded`. */
  shape?: ShapeName;
  format?: 'svg';
  size?: number;
  /** Defaults to `Favicon`. */
  ariaLabel?: string;
}

/** Draws the background shape: a clipped colored body sized to the viewBox. */
export function shape(
  name: ShapeName,
  palette: Palette,
): { body: string; clipId: string; clipPath: string };
/** Renders a complete favicon SVG document (viewBox 0 0 1024 1024). */
export function renderFaviconSvg(spec: FaviconSpec): string;
/** Renders a maskable variant with the Android safe zone. */
export function renderMaskableSvg(spec: FaviconSpec): string;
/** Renders an apple-touch-icon SVG. */
export function renderAppleSvg(spec: FaviconSpec): string;
