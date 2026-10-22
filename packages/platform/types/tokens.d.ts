/*
 * Type declarations for @basenative/platform/tokens.
 */

/** sRGB channels. `a` is 0–1. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}

/** One derived increased-contrast colour. Provenance is always `derived`. */
export interface DerivedColor {
  readonly name: string;
  readonly slug: string;
  readonly kitCss: string;
  readonly derivedCss: string;
  readonly role: string;
  readonly method: string;
  readonly provenance: 'derived';
}

/** Where each token group came from. `derived` and `mapped` are not kit values. */
export interface Provenance {
  readonly color: 'kit';
  readonly typography: 'kit';
  readonly dimensions: 'kit';
  readonly controlSizes: 'kit';
  readonly liquidGlass: 'kit';
  readonly liquidGlassBlur: 'mapped';
  readonly materials: 'kit';
  readonly materialBlur: 'unread';
  readonly increasedContrast: 'derived';
  readonly motion: 'absent';
  readonly shadows: 'per-component';
}

/**
 * The vendored Apple 27 extract (`data/tokens.json`).
 * Do not edit `src/kit.js`; change the JSON and run `node generate.js`.
 */
export declare const kit: {
  readonly meta: {
    readonly extractedAt: string;
    readonly source: object;
    readonly method: string;
    readonly colorFormat: string;
    readonly aliases: string;
  };
  readonly ios: object;
  readonly macos: object;
  readonly missing: object;
};

export declare const PROVENANCE: Provenance;

/** System font stack. Resolves to SF Pro when the OS provides it. The font files are not shipped. */
export declare const FONT_STACK: string;

/** `Labels/Secondary` → `labels-secondary`. */
export declare function colorSlug(name: string): string;

/** WCAG contrast of two opaque sRGB colours. */
export declare function contrastRatio(a: Rgb, b: Rgb): number;

/**
 * Increased-contrast palette for one platform scheme.
 * The kits have no such mode; every row is labeled `derived`.
 */
export declare function derivePalette(
  colors: Record<string, object>,
  scheme: 'light' | 'dark',
  backgroundName: string,
): DerivedColor[];
