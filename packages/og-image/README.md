# @basenative/og-image

> Worker-runtime OG / social share PNG renderer — satori + resvg-wasm with KV-cached fonts and themable scene presets.

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

Renders dynamic 1200x630 PNGs at the edge for `og:image`, `twitter:image`, and arbitrary share-card endpoints. Designed for Cloudflare Workers and Pages Functions, but the public API is platform-neutral apart from the WASM bootstrap.

## Install

```bash
npm install @basenative/og-image
```

You also need wrangler to bundle the static `.wasm` import — see [wrangler setup](#wrangler-setup) below.

## Quick Start

```js
// functions/og.js — Cloudflare Pages Function
import { renderPng, pngHeaders, defaultPreset } from "@basenative/og-image";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? "BaseNative";

  const scene = defaultPreset({
    title,
    subtitle: "Build native web apps without a build step.",
    brand: "basenative.dev",
  });

  const png = await renderPng(scene, env);
  return new Response(png, { headers: pngHeaders() });
}
```

That's it. First request on a cold isolate fetches the Inter weights from jsdelivr and stores them in KV (~120ms cold). Subsequent requests on the same warm isolate render in ~10ms.

## Presets

### `defaultPreset({ title, subtitle, accent, brand, theme? })`

Hero / brand card: large accent, subtitle, decorative tile row, brand pinned bottom-right.

```js
import { defaultPreset } from "@basenative/og-image/presets";

const scene = defaultPreset({
  title: "Five-letter battle of bullshit",
  subtitle: "One subject. One phrase. Stake the letters you're sure about.",
  accent: "T4BS",
  brand: "t4bs.com",
});
```

### `articlePreset({ title, author, kicker, accent, brand, theme? })`

Blog / article card: kicker rule on top, headline center, byline bottom-left, brand bottom-right.

```js
const scene = articlePreset({
  kicker: "Engineering",
  title: "A clear-eyed look at signals on the platform",
  author: "Warren Dugan",
  brand: "basenative.dev",
});
```

### `scoreCardPreset({ title, verdict, verdictTone, category, score, scoreLabel, grid, brand, theme? })`

Game-style score card — lifts the t4bs design. Includes a parsed emoji-grid summary and a giant score number.

```js
const scene = scoreCardPreset({
  title: "T4BS",
  verdict: "Solved",
  verdictTone: "win", // "win" | "loss" | "neutral"
  category: "Movies of 1999",
  score: 1240,
  scoreLabel: "pts",
  grid: "🟩🟩🟨⬛⬛\n🟩🟩🟩🟩🟩",
  brand: "t4bs.com",
});
```

## Theming

Every preset accepts a partial `theme` token map merged onto `defaultTheme`:

```js
import { defaultPreset, defaultTheme } from "@basenative/og-image";

const scene = defaultPreset({
  title: "Hello",
  theme: {
    bg: "#0a0a0a",
    fg: "#fafafa",
    accent: "#7c3aed",
    muted: "#71717a",
  },
});
```

Tokens: `bg`, `fg`, `accent`, `muted`, `tile`, `letter`, `green`, `yellow`, `absent`, `empty`.

For custom scenes, the `theme()` helper pre-binds the helpers to your tokens:

```js
import { theme, renderPng } from "@basenative/og-image";

const t = theme({ accent: "#7c3aed" });
const scene = t.box(
  { width: 1200, height: 630, padding: 80, backgroundColor: t.theme.bg, color: t.theme.fg },
  [
    t.text({ fontSize: 120, fontWeight: 800, color: t.theme.accent }, "Hello"),
    t.tileGrid([["green", "yellow", "absent"]]),
  ],
);
```

## Custom fonts

Default loader pulls Inter 600/700/800 from jsdelivr's `@fontsource/inter@5.0.16`. Override per-render:

```js
import { renderPng, defineFonts } from "@basenative/og-image";

const fonts = defineFonts({
  family: "Inter Tight",
  weights: [400, 600, 800],
  cdnVersion: "5.0.16",
  cacheBinding: "OG_CACHE",   // KV namespace binding name on `env`
  cacheKeyPrefix: "font:",     // KV key namespace
});

await renderPng(scene, env, { fonts });
```

Anything published to `@fontsource/<family>` on jsdelivr will work.

## KV cache setup

The font loader looks for a KV binding on `env` (default name `OG_CACHE`). Create one and bind it in your `wrangler.toml`:

```bash
wrangler kv:namespace create OG_CACHE
```

```toml
# wrangler.toml
name = "my-app"
main = "src/worker.js"
compatibility_date = "2024-12-01"

[[kv_namespaces]]
binding = "OG_CACHE"
id = "<id from `wrangler kv:namespace create`>"

# Required for the static `.wasm` import to bundle correctly.
rules = [
  { type = "CompiledWasm", globs = ["**/*.wasm"], fallthrough = true },
]
```

If no binding is present, the loader will warn and re-fetch on every cold start — fine for local dev, not for production.

## Wrangler setup

Cloudflare Workers require WASM to be statically imported so wrangler can bundle it as a `WebAssembly.Module`. This package handles that import internally — you just need the `CompiledWasm` rule shown above. Do **not** try to load the WASM via `fetch` + `instantiate`; it will fail with `Wasm code generation disallowed by embedder`.

## Performance notes

| Path                            | Latency |
| ------------------------------- | ------- |
| Cold isolate, KV miss           | ~250ms (jsdelivr fetch dominates) |
| Cold isolate, KV hit            | ~120ms (KV reads + WASM init) |
| Warm isolate                    | ~10ms (everything memoized) |

Bytes returned by `renderPng` are PNG-encoded by resvg's WASM build; they're a `Uint8Array` you can pass straight into `new Response(...)`.

The package is `< 8KB` minzipped, exclusive of `satori` (~80KB) and `@resvg/resvg-wasm` (~700KB WASM blob).

## API

### `renderPng(scene, env, opts?) → Promise<Uint8Array>`

Render a satori-compatible scene to PNG bytes.

- `scene` — a vh-tree from a preset or hand-built via the scene helpers.
- `env` — Worker `env` (must contain the KV namespace bound at `cacheBinding`, default `OG_CACHE`).
- `opts.width` / `opts.height` — default 1200x630.
- `opts.fonts` — `FontConfig` to override per-render.
- `opts.cacheKeyPrefix` — quick override of the KV key namespace.

### `pngHeaders(opts?) → Record<string,string>`

- `opts.immutable` — when true (default), emits one-year immutable cache headers. When false, emits a 5-minute cache window for previews.

### `defineFonts(cfg?) → Required<FontConfig>`

Resolve a font config with sensible defaults. Pass the result to `renderPng({ fonts: ... })` or to `loadFonts` directly.

### Scene helpers (`@basenative/og-image/scene`)

`box(style, children)`, `text(style, content)`, `tile(state, opts?)`, `tileGrid(rows, opts?)`, `parseGrid(emojiString)`, `theme(tokens?)`, `defaultTheme`, `el(type, style, children)`.

### Presets (`@basenative/og-image/presets`)

`defaultPreset`, `articlePreset`, `scoreCardPreset`, plus the `presets` map for table-driven dispatch.

## License

Apache-2.0
