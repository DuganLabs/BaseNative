# @basenative/og-image

## 0.2.2

### Patch Changes

- 9741b75: Public-readiness metadata sweep, no behavior change:

  - Add a per-package `LICENSE` file (Apache-2.0) — previously only the repo root
    carried one, so it was never included in the published tarball.
  - Fix `repository.url`/`homepage`/`bugs.url` to the correct `DuganLabs/BaseNative`
    casing with a `git+` prefix on `repository.url`, matching npm's convention; add
    the `bugs` field to `@basenative/eslint-config` and `@basenative/tsconfig`, which
    were missing it.
  - Normalize `publishConfig` to `{ "access": "public" }` across every publishable
    package. The previous per-package `registry` override duplicated the scope
    mapping `.npmrc` already sets for `@basenative:*` (and that the Release/publish
    workflows reassert via `actions/setup-node`'s `registry-url`/`scope` inputs), so
    it only added drift risk and would have blocked a future npmjs registry target.
  - Fix README `## License` sections that said `MIT` while `package.json` and the
    repo `LICENSE` say `Apache-2.0` (`auth`, `config`, `date`, `db`, `fetch`, `flags`,
    `fonts`, `forms`, `i18n`, `icons`, `logger`, `marketplace`, `middleware`,
    `notify`, `realtime`, `router`, `runtime`, `server`, `tenant`, `upload`,
    `visual-builder`); add a missing `## License` section to `builder` and `evals`.
  - Add the missing `README.md` for `@basenative/integrations` (Plaid Link +
    accounts/transfers, and the pure float-yield-optimization math).

  No `private`/version/`exports` changes. `@basenative/evals`, `fonts`, and `icons`
  stay private and are not part of this changeset.

## 0.2.1

### Patch Changes

- 8a9c7f1: renderPng works under Node

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
