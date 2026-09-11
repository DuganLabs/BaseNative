# Changelog — @basenative/share

## 1.0.2

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

- Updated dependencies [9741b75]
  - @basenative/og-image@0.2.2

## 1.0.1

### Patch Changes

- Updated dependencies [8a9c7f1]
  - @basenative/og-image@0.2.1

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: Native Web Share + clipboard fallback client, share-card mint endpoint, OG-redirect landing page generator, D1-shaped store, and a ready-to-apply migration — pairs with `@basenative/og-image` for per-card preview rendering.

### Patch Changes

- Updated dependencies [3ce5feb]
  - @basenative/og-image@0.2.0

## 0.1.0 — initial release

- `nativeShare` — Web Share API → clipboard fallback, AbortError-aware
- `mintShareCard` — POST helper for the share-card endpoint
- `composeShareText` — `${var}` templater
- `defineShareCards` — D1-shaped store with create/get
- `mintHandler` — drop-in POST `/api/share-cards`
- `landingHandler` — drop-in GET `/s/{id}` with per-card OG meta
- `buildLandingHtml` / `escHtml` — composable HTML builders
- Migration `0001_share_cards.sql`
