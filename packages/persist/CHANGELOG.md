# Changelog — @basenative/persist

## 1.0.5

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
  - @basenative/runtime@0.6.3

## 1.0.4

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2

## 1.0.3

### Patch Changes

- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 1.0.2

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0

## 1.0.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: signal-driven local persistence with TTL envelopes, pluggable storage (localStorage / indexedDB / memory), bidirectional `persisted(key, signal)` bind, and a server-rehydrate hook with conflict reconciliation.

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0

## 0.1.0 — initial release

- `loadPersisted` / `savePersisted` / `clearPersisted` / `persistedSavedAt` — flat KV API with TTL envelope
- `persisted(key, signal)` — bidirectional signal/storage bind
- `hydrateFromServer({ key, fetch, onResolve, reconcile })` — local + server reconcile
- Pluggable storage: `localStorage`, `indexedDB`, `memory`
- Reads t4bs legacy `{...state, savedAt}` shape with 12h default expiry
