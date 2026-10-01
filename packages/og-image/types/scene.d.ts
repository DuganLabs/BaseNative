// Built with BaseNative — basenative.dev

/* Scene DSL for satori (data only; render via "@basenative/og-image/satori"). */

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

export const defaultTheme: Required<Theme>;

export type TileState = "green" | "yellow" | "absent" | "empty";

export interface VNode {
  type: string;
  props: { style: Record<string, unknown>; children: any };
}

export function el(type: string, style: Record<string, unknown>, children: any): VNode;
export function box(style: Record<string, unknown>, children?: any): VNode;
export function text(style: Record<string, unknown>, content: string | number): VNode;
export function tile(state: TileState, opts?: { size?: number; theme?: Theme }): VNode;
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
  tileGrid: (rows: TileState[][], opts?: { tileSize?: number; gap?: number }) => VNode;
  parseGrid: typeof parseGrid;
}

export function theme(tokens?: Partial<Theme>): BoundScene;
