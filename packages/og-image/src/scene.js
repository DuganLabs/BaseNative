// Built with BaseNative — basenative.dev
/**
 * Scene DSL helpers — tiny object-literal builders that produce
 * satori-compatible vh-trees without JSX/React.
 *
 * The shape `{ type, props: { style, children } }` is exactly what satori
 * accepts, so the output of these helpers can be passed directly to
 * `renderPng` (or to satori itself).
 *
 * @module
 */

/** @typedef {Record<string, any>} Style */
/** @typedef {{ type: string, props: { style: Style, children: any } }} VNode */

/** @typedef {{ bg: string, fg: string, accent: string, muted: string, tile?: string, letter?: string, green?: string, yellow?: string, absent?: string, empty?: string }} Theme */

/**
 * Default theme tokens — match the t4bs palette as a sensible starting
 * point. Override per-call via `theme()` or by passing a `theme` arg to a
 * preset.
 *
 * @type {Required<Theme>}
 */
export const defaultTheme = {
  bg: "#0C0B09",
  fg: "#F0EDE4",
  muted: "#988570",
  accent: "#E8920A",
  tile: "#FFF3E0",
  letter: "#5C2A00",
  green: "#3F9D5B",
  yellow: "#E8B73B",
  absent: "#3A332B",
  empty: "#1A1714",
};

/**
 * Create a vh-tree element. Low-level — most callers want `box` or `text`.
 *
 * @param {string} type
 * @param {Style} style
 * @param {any} children
 * @returns {VNode}
 */
export function el(type, style, children) {
  return { type, props: { style, children } };
}

/**
 * A flexbox `<div>`. Satori requires `display: flex` on every container,
 * so this helper enforces it.
 *
 * @param {Style} style
 * @param {any} [children]
 * @returns {VNode}
 */
export function box(style, children = []) {
  return el("div", { display: "flex", ...style }, children);
}

/**
 * A text node. Satori treats text-bearing divs the same as any flex
 * container; we keep the helper distinct for readability.
 *
 * @param {Style} style
 * @param {string | number} content
 * @returns {VNode}
 */
export function text(style, content) {
  return el("div", { display: "flex", ...style }, content);
}

/** @typedef {"green" | "yellow" | "absent" | "empty"} TileState */

/**
 * Render a single mini-tile (used by `tileGrid` and decorative rows).
 *
 * @param {TileState} state
 * @param {{ size?: number, theme?: Theme }} [opts]
 * @returns {VNode}
 */
export function tile(state, opts = {}) {
  const size = opts.size ?? 44;
  const t = { ...defaultTheme, ...(opts.theme || {}) };
  const colorMap = { green: t.green, yellow: t.yellow, absent: t.absent, empty: t.empty };
  return box(
    {
      width: size,
      height: size,
      borderRadius: Math.max(4, Math.round(size / 6)),
      backgroundColor: colorMap[state] || t.empty,
      border: state === "empty" ? `1px solid ${t.absent}` : "none",
    },
    [],
  );
}

/**
 * Parse the emoji grid that share-strings use back into tile states.
 * Glyph map: 🟩 green, 🟨 yellow, ⬛ absent, ⬜ empty.
 *
 * @param {string} gridString
 * @returns {TileState[][]}
 */
export function parseGrid(gridString) {
  /** @type {TileState[][]} */
  const rows = [];
  for (const line of String(gridString || "").split("\n")) {
    /** @type {TileState[]} */
    const row = [];
    for (const ch of line) {
      if (ch === "\u{1F7E9}") row.push("green");
      else if (ch === "\u{1F7E8}") row.push("yellow");
      else if (ch === "⬛") row.push("absent");
      else if (ch === "⬜") row.push("empty");
    }
    if (row.length) rows.push(row);
  }
  return rows;
}

/**
 * Lay out a grid of tiles.
 *
 * @param {TileState[][]} rows
 * @param {{ tileSize?: number, gap?: number, theme?: Theme }} [opts]
 * @returns {VNode}
 */
export function tileGrid(rows, opts = {}) {
  const tileSize = opts.tileSize ?? 44;
  const gap = opts.gap ?? 7;
  const theme = opts.theme;
  return box(
    { flexDirection: "column", gap },
    rows.map((row) =>
      box(
        { flexDirection: "row", gap },
        row.map((state) => tile(state, { size: tileSize, theme })),
      ),
    ),
  );
}

/**
 * Pre-bind the scene helpers to a theme. Returns helpers that automatically
 * thread the theme through to anything that consumes tokens (`tile`,
 * `tileGrid`).
 *
 * @param {Theme} [tokens]
 * @returns {{
 *   theme: Required<Theme>,
 *   box: typeof box,
 *   text: typeof text,
 *   tile: (state: TileState, size?: number) => VNode,
 *   tileGrid: (rows: TileState[][], opts?: { tileSize?: number, gap?: number }) => VNode,
 *   parseGrid: typeof parseGrid,
 * }}
 */
export function theme(tokens = {}) {
  const merged = { ...defaultTheme, ...tokens };
  return {
    theme: merged,
    box,
    text,
    tile: (state, size) => tile(state, { size, theme: merged }),
    tileGrid: (rows, opts) => tileGrid(rows, { ...(opts || {}), theme: merged }),
    parseGrid,
  };
}
