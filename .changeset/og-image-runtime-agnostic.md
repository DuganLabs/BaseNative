---
"@basenative/og-image": minor
---

Make `@basenative/og-image` actually run on Cloudflare Workers.

Every release up to 0.2.2 was written for Workers and could not execute there.
Reproduced against real workerd (`wrangler dev`, `compatibility_date`
2026-04-23, `nodejs_compat`): the first render threw `TypeError: Cannot read
properties of undefined (reading 'href')`, and with `location` shimmed ahead of
it, `ReferenceError: __dirname is not defined`. Both came from `harfbuzzjs`,
which `satori` imports unconditionally, and neither was fixable from here —
harfbuzz's entry constructs its emscripten module with no options, so the
`instantiateWasm` hook that would let a static `.wasm` be handed in is
unreachable from outside that package.

The fix is to stop needing a text shaper. `@resvg/resvg-wasm` does its own
shaping and is a single static `.wasm` that Workers accept, so a card is now an
SVG string and the layout is arithmetic.

**Breaking — `renderPng` has moved.** It is the satori path, and it is now
behind its own entry point so a Workers bundle cannot contain satori,
`yoga-layout` or `harfbuzzjs` even transitively:

```js
-import { renderPng } from "@basenative/og-image";
+import { renderPng } from "@basenative/og-image/satori";
```

`satori` is now an optional peer dependency rather than a dependency. Called on
Workers, `renderPng` throws `OgImageError` with code
`satori-unsupported-on-this-runtime` and names the replacement, instead of
surfacing a `TypeError` from three packages down. Everything else exported by
0.2.2 — the scene DSL, the presets, `defineFonts`, `pngHeaders` — is unchanged
and still exported from the main entry.

**New, all runtime-agnostic:**

- `renderCard(card, env?, opts?)` and `renderSvg(svg, env?, opts?)` — the
  Workers-capable render path. Measured on `wrangler dev`: ~730ms cold (two font
  fetches plus WASM init), 26-45ms warm.
- `brandCard(opts)` — an SVG card scene with shrink-to-fit, wrapping, soft
  breaks after `-` `/` `_` `.`, grapheme-safe truncation, RTL base direction,
  and a `titleFallback` for a name with no word character. An empty title, 200
  characters, no spaces at all, RTL, markup, a control character and a lone
  surrogate all render to a valid 1200x630 PNG; all are tested, and all are
  rasterized for real rather than shape-checked.
- `provideResvgWasm(source)` — the supported way to hand the package a
  `WebAssembly.Module` from outside, for a bundler or runtime the internal
  `#wasm-init` condition map does not cover.
- `detectRuntime()` / `isWorkerd()` / `hasFilesystem()` /
  `canCompileWasmFromBytes()` — exported because the *order* of these checks is
  the bug. workerd is tested before Node (`nodejs_compat` makes it report
  `process.versions.node`) and before browser (it defines `WorkerGlobalScope`
  and `self`, and no `location`).
- The SVG and text-layout primitives, for building your own scenes.
- `OgImageError` with a stable `code`.

**Fonts now depend on the render path, because the failure is silent.** resvg's
`fontdb` parses only raw sfnt: handed a `.woff` it loads zero faces and draws
*nothing*, producing a correctly sized card with no text. So `renderSvg` /
`renderCard` default to TTFs from `@expo-google-fonts/*` (upstream Google Fonts
at immutable npm versions) and the satori path keeps the smaller `@fontsource`
WOFFs. Cache keys now include the format and CDN version so the two can never
be crossed. `cacheBinding: null` declares "no KV on purpose" and silences the
warning, which is now emitted once per isolate rather than once per file.

**Also fixed:** `Resvg` and its rendered image are now freed after each render
(they hold WASM-heap allocations, and a warm isolate serves many requests);
`wasm.node.js` uses `import.meta.resolve` instead of `createRequire`; and the
width table behind the layout is measured against resvg's own `getBBox()` rather
than guessed — a test re-measures it and fails if it ever becomes optimistic.

`test/import-graph.test.js` is the regression guard: it walks the real module
graph from the main entry under wrangler's own export conditions and fails if
anything reachable imports satori, a `node:` builtin, or references `__dirname`.
It fails on 0.2.2.
