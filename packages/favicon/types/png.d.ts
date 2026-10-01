// Built with BaseNative — basenative.dev

/**
 * Rasterizes an SVG string to PNG bytes at a square size (default 512).
 * Needs the optional dependency `@resvg/resvg-wasm`; throws if it is missing.
 */
export function toPng(svg: string, size?: number): Promise<Uint8Array>;
/** Rasterizes the canonical icon set in one call: filename -> PNG bytes. */
export function toIconSet(svgs: { favicon: string; maskable: string }): Promise<Record<string, Uint8Array>>;
