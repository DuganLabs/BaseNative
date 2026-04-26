// Built with BaseNative — basenative.dev
/**
 * Ready-to-use OG scene presets. Each preset returns a satori-compatible
 * vh-tree sized to 1200x630 — feed the result straight into `renderPng`.
 *
 * Every preset accepts a partial `Theme` token map, merged onto
 * `defaultTheme`. Brand strings default to `basenative.dev` but should be
 * overridden per-app.
 *
 * @module
 */

import { box, text, tile, tileGrid, parseGrid, defaultTheme } from "./scene.js";

/** @typedef {import("./scene.js").Theme} Theme */
/** @typedef {import("./scene.js").VNode} VNode */

const W = 1200;
const H = 630;

/**
 * @param {Partial<Theme>} [t]
 * @returns {Required<Theme>}
 */
function resolveTheme(t) {
  return { ...defaultTheme, ...(t || {}) };
}

/**
 * Default brand / hero card. Title + subtitle + decorative tile row.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   accent?: string,
 *   brand?: string,
 *   theme?: Partial<Theme>,
 * }} opts
 * @returns {VNode}
 */
export function defaultPreset(opts) {
  const { title, subtitle = "", accent = title, brand = "basenative.dev" } = opts;
  const t = resolveTheme(opts.theme);
  return box(
    {
      width: W,
      height: H,
      flexDirection: "column",
      backgroundColor: t.bg,
      color: t.fg,
      padding: 80,
      fontFamily: "Inter",
      justifyContent: "center",
    },
    [
      text(
        { fontSize: 200, fontWeight: 800, color: t.accent, letterSpacing: -8, lineHeight: 1 },
        accent,
      ),
      subtitle
        ? text(
            {
              fontSize: 56,
              fontWeight: 700,
              color: t.fg,
              marginTop: 12,
              lineHeight: 1.15,
              maxWidth: 1040,
            },
            subtitle,
          )
        : box({}, []),
      box({ flexDirection: "row", alignItems: "center", marginTop: 64, gap: 16 },
        ["green", "yellow", "absent", "empty", "green", "yellow"].map((s) =>
          tile(/** @type {any} */ (s), { size: 80, theme: t }),
        ),
      ),
      box(
        {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: "auto",
        },
        [
          text({ fontSize: 32, fontWeight: 600, color: t.muted }, title),
          text({ fontSize: 32, fontWeight: 700, color: t.accent }, brand),
        ],
      ),
    ],
  );
}

/**
 * Article / blog post card. Kicker on top, headline dominant, byline below.
 *
 * @param {{
 *   title: string,
 *   author?: string,
 *   kicker?: string,
 *   accent?: string,
 *   brand?: string,
 *   theme?: Partial<Theme>,
 * }} opts
 * @returns {VNode}
 */
export function articlePreset(opts) {
  const { title, author = "", kicker = "", brand = "basenative.dev" } = opts;
  const t = resolveTheme(opts.theme);
  return box(
    {
      width: W,
      height: H,
      flexDirection: "column",
      backgroundColor: t.bg,
      color: t.fg,
      padding: 80,
      fontFamily: "Inter",
      justifyContent: "space-between",
    },
    [
      // Top: kicker + accent rule
      box({ flexDirection: "column", gap: 18 }, [
        kicker
          ? text(
              {
                fontSize: 28,
                fontWeight: 700,
                color: t.accent,
                letterSpacing: 6,
                textTransform: "uppercase",
                lineHeight: 1,
              },
              kicker,
            )
          : box({}, []),
        box({ width: 96, height: 6, backgroundColor: t.accent, borderRadius: 3 }, []),
      ]),

      // Middle: headline
      text(
        {
          fontSize: 84,
          fontWeight: 800,
          color: t.fg,
          letterSpacing: -2,
          lineHeight: 1.05,
          maxWidth: 1040,
        },
        title,
      ),

      // Bottom: author + brand
      box(
        {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        },
        [
          text(
            { fontSize: 32, fontWeight: 600, color: t.muted, lineHeight: 1 },
            author ? `by ${author}` : "",
          ),
          text(
            { fontSize: 32, fontWeight: 700, color: t.accent, lineHeight: 1 },
            brand,
          ),
        ],
      ),
    ],
  );
}

/**
 * Game-style score card. Lifts the t4bs design: brand + verdict at top,
 * tile-grid summary on the left and the score number on the right, brand
 * pinned bottom-right.
 *
 * @param {{
 *   title: string,
 *   verdict?: string,
 *   verdictTone?: "win" | "loss" | "neutral",
 *   category?: string,
 *   score: number | string,
 *   scoreLabel?: string,
 *   grid?: string,
 *   brand?: string,
 *   theme?: Partial<Theme>,
 * }} opts
 * @returns {VNode}
 */
export function scoreCardPreset(opts) {
  const {
    title,
    verdict = "",
    verdictTone = "neutral",
    category = "",
    score,
    scoreLabel = "pts",
    grid = "",
    brand = "basenative.dev",
  } = opts;
  const t = resolveTheme(opts.theme);
  const rows = parseGrid(grid).slice(0, 6);
  const verdictColor =
    verdictTone === "win" ? t.green : verdictTone === "loss" ? "#E84444" : t.accent;

  return box(
    {
      width: W,
      height: H,
      flexDirection: "column",
      backgroundColor: t.bg,
      color: t.fg,
      padding: 60,
      fontFamily: "Inter",
      justifyContent: "space-between",
    },
    [
      // Top: title + verdict, plus category subhead
      box({ flexDirection: "column" }, [
        box({ flexDirection: "row", alignItems: "baseline", gap: 18 }, [
          text(
            {
              fontSize: 84,
              fontWeight: 800,
              color: t.accent,
              letterSpacing: -3,
              lineHeight: 1,
            },
            title,
          ),
          verdict
            ? text(
                {
                  fontSize: 28,
                  fontWeight: 700,
                  color: verdictColor,
                  letterSpacing: 6,
                  textTransform: "uppercase",
                  lineHeight: 1,
                },
                verdict,
              )
            : box({}, []),
        ]),
        category
          ? text(
              {
                fontSize: 36,
                fontWeight: 600,
                color: t.muted,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginTop: 14,
                lineHeight: 1.1,
                maxWidth: 1080,
              },
              category,
            )
          : box({}, []),
      ]),

      // Middle: grid (left) + score (right)
      box(
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        },
        [
          rows.length
            ? tileGrid(rows, { tileSize: 52, gap: 8, theme: t })
            : box({ width: 1, height: 1 }, []),
          box({ flexDirection: "row", alignItems: "baseline", gap: 14 }, [
            text(
              {
                fontSize: 200,
                fontWeight: 800,
                color: t.fg,
                letterSpacing: -8,
                lineHeight: 1,
              },
              String(score),
            ),
            text(
              { fontSize: 60, fontWeight: 700, color: t.accent, lineHeight: 1 },
              scoreLabel,
            ),
          ]),
        ],
      ),

      // Bottom: brand pinned right
      box({ flexDirection: "row", justifyContent: "flex-end" }, [
        text(
          {
            fontSize: 30,
            fontWeight: 700,
            color: t.muted,
            letterSpacing: 1,
            lineHeight: 1,
          },
          brand,
        ),
      ]),
    ],
  );
}

/**
 * The full preset map — handy for table-driven dispatch.
 *
 * @type {Record<string, Function>}
 */
export const presets = {
  default: defaultPreset,
  article: articlePreset,
  scoreCard: scoreCardPreset,
};
