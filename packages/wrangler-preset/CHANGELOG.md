# @basenative/wrangler-preset

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

- 1bfd837: Fix a polynomial ReDoS surface (CodeQL `js/polynomial-redos`) in `toToml`: trailing newlines were stripped with `/\n+$/`, which backtracks quadratically on input with many newlines, and the input can come from config values outside this module's control. Replaced with a linear index scan; output is unchanged.

## 0.2.0

### Minor Changes

- 3ce5feb: Initial release: pinned Wrangler version + typed `wrangler.toml` fragment generator. Ships baseline defaults, binding fragment builders (D1/KV/R2/DO), a zero-dep TOML serializer, a `bn-wrangler` CLI wrapper, and a starter template — pin once, every project moves together.

## 0.1.0

- Initial release.
- Pin `wrangler` at `^4.85.0` as a transitive dependency.
- `defaults` baseline (`compatibility_date`, `compatibility_flags`, `pages_build_output_dir`).
- Fragment builders: `bindings.d1`, `bindings.kv`, `bindings.r2`, `bindings.do`.
- `mergeWrangler(base, ...frags)` deep-merge with array concatenation.
- `toToml(config)` zero-dependency TOML serializer.
- `bn-wrangler` CLI wrapper that re-execs the pinned wrangler.
- Starter `templates/wrangler.toml.tmpl`.
