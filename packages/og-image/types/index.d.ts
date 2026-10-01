// Built with BaseNative — basenative.dev

import type { Theme } from './scene.js';

/* ─── Runtime detection ─── */

export type RuntimeName = "workerd" | "node" | "deno" | "bun" | "browser" | "unknown";

export function detectRuntime(g?: unknown): RuntimeName;
export function isWorkerd(g?: unknown): boolean;
export function hasFilesystem(g?: unknown): boolean;
export function canCompileWasmFromBytes(g?: unknown): boolean;

/* ─── Errors ─── */

export type OgImageErrorCode =
  | "satori-unsupported-on-this-runtime"
  | "satori-not-installed"
  | "wasm-source-unavailable"
  | "wasm-source-invalid"
  | "font-fetch-failed"
  | "no-fonts";

export class OgImageError extends Error {
  constructor(code: OgImageErrorCode, message: string, opts?: { cause?: unknown });
  code: OgImageErrorCode;
}

/* ─── WASM ─── */

export type ResvgWasmSource = WebAssembly.Module | ArrayBuffer | ArrayBufferView | Response;

/**
 * Supply the compiled resvg WASM module explicitly, for a runtime or bundler
 * the package's own `#wasm-init` condition map does not cover. Call at module
 * scope, before the first render.
 */
export function provideResvgWasm(source: ResvgWasmSource | Promise<ResvgWasmSource>): void;
export function ensureResvg(): Promise<void>;
export function isResvgInited(): boolean;

/* ─── Fonts ─── */

export type FontFormat = "ttf" | "woff";

export interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: "normal" | "italic";
}

export interface FontConfig {
  family?: string;
  weights?: number[];
  /**
   * `ttf` for the rasterizer path (`renderSvg`/`renderCard`) — resvg's font
   * parser cannot read WOFF and fails by drawing nothing. `woff` for the satori
   * path. Defaults per render path.
   */
  format?: FontFormat;
  cdnVersion?: string;
  /** `null` means "deliberately no KV", which also silences the warning. */
  cacheBinding?: string | null;
  cacheKeyPrefix?: string;
  buffers?: Record<number, ArrayBuffer | Uint8Array>;
  urls?: Record<number, string>;
}

export type ResolvedFontConfig = Required<Omit<FontConfig, "buffers" | "urls">> &
  Pick<FontConfig, "buffers" | "urls">;

export function defineFonts(cfg?: FontConfig, defaultFormat?: FontFormat): ResolvedFontConfig;
export function loadFontBuffers(
  env: Record<string, unknown>,
  cfg: ResolvedFontConfig,
): Promise<Uint8Array[]>;
export function loadFonts(
  env: Record<string, unknown>,
  cfg: ResolvedFontConfig,
): Promise<SatoriFont[]>;
export function fontUrl(cfg: ResolvedFontConfig, weight: number): string;
export function fontCacheKey(cfg: ResolvedFontConfig, weight: number): string;

/* ─── Text measurement and layout ─── */

export function graphemes(s: string): string[];
export function estimateWidth(s: string, fontSize: number, tracking?: number): number;
export function isRtl(s: string): boolean;
export function hasWordCharacter(s: string): boolean;
export function truncateGraphemes(s: string, max: number): string;
export function truncateToWidth(
  s: string,
  opts: { maxWidth: number; fontSize: number; tracking?: number },
): string;
export function wrapToLines(
  s: string,
  opts: { maxWidth: number; fontSize: number; maxLines?: number; tracking?: number },
): string[];
export function fitText(
  s: string,
  opts: {
    maxWidth: number;
    fontSize: number;
    minFontSize?: number;
    maxLines?: number;
    step?: number;
    tracking?: number;
  },
): { fontSize: number; lines: string[] };

/* ─── SVG primitives ─── */

export type TextAnchor = "start" | "middle" | "end";

export function escapeXml(s: unknown): string;
export function num(n: number): string;
export function rect(o: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rx?: number;
}): string;
export function textLine(o: {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
  fontFamily?: string;
  weight?: number;
  tracking?: number;
  anchor?: TextAnchor;
  opacity?: number;
}): string;
export function textBlock(o: {
  x: number;
  y: number;
  lines: string[];
  fontSize: number;
  lineHeight?: number;
  fill: string;
  fontFamily?: string;
  weight?: number;
  tracking?: number;
  anchor?: TextAnchor;
  opacity?: number;
}): { svg: string; height: number };
export function headline(o: {
  x: number;
  y: number;
  text: string;
  maxWidth: number;
  fontSize: number;
  minFontSize?: number;
  maxLines?: number;
  lineHeight?: number;
  fill: string;
  fontFamily?: string;
  weight?: number;
  tracking?: number;
}): { svg: string; height: number; fontSize: number; lines: string[] };
export function clippedLine(o: {
  x: number;
  y: number;
  text: string;
  maxWidth: number;
  fontSize: number;
  fill: string;
  fontFamily?: string;
  weight?: number;
  tracking?: number;
  anchor?: TextAnchor;
  opacity?: number;
}): string;
export function svgDoc(o: { width: number; height: number; children: string }): string;

/* ─── Cards ─── */

export const OG_SIZE: Readonly<{ width: number; height: number }>;

export interface BrandCardOptions {
  title: string;
  /** Used when `title` has no letter or digit — an emoji-only business name. */
  titleFallback?: string;
  subtitle?: string;
  badge?: string;
  brand?: string;
  theme?: Partial<Theme>;
  width?: number;
  height?: number;
  fontFamily?: string;
}

export function brandCard(opts: BrandCardOptions): string;

/* ─── Rendering ─── */

export interface RenderOptions {
  width?: number;
  fonts?: FontConfig;
  cacheKeyPrefix?: string;
}

export function renderSvg(
  svg: string,
  env?: Record<string, unknown>,
  opts?: RenderOptions,
): Promise<Uint8Array>;

export function renderCard(
  card: BrandCardOptions,
  env?: Record<string, unknown>,
  opts?: RenderOptions,
): Promise<Uint8Array>;

export function pngHeaders(opts?: {
  immutable?: boolean;
  maxAge?: number;
}): Record<string, string>;

export {
  defaultTheme,
  el,
  box,
  text,
  tile,
  tileGrid,
  parseGrid,
  theme,
} from './scene.js';
export { defaultPreset, articlePreset, scoreCardPreset, presets } from './presets.js';
export type { Theme, TileState, VNode, BoundScene } from './scene.js';
