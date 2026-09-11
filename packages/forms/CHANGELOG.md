# @basenative/forms

## 1.0.4

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

## 1.0.3

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2

## 1.0.2

### Patch Changes

- df5e5d7: Remove a duplicate `/` in a test-fixture URL regex's character class (CodeQL `js/regex/duplicate-in-character-class`). Test-only; no package behavior change.
- Updated dependencies [40a3472]
  - @basenative/runtime@0.6.1

## 1.0.1

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0

## 1.0.0

### Major Changes

- f7e26f4: Realign `@basenative/forms` with the registry.

  GitHub Packages already holds `@basenative/forms` 0.5.0 through 0.13.0, published in January 2026 from the pre-monorepo, Angular-era package (`fesm2022/` bundle, `tslib` dependency). This repository's `@basenative/forms` is a different package with a different API — a signal-based rewrite exporting `createField`, `createForm`, `zodAdapter`, `createWizard` and the validator set — but it still carried the version 0.4.0, so its next patch release would have collided with the existing 0.4.1 and been skipped silently, leaving consumers on the January build.

  This is a major release: the API is not compatible with the 0.x Angular line. Consumers of the old line should treat 1.0.0 as a new package.

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0

## 0.4.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0
