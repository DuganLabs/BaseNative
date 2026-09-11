# @basenative/date

## 0.3.2

### Patch Changes

- 560ecb0: Escape caller-supplied values in `renderDatepicker`, `renderTimepicker` and
  `renderDateRange`.

  All three interpolated `name`, `value`, `min`, `max`, `step`, `id` and `label`
  straight into the markup, so a value containing a double quote closed its
  attribute and the remainder became real attributes — an event handler among
  them. Attribute values now go through `escapeAttr` and label/legend text
  through `escapeText`, matching what `@basenative/components` has always done.

  `attrs` is unchanged: it stays a raw markup composition point, as documented.

  This adds `@basenative/runtime` as a dependency of `@basenative/date`, which
  previously had none.

## 0.3.1

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

## 0.3.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata
