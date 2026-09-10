# @basenative/og-image

> Worker-runtime OG / social share PNG renderer — satori + resvg-wasm with KV-cached fonts and themable scene presets.

## Overview

`@basenative/og-image` renders Open Graph / social-share card images as PNGs at request time: build a scene with the included flexbox-style DSL (or a ready-made preset), pass it to `renderPng`, and get back PNG bytes. Layout is done by [satori](https://github.com/vercel/satori) (JSX-free — the DSL emits satori's `{ type, props: { style, children } }` shape directly) and rasterization by `@resvg/resvg-wasm`.

This is a **Worker-runtime** package: its primary target is Cloudflare Workers and Pages Functions, there's no filesystem access on that path, and font loading expects a KV namespace binding (default name `OG_CACHE`) to avoid re-fetching font files on every cold isolate — without one, fonts are fetched from the CDN on every cold start and a `console.warn` is emitted. (A Node-compatible fallback for the WASM bootstrap exists purely so the package's own tests can run under `node --test`; it is not part of the supported deployment target.)

## Installation

```bash
npm install @basenative/og-image
```

## Quick Start

```js
import { renderPng, pngHeaders, defaultPreset } from '@basenative/og-image';

export default {
  async fetch(request, env) {
    // env.OG_CACHE should be a KV namespace binding for font caching.
    const scene = defaultPreset({
      title: 'v2.4 shipped',
      subtitle: 'Faster edge rendering, smaller PNGs.',
      brand: 'basenative.dev',
    });

    const png = await renderPng(scene, env);
    return new Response(png, { headers: pngHeaders() });
  },
};
```

## API Reference

### Root (`.`)

#### renderPng(scene, env, opts = {})

Renders a satori-compatible scene to PNG bytes. Loads fonts (via `defineFonts`'s config against the given `env`) and lazily initializes the resvg WASM module, then runs satori to produce SVG and resvg to rasterize it.

**Parameters:**
- `scene` — a scene tree, e.g. the output of `defaultPreset(...)`/`articlePreset(...)`/`scoreCardPreset(...)` or hand-built via `box`/`text`/`tile`/`tileGrid`
- `env` — Worker env binding map; should contain the KV namespace named by `defineFonts({ cacheBinding })` (default `OG_CACHE`)
- `opts.width` — output width in px; default `1200`
- `opts.height` — output height in px; default `630`
- `opts.fonts` — a `FontConfig` object (see `defineFonts`) to override the module's default font config for this call
- `opts.cacheKeyPrefix` — override the font cache key prefix for this call

**Returns:** `Promise<Uint8Array>` — PNG byte buffer.

Font loading and WASM init are both deduped via module-scoped guards, so warm isolates skip both entirely on subsequent calls.

---

#### pngHeaders(opts = {})

Standard headers for a PNG response. By default the response is marked immutable with a one-year cache lifetime — pass `immutable: false` for short-lived previews.

**Parameters:**
- `opts.immutable` — default `true`

**Returns:** `Record<string, string>` — `{ "Content-Type": "image/png", "Cache-Control": ... }`. When `immutable` is `false`, `Cache-Control` is `public, max-age=300, s-maxage=300` instead of the one-year immutable value.

---

#### defineFonts(cfg = {})

Defines a font configuration. The returned object is what `renderPng` (via the internal `loadFonts`) uses to fetch and cache font files — you don't normally call `loadFonts` yourself.

**Parameters:**
- `cfg.family` — font family name; default `'Inter'`
- `cfg.weights` — array of font weights to load; default `[600, 700, 800]`
- `cfg.cdnVersion` — `@fontsource` package version pinned on jsdelivr; default `'5.0.16'`
- `cfg.cacheBinding` — KV binding name on `env` to cache font bytes in; default `'OG_CACHE'`
- `cfg.cacheKeyPrefix` — KV key prefix; default `'font:'`
- `cfg.buffers` — optional `Record<weight, ArrayBuffer|Uint8Array>` escape hatch: when a weight's buffer is supplied, that weight is served directly with no KV lookup or network fetch (useful for offline dev, sandboxed CI, or tests)

**Returns:** a fully-resolved font config object.

### Scene Helpers (./scene)

Tiny object-literal builders that produce satori-compatible vh-trees without JSX or a virtual DOM library.

#### box(style, children = [])

A flexbox `<div>`. Satori requires `display: flex` on every container; this helper adds it automatically so callers don't have to remember.

**Parameters:** `style` — a style object; `children` — array (or single child) of vnodes.

**Returns:** a `VNode`.

---

#### text(style, content)

A text node. Implemented identically to `box` (satori treats text-bearing divs the same as any flex container) — kept as a separate helper purely for readability at call sites.

**Parameters:** `style` — a style object; `content` — `string | number`.

**Returns:** a `VNode`.

---

#### tile(state, opts = {})

Renders a single mini-tile — the colored square used by `tileGrid` and decorative rows (e.g. `defaultPreset`'s tile strip).

**Parameters:**
- `state` — `"green" | "yellow" | "absent" | "empty"`
- `opts.size` — px; default `44`
- `opts.theme` — partial theme tokens, merged onto `defaultTheme`

**Returns:** a `VNode`.

---

#### tileGrid(rows, opts = {})

Lays out a grid of tiles, one row of `tile()` calls per input row.

**Parameters:**
- `rows` — `TileState[][]` (e.g. from `parseGrid`)
- `opts.tileSize` — px; default `44`
- `opts.gap` — px; default `7`
- `opts.theme` — partial theme tokens

**Returns:** a `VNode`.

---

#### parseGrid(gridString)

Parses the emoji grid used in share strings (e.g. a Wordle-style result) back into `TileState[][]` for `tileGrid`. Glyph map: 🟩 green, 🟨 yellow, ⬛ absent, ⬜ empty. Unrecognized characters are skipped; empty lines produce no row.

**Parameters:** `gridString` — newline-separated emoji rows.

**Returns:** `TileState[][]`.

---

#### theme(tokens = {})

Pre-binds the scene helpers to a set of theme tokens so callers don't have to thread `{ theme: t }` through every `tile`/`tileGrid` call.

**Parameters:** `tokens` — partial `Theme`, merged onto `defaultTheme`.

**Returns:** `{ theme, box, text, tile, tileGrid, parseGrid }` — `tile`/`tileGrid` here take a simplified `(state, size)` / `(rows, opts)` signature with the theme already bound; `box`/`text`/`parseGrid` are passed through unchanged.

---

#### defaultTheme

The default theme token map, matching the t4bs palette as a starting point: `{ bg, fg, muted, accent, tile, letter, green, yellow, absent, empty }` (hex color strings). Override per-call via `theme()` or by passing a `theme` option to a preset.

---

#### el(type, style, children)

Creates a raw vh-tree element: `{ type, props: { style, children } }`. Low-level — most callers want `box` or `text` instead.

**Parameters:** `type` — element tag string (e.g. `"div"`); `style` — style object; `children` — vnode(s) or content.

**Returns:** a `VNode`.

### Presets (./presets)

Ready-to-use scene builders, each sized to 1200×630 and ready to hand straight to `renderPng`. Every preset accepts a partial `theme` merged onto `defaultTheme`, and a `brand` string defaulting to `'basenative.dev'`.

#### defaultPreset(opts)

Default brand/hero card: large accent title, optional subtitle, a decorative tile row, and a title/brand footer.

**Parameters:**
- `opts.title` — required; also used as the footer label
- `opts.subtitle` — optional
- `opts.brand` — default `'basenative.dev'`
- `opts.theme` — partial theme

**Returns:** a `VNode`.

---

#### articlePreset(opts)

Article/blog post card: uppercase kicker + accent rule on top, a dominant headline, byline and brand on the bottom.

**Parameters:**
- `opts.title` — required (rendered as the headline)
- `opts.author` — optional; rendered as `by {author}`
- `opts.kicker` — optional
- `opts.brand` — default `'basenative.dev'`
- `opts.theme` — partial theme

**Returns:** a `VNode`.

---

#### scoreCardPreset(opts)

Game-style score card: title + verdict at top with an optional category subhead, a tile-grid summary (parsed from an emoji `grid` string, capped at 6 rows) on the left and a large score number on the right, brand pinned bottom-right.

**Parameters:**
- `opts.title` — required
- `opts.verdict` — optional label (e.g. `"WON"`)
- `opts.verdictTone` — `"win" | "loss" | "neutral"`; controls the verdict color (green / red / accent); default `"neutral"`
- `opts.category` — optional subhead
- `opts.score` — required; `number | string`
- `opts.scoreLabel` — default `'pts'`
- `opts.grid` — emoji grid string parsed with `parseGrid`
- `opts.brand` — default `'basenative.dev'`
- `opts.theme` — partial theme

**Returns:** a `VNode`.

---

#### presets

The full preset map, for table-driven dispatch: `{ default: defaultPreset, article: articlePreset, scoreCard: scoreCardPreset }`.

## Integration

`@basenative/share`'s OG-redirect landing page (`buildLandingHtml`) takes an `imageUrl` for its `og:image`/`twitter:image` meta tags; that URL is expected to point at a route your app implements, typically one that calls `renderPng` from this package to produce the PNG on demand. `@basenative/share` lists `@basenative/og-image` as an optional peer dependency but does not import it directly — the two packages are designed to compose, but the rendering route itself is left to the app.

## License

Apache-2.0
