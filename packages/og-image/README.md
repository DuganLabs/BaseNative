# @basenative/og-image

> Runtime-agnostic OG / social share PNG renderer — SVG card scenes rasterized by `resvg-wasm`, with CDN + KV-cached fonts. Runs on Cloudflare Workers, Node, Deno and Bun.

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

Renders 1200x630 PNGs at request time for `og:image`, `twitter:image`, and arbitrary share-card endpoints.

## Read this first if you are upgrading from 0.2.x

`renderPng` — the satori entry point — **has moved** to a separate export:

```js
-import { renderPng } from "@basenative/og-image";
+import { renderPng } from "@basenative/og-image/satori";
```

and `satori` is now an **optional peer dependency**: install it yourself if you
use that path. On Cloudflare Workers you cannot; use `renderCard`/`renderSvg`
from the main entry instead, which is what this release exists to provide.

### Why

Every version of this package up to and including 0.2.2 **could not execute on
Cloudflare Workers at all**, despite being written for them. `satori` imports
`harfbuzzjs` (its text shaper) unconditionally, and harfbuzz's emscripten loader
asks two environment questions in an order workerd answers wrongly. Reproduced
against real workerd (`wrangler dev`, `compatibility_date` 2026-04-23,
`nodejs_compat`):

1. `TypeError: Cannot read properties of undefined (reading 'href')` — the
   loader sees `WorkerGlobalScope`, concludes "browser worker", and reads
   `self.location.href`. workerd defines `WorkerGlobalScope` and `self`, and
   defines **no `location`**.
2. Shim `location` ahead of it and you get `ReferenceError: __dirname is not
   defined` — `nodejs_compat` gives workerd a `process.versions.node`, so the
   loader next concludes "Node" and goes looking for `hb.wasm` on a filesystem
   that does not exist. wrangler does not bundle that file, and the remaining
   branch compiles WASM from a buffer, which the embedder refuses outright
   (`Wasm code generation disallowed by embedder` — also measured).

Fixing (2) requires `harfbuzzjs` to accept emscripten's `Module.instantiateWasm`
hook so a statically imported `.wasm` can be handed in. `hb.js` honours the hook;
`harfbuzzjs`'s entry calls `hb()` with no arguments, so no downstream package can
supply it. A wrangler `[alias]` cannot stand in either — aliasing `harfbuzzjs`
rewrites its subpaths, so the replacement can no longer resolve the real
`hb.js`/`hb.wasm`.

So the fix is to not need a text shaper. `@resvg/resvg-wasm` does its own
shaping, and it is a single static `.wasm` that Workers accept. A card is now an
SVG string, and the layout engine is `text.js` — arithmetic over measured glyph
advances, which runs anywhere.

## Install

```bash
npm install @basenative/og-image
# only if you use the satori entry point:
npm install satori
```

## Quick start

```js
// src/worker.js — Cloudflare Worker
import { renderCard, pngHeaders } from "@basenative/og-image";

export default {
  async fetch(request, env) {
    const png = await renderCard(
      {
        title: "Northside Electrical",
        subtitle: "Electrical — Manchester, NH",
        badge: "Licensed electrician",
        brand: "northside.example.com",
      },
      env,
    );
    return new Response(png, { headers: pngHeaders() });
  },
};
```

Measured on `wrangler dev`: ~730ms on a cold isolate (two font fetches plus WASM
init), 26-45ms warm.

## Cards

### `brandCard(opts) → string` (SVG)

The generic entity card: a name, a qualifying line, an optional badge, and a
brand line pinned to the bottom.

```js
import { brandCard, renderSvg } from "@basenative/og-image";

const svg = brandCard({
  title: "Northside Electrical",
  titleFallback: "northside",          // used if `title` has no letter or digit
  subtitle: "Electrical — Manchester, NH",
  badge: "Licensed electrician",
  brand: "northside.example.com",
  theme: { accent: "#4EAF7C" },
  width: 1200,
  height: 630,
});
const png = await renderSvg(svg, env);
```

**No input can break the layout.** Every run is fitted to a width budget and the
whole stack is fitted to the height between the top padding and the brand line.
An empty title, a 200-character title, a title with no spaces at all, RTL script,
markup, a control character and a lone surrogate are all covered by tests, and
all render to a valid 1200x630 PNG.

Text handling worth knowing about:

- **Shrink-to-fit then wrap**, up to three lines, then ellipsis.
- **Soft breaks** after `-`, `/`, `_` and `.`, so a slugged name breaks at
  `greenleaf-` / `landscaping` rather than mid-word.
- **Grapheme-safe truncation** — never emits a lone surrogate, which would make
  the document invalid XML.
- **RTL** sets `direction="rtl"` when the content is predominantly RTL script.
- **XML-illegal characters are removed, not escaped** — a stray control
  character in a database column would otherwise turn one bad row into a 500 on
  a public page.

### Font coverage is a real limit

The rasterizer draws only glyphs present in the font buffers it is given, and
the default is a Latin Inter. A CJK, Devanagari or Arabic title measures and
lays out correctly and then renders as `.notdef` boxes. `brandCard` limits the
damage — it always draws the `brand` line, so the card still identifies its
subject — but if you serve those scripts, supply a covering face:

```js
await renderCard(card, env, {
  fonts: { urls: { 600: "https://…/NotoSansArabic-SemiBold.ttf" } },
});
```

`titleFallback` covers the narrower case of a name with no word character at all
(an emoji-only business name): the fallback is drawn instead.

### `OG_SIZE`

`{ width: 1200, height: 630 }` — above Facebook's 600x315 minimum, exactly the
1.91:1 ratio it documents, and inside the 2:1..1:1 window X requires for
`summary_large_image`.

## Fonts

Two render paths need two formats, and getting it wrong is silent:

| Path | Format | Source | Why |
| --- | --- | --- | --- |
| `renderSvg` / `renderCard` | `ttf` | `@expo-google-fonts/*` (upstream Google TTFs at immutable npm versions) | resvg's `fontdb` only parses raw sfnt. Hand it a `.woff` and it loads **zero faces and draws nothing** — a correctly sized card with the text missing. |
| `@basenative/og-image/satori` | `woff` | `@fontsource/*` | satori decompresses WOFF itself; the files are ~5x smaller. |

```js
import { defineFonts } from "@basenative/og-image";

defineFonts({
  family: "Inter",
  weights: [600, 800],
  format: "ttf",
  cdnVersion: "0.2.3",
  cacheBinding: "OG_CACHE", // KV binding name; `null` = deliberately none
  cacheKeyPrefix: "font:",
  urls: { 600: "https://…/Custom-SemiBold.ttf" }, // per-weight override
  buffers: { 600: bytes },                         // skip the network entirely
});
```

Cache keys include the format and CDN version, so a WOFF cached by the satori
path can never be served to the rasterizer path.

### Caching without KV

Fonts are fetched with `cf: { cacheTtl: 86400, cacheEverything: true }`, so
Cloudflare's own edge cache absorbs cold-isolate misses even with no KV
namespace. Pass `cacheBinding: null` to say that is deliberate and silence the
warning. With KV:

```bash
wrangler kv namespace create OG_CACHE
```

```toml
[[kv_namespaces]]
binding = "OG_CACHE"
id = "<id>"
```

## Supplying the WASM module

The package resolves the resvg `.wasm` itself: a static import under
wrangler/esbuild (which compiles it ahead of time — Workers refuse to compile
WASM from a buffer), and a filesystem read under Node. If neither fits your
runtime or bundler, hand it in:

```js
import wasm from "@resvg/resvg-wasm/index_bg.wasm"; // your bundler
import { provideResvgWasm } from "@basenative/og-image";

provideResvgWasm(wasm); // WebAssembly.Module, bytes, a Response, or a promise
```

Call it at module scope, before the first render. What you provide wins over the
built-in resolution, which is then never consulted.

## Runtime detection

`detectRuntime()` is exported because the order of its checks is the whole
subject of this release:

```js
import { detectRuntime, isWorkerd, hasFilesystem } from "@basenative/og-image";

detectRuntime(); // "workerd" | "node" | "deno" | "bun" | "browser" | "unknown"
```

- **workerd is checked before Node**, because `nodejs_compat` makes it report
  `process.versions.node`.
- **workerd is checked before browser**, because it defines `WorkerGlobalScope`
  and `self`. The signal that separates it from a real browser worker is that a
  browser worker *has* a `location`.

## Caching the images themselves

`pngHeaders()` marks the response immutable for a year by default, because the
intended addressing scheme is content-addressed: put a hash of the card's own
text in the URL, so renaming the subject changes the URL and no crawler is left
holding a stale card. If your URL is not content-addressed, pass
`{ immutable: false }`.

## API

| Export | Purpose |
| --- | --- |
| `renderCard(card, env?, opts?)` | Build a brand card and rasterize it. |
| `renderSvg(svg, env?, opts?)` | Rasterize any SVG string. |
| `brandCard(opts)` | Build the card scene without rendering. |
| `pngHeaders(opts?)` | `Content-Type` + `Cache-Control`. |
| `provideResvgWasm(source)` | Supply the WASM module explicitly. |
| `defineFonts`, `loadFontBuffers`, `loadFonts`, `fontUrl`, `fontCacheKey` | Fonts. |
| `detectRuntime`, `isWorkerd`, `hasFilesystem`, `canCompileWasmFromBytes` | Environment. |
| `escapeXml`, `num`, `rect`, `textLine`, `textBlock`, `headline`, `clippedLine`, `svgDoc` | SVG primitives, for custom scenes. |
| `graphemes`, `estimateWidth`, `isRtl`, `hasWordCharacter`, `truncateGraphemes`, `truncateToWidth`, `wrapToLines`, `fitText` | Text layout. |
| `OgImageError` | Thrown with a stable `code`. |
| `box`, `text`, `tile`, `tileGrid`, `parseGrid`, `theme`, `defaultTheme`, `el`, `defaultPreset`, `articlePreset`, `scoreCardPreset`, `presets` | satori scene DSL — data only; render via the `/satori` entry. |

`@basenative/og-image/satori` additionally exports `renderPng(scene, env?, opts?)`.

## Theming

```js
brandCard({
  title: "Hello",
  theme: { bg: "#0a0a0a", fg: "#fafafa", accent: "#7c3aed", muted: "#71717a" },
});
```

Tokens: `bg`, `fg`, `accent`, `muted`, `tile`, `letter`, `green`, `yellow`,
`absent`, `empty`.

## Errors

`OgImageError` carries a stable `code`:

| Code | Meaning |
| --- | --- |
| `satori-unsupported-on-this-runtime` | You called the satori entry point on Workers. |
| `wasm-source-unavailable` | Neither the import map nor `provideResvgWasm` yielded a module. |
| `wasm-source-invalid` | `provideResvgWasm` was handed something that is not a module, bytes or a `Response`. |
| `font-fetch-failed` | The CDN refused, or no TTF is known for that family/weight. |
| `no-fonts` | The resolved weight list was empty; the rasterizer would draw nothing. |

## License

Apache-2.0
