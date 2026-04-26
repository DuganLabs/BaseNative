// Built with BaseNative — basenative.dev

export interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: "normal" | "italic";
}

export interface FontConfig {
  family?: string;
  weights?: number[];
  cdnVersion?: string;
  cacheBinding?: string;
  cacheKeyPrefix?: string;
}

export interface Theme {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  tile?: string;
  letter?: string;
  green?: string;
  yellow?: string;
  absent?: string;
  empty?: string;
}

export type TileState = "green" | "yellow" | "absent" | "empty";

export interface VNode {
  type: string;
  props: { style: Record<string, unknown>; children: any };
}

export interface RenderOptions {
  width?: number;
  height?: number;
  fonts?: FontConfig;
  cacheKeyPrefix?: string;
}

export const defaultTheme: Required<Theme>;

export function defineFonts(cfg?: FontConfig): Required<FontConfig>;

export function renderPng(
  scene: VNode,
  env: Record<string, unknown>,
  opts?: RenderOptions,
): Promise<Uint8Array>;

export function pngHeaders(opts?: { immutable?: boolean }): Record<string, string>;

/* Scene helpers */
export function el(type: string, style: Record<string, unknown>, children: any): VNode;
export function box(style: Record<string, unknown>, children?: any): VNode;
export function text(style: Record<string, unknown>, content: string | number): VNode;
export function tile(
  state: TileState,
  opts?: { size?: number; theme?: Theme },
): VNode;
export function tileGrid(
  rows: TileState[][],
  opts?: { tileSize?: number; gap?: number; theme?: Theme },
): VNode;
export function parseGrid(gridString: string): TileState[][];

export interface BoundScene {
  theme: Required<Theme>;
  box: typeof box;
  text: typeof text;
  tile: (state: TileState, size?: number) => VNode;
  tileGrid: (
    rows: TileState[][],
    opts?: { tileSize?: number; gap?: number },
  ) => VNode;
  parseGrid: typeof parseGrid;
}

export function theme(tokens?: Partial<Theme>): BoundScene;

/* Presets */
export function defaultPreset(opts: {
  title: string;
  subtitle?: string;
  accent?: string;
  brand?: string;
  theme?: Partial<Theme>;
}): VNode;

export function articlePreset(opts: {
  title: string;
  author?: string;
  kicker?: string;
  accent?: string;
  brand?: string;
  theme?: Partial<Theme>;
}): VNode;

export function scoreCardPreset(opts: {
  title: string;
  verdict?: string;
  verdictTone?: "win" | "loss" | "neutral";
  category?: string;
  score: number | string;
  scoreLabel?: string;
  grid?: string;
  brand?: string;
  theme?: Partial<Theme>;
}): VNode;

export const presets: {
  default: typeof defaultPreset;
  article: typeof articlePreset;
  scoreCard: typeof scoreCardPreset;
};
