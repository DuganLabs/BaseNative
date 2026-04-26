# @basenative/og-image

## 0.2.0

### Minor Changes

- 3ce5feb: Initial release: Worker-runtime OG / social-share PNG renderer built on satori + resvg-wasm with KV-cached fonts/wasm and a themable scene preset DSL (default, article, score-card).

## 0.1.0 — initial extraction from t4bs.

- `renderPng(scene, env, opts?)` — satori + resvg-wasm pipeline for Cloudflare Workers / Pages Functions.
- `pngHeaders(opts?)` — content-type + cache headers helper.
- `defineFonts({ family, weights, cdnVersion, cacheBinding, cacheKeyPrefix })` — opt-in font loader with KV-backed caching (default binding: `OG_CACHE`).
- Scene DSL: `box`, `text`, `tile`, `tileGrid`, `parseGrid`, `theme`, `defaultTheme`.
- Presets: `defaultPreset`, `articlePreset`, `scoreCardPreset` — themable via partial token maps.
- Module-scoped state for warm-isolate reuse: KV reads collapse to in-memory after the first hit; resvg WASM init is deduped across concurrent callers.
- Static `.wasm` import via `@resvg/resvg-wasm/index_bg.wasm` so wrangler bundles a `WebAssembly.Module` (required on Workers).
