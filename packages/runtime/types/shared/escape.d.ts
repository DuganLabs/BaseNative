/**
 * Types for `@basenative/runtime/shared/escape` — the output-escaping module shared
 * by `hydrate()` and `@basenative/server`'s `render()`. `raw` is also re-exported
 * from the package root (see ../index.d.ts); every other export here is subpath-only.
 */

/** Marker produced by `raw()`; exempt from HTML escaping in `{{ }}` interpolation. */
export interface RawHtml {
  readonly value: string;
}

/**
 * Marks `value` as trusted markup, exempt from HTML escaping. Does not exempt the
 * value from the URL-scheme guard on href-style attribute bindings.
 */
export function raw(value: unknown): RawHtml;

/** Returns whether `value` was produced by `raw()`. */
export function isRaw(value: unknown): value is RawHtml;

/** Returns the underlying string of a raw value, or `value` unchanged otherwise. */
export function unwrapRaw<T>(value: T): T extends RawHtml ? string : T;

/** Escapes `value` for insertion into a text node: `&`, `<`, `>`. */
export function escapeText(value: unknown): string;

/** Escapes `value` for a double-quoted attribute value: escapeText plus `"` and `'`. */
export function escapeAttr(value: unknown): string;

/**
 * Returns whether `name` (case-insensitive) is one of the attributes whose value is
 * fetched or navigated to: href, src, action, formaction, data, poster, xlink:href,
 * ping, background, srcdoc, codebase.
 */
export function isUrlAttribute(name: string): boolean;

/**
 * Strips control characters and whitespace, then returns `null` if what remains
 * starts with a `javascript:`, `vbscript:`, `data:`, `blob:`, or `file:` scheme.
 * Returns the original value unchanged otherwise.
 */
export function sanitizeUrl(value: unknown): string | null;

/** One `{{ expression }}` interpolation located by `findInterpolations`. */
export interface Interpolation {
  /** Index of the opening `{{` in the source text. */
  start: number;
  /** Index just past the closing `}}` in the source text. */
  end: number;
  /** The trimmed expression source between the braces. */
  expression: string;
}

/**
 * Locates every `{{ expression }}` in `text`, scanning linearly with `indexOf`
 * rather than a backtracking regex.
 */
export function findInterpolations(text: string): Interpolation[];
