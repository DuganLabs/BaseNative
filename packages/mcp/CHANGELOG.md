# @basenative/mcp

## 0.2.1

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
  - @basenative/server@0.6.3
  - @basenative/validate@0.2.1

## 0.2.0

### Minor Changes

- 62d9857: Add a general template-directive extension hook and the `@feature` / `@t` directives.

  - **runtime / server**: new `registerDirective(name, { on: 'template' | 'element', server, client })` in `@basenative/runtime/shared/directives`, consulted by both the SSR renderer and client hydrate/bind loops, so other packages can add directives without the core importing them. Additive; existing directives are unchanged.
  - **flags**: `<template @feature="flagName">` / `@else`, driven by a synchronous `ctx.$flags` created with the new `createFlagContext(flagManager, context?)`. With no provider the block renders as disabled and a `BN_FEATURE_NO_PROVIDER` diagnostic is emitted.
  - **i18n**: `<el @t="message.key">fallback</el>` sets the element text from `ctx.$i18n.t(key, ctx)`; re-renders on `onLocaleChange()` client-side. With no provider the existing content is preserved and `BN_T_NO_PROVIDER` is emitted.
  - **validate / mcp**: both directives are recognised by the validator's known-directive list and listed in the MCP directive reference.

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0
  - @basenative/server@0.6.0
  - @basenative/validate@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0
  - @basenative/server@0.5.0
  - @basenative/validate@0.1.1
