/* Declarations for @basenative/theme/css. */

/**
 * Strips comments and leading indentation. Deliberately conservative: it does
 * not touch whitespace inside a selector, a `calc()` or a quoted string.
 */
export declare function minifyCss(css: string): string;
