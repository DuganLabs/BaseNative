/*
 * Type declarations for @basenative/ios/tokens.
 *
 * The token data, typed by shape rather than by literal: the runtime
 * values are frozen objects whose exact contents `src/tokens.test.js`
 * pins down; what a consumer's compiler needs is the shape of each group.
 */

/** A colour that resolves per appearance — the only colour shape there is. */
export interface SchemeColor {
  readonly light: string;
  readonly dark: string;
}

/** One Dynamic Type text style. Size and leading are in points. */
export interface TypeStyle {
  readonly size: number;
  readonly leading: number;
  readonly weight: number;
  /** Letter tracking, in em. */
  readonly tracking: number;
  readonly family: 'text' | 'display';
}

/** A glass material's per-appearance channels. */
export interface GlassAppearance {
  readonly tint: string;
  readonly highlight: string;
  readonly shadow: string;
}

/** One step of the glass ladder: blur/saturation plus both appearances. */
export interface GlassMaterial {
  readonly blur: number;
  readonly saturate: number;
  readonly light: GlassAppearance;
  readonly dark: GlassAppearance;
}

/** A motion preset: a CSS duration and a timing function. */
export interface MotionPreset {
  readonly duration: string;
  readonly timing: string;
}

/** Whether a token group's values are published by Apple or estimated here. */
export type ProvenanceSource = 'documented' | 'estimate';

export declare const PROVENANCE: Readonly<Record<string, ProvenanceSource>>;
export declare const SYSTEM_COLORS: Readonly<Record<string, SchemeColor>>;
export declare const LABEL_COLORS: Readonly<Record<string, SchemeColor>>;
export declare const BACKGROUND_COLORS: Readonly<Record<string, SchemeColor>>;
export declare const FILL_COLORS: Readonly<Record<string, SchemeColor>>;
export declare const SEPARATOR_COLORS: Readonly<Record<string, SchemeColor>>;
export declare const LINK_COLOR: SchemeColor;
export declare const FONT_FAMILIES: Readonly<Record<'text' | 'display', string>>;
export declare const TYPE_STYLES: Readonly<Record<string, TypeStyle>>;
export declare const GLASS_MATERIALS: Readonly<Record<string, GlassMaterial>>;
export declare const RADII: Readonly<Record<string, string>>;
export declare const SPACING: Readonly<Record<number, string>>;
export declare const SAFE_AREA: Readonly<Record<string, string>>;
export declare const LAYOUT: Readonly<Record<string, string>>;
export declare const MOTION: Readonly<Record<string, MotionPreset>>;
