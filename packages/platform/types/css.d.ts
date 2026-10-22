/*
 * Type declarations for @basenative/platform/css.
 */

/** System font stack. Same string as `@basenative/platform/tokens`. */
export declare const FONT_STACK: string;

/**
 * The token stylesheet for one kit extract — `@layer tokens`, iOS and macOS,
 * light and dark, Dynamic Type, device, control size, and derived increased contrast.
 */
export declare function tokensCss(spec: object): string;
