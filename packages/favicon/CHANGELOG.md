# @basenative/favicon

## 1.0.3

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

## 1.0.2

### Patch Changes

- 1bfd837: Fix a polynomial ReDoS surface (CodeQL `js/polynomial-redos`) in `buildManifest`: trailing slashes on the caller-supplied `iconBaseUrl` were stripped with `/\/+$/`, which backtracks quadratically on input with many slashes. Replaced with a linear index scan; output is unchanged.

## 1.0.1

### Patch Changes

- 8a9c7f1: PNG generation resolves resvg; clear message when missing; manifest names

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: SVG-first favicon generator + design primitives — `defineFavicon` runtime API, six shape primitives, glyph library (monogram / symbol / sigil / wordmark), Web App Manifest builder, optional PNG rasterizer (lazy resvg-wasm), eight pre-built DuganLabs presets, and a `bn-favicon` CLI.

### Patch Changes

- Updated dependencies [3ce5feb]
  - @basenative/og-image@0.2.0

## 0.1.0 — initial release.

- `defineFavicon(spec | preset-name)` → `{ svg, apple, maskable, htmlTags(), manifest() }` — single entry-point for the runtime API.
- `htmlTags({ themeColor, svgHref, appleHref, manifestHref, maskIconColor })` — emits the recommended `<link>` / `<meta>` tags for `<head>`. Includes SVG icon, apple-touch-icon, mask-icon, manifest, theme-color.
- Pure SVG renderer (`renderFaviconSvg`, `renderMaskableSvg`, `renderAppleSvg`) — viewBox 1024×1024, no external dependencies.
- Glyph library: `monogram` (1–3 letters with weight / spacing / accent-dot / stacked options), `symbol` (12 hand-tuned vectors — lightbulb, leaf, bolt, key, eye, asterisk, gear, terminal-prompt, calendar, beaker, clock, anchor), `sigil` (5 abstract marks — concentric-square, intersecting-circles, hex-grid, signal-stack, station-mark), `wordmark`.
- Six shape primitives: `square`, `rounded`, `circle`, `squircle`, `shield`, `diamond`. Each shape clip-paths the glyph so it composes cleanly.
- Palette helpers — accept a single hex (treated as the accent, paired with the DuganLabs charcoal) or a full `{ bg, fg, accent }` map. Auto-derives `fg` from `bg` luminance.
- Web App Manifest builder — emits the canonical icon set referencing `favicon.svg`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `maskable.png` (with 80% safe zone).
- Optional PNG rasterizer — defers loading `@resvg/resvg-wasm` (via the `@basenative/og-image` peer) so the SVG-only happy path stays dependency-free.
- 8 pre-built DuganLabs presets — `tabs`, `basenative`, `duganlabs`, `pendingbusiness`, `greenput`, `warrendugan`, `ralph-station`, `warren-sys`. Pre-rendered SVGs ship under `templates/favicons/`.
- `bn-favicon` CLI — `init` (interactive, idempotent), `render <preset>`, `html`, `list`. Designed to be invoked from the BaseNative `bn` umbrella as `bn favicon`.
