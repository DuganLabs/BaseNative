// Built with BaseNative — basenative.dev

export interface Palette {
  bg: string;
  fg: string;
  accent: string;
}

/** Parse `#rgb` / `#rrggbb` to `[r, g, b]` (0-255). Returns null on bad input. */
export function hexToRgb(hex: string): [number, number, number] | null;
/** Encode `[r, g, b]` back to lowercase `#rrggbb`. */
export function rgbToHex(rgb: [number, number, number]): string;
/** Relative luminance per WCAG. 0 = black, 1 = white. */
export function luminance(hex: string): number;
/** Mix two hex colors at `t` (0 -> a, 1 -> b). */
export function mix(a: string, b: string, t: number): string;
/** Resolve a palette input to a fully-populated `{ bg, fg, accent }`. A string is treated as the accent. */
export function resolvePalette(input: string | Partial<Palette>): Palette;
/** The default DuganLabs palette. */
export const housePalette: Palette;
