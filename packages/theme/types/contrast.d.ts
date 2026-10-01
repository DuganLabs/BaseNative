/* Declarations for @basenative/theme/contrast. */

/** WCAG 2.2 SC 1.4.3 Contrast (Minimum), body text. */
export declare const AA_TEXT: 4.5;
/** SC 1.4.3, large text (>=24px, or >=18.66px bold). */
export declare const AA_LARGE: 3;
/** SC 1.4.11 Non-text Contrast — control boundaries, focus indicators, icons. */
export declare const AA_NONTEXT: 3;

/** Extracts `--name: value` declarations. Later declarations win. */
export declare function parseCustomProperties(css: string): Map<string, string>;

/**
 * Follows `var()` chains to a literal `#rrggbb`.
 *
 * @throws on a dangling reference, a cycle, or a non-literal terminal.
 * @returns an uppercase `#RRGGBB`
 */
export declare function resolveColor(
  name: string,
  props: Map<string, string>,
  seen?: ReadonlySet<string>,
): string;

/** WCAG relative luminance of a `#rrggbb` colour, 0 (black) to 1 (white). */
export declare function relativeLuminance(hex: string): number;

/** WCAG contrast ratio between two `#rrggbb` colours, 1 to 21. Order-independent. */
export declare function contrastRatio(foreground: string, background: string): number;
