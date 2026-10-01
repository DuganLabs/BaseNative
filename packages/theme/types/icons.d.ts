/* Declarations for @basenative/theme/icons. */

import type { ValidationResult } from './index.js';

export interface IconSetSpec {
  /** The viewBox is `0 0 grid grid`. Default `24`. */
  grid?: number;
  /** In grid units, so it scales with the icon. Default `1.75`. */
  strokeWidth?: number;
  linecap?: 'round' | 'butt' | 'square';
  linejoin?: 'round' | 'bevel' | 'miter';
  /** Icon name -> SVG body markup (the contents of an `<svg>`, not one). */
  icons: Record<string, string>;
}

export interface IconSet {
  grid: number;
  strokeWidth: number;
  linecap: string;
  linejoin: string;
  icons: Readonly<Record<string, string>>;
  /** Sorted icon names. */
  names: readonly string[];
}

/** Thrown by `defineIconSet` and by `renderIcon` for an unknown name. */
export declare class IconSetError extends Error {
  constructor(errors: string[]);
  name: 'IconSetError';
  errors: string[];
}

/**
 * Declares an icon set: one grid, one stroke weight, many bodies.
 *
 * @throws {IconSetError} on a fill, a baked-in stroke colour or literal hex, a
 *   per-icon `stroke-width`, an inline style, a nested `<svg>`, or an icon
 *   carrying its own `viewBox`. `width` / `height` on an inner shape are
 *   ordinary geometry and are allowed.
 */
export declare function defineIconSet(spec: IconSetSpec): IconSet;

/** Checks a set's invariants without throwing. */
export declare function validateIconSet(set: Partial<IconSet>): ValidationResult;

export interface RenderIconOptions {
  /**
   * Makes the icon its own label (`role="img"`). Omit whenever it sits beside
   * visible text, which is the common case — then it renders `aria-hidden`.
   */
  title?: string;
  /** A CSS length for width and height. Default `1em`, so it tracks its type. */
  size?: string;
  /** Raw attribute markup appended to the tag. Not escaped. */
  attrs?: string;
}

/** Renders one icon from a set as an `<svg>` string. */
export declare function renderIcon(
  set: IconSet,
  name: string,
  options?: RenderIconOptions,
): string;
