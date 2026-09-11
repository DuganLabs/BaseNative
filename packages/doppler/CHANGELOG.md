# @basenative/doppler

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

- 99561f7: Fix a file-system TOCTOU race (CodeQL `js/file-system-race`) in `bn doppler init`: the starter `doppler-required.json` write used an `existsSync` check followed by a separate write, which could silently clobber a file created in between. Now uses an exclusive create (`{ flag: 'wx' }`) and handles `EEXIST`. No user-visible behavior change.

## 0.2.0

### Minor Changes

- 3ce5feb: Initial release: thin DX layer around Doppler — `dopplerRun` wrapper, `requireSecrets` boot-time validator, Wrangler vars/secrets injector, `doppler-required.json` schema, and a `bn-doppler` CLI (init / verify / ci-token / run). Plumbing only — never values.

## 0.1.0

- Initial release.
- `dopplerRun(args, opts)` programmatic wrapper around `doppler run --`.
- `requireSecrets(names, opts)` boot-time validator with `MissingSecretsError`.
- `injectIntoWrangler({ env, names, secretNames })` splits resolved values into
  Wrangler `vars` vs `secrets`.
- `loadRequired` / `validateRequired` / `findMissing` for `doppler-required.json`.
- `bn-doppler init <project>` interactive bootstrap.
- `bn-doppler verify` checks `doppler-required.json` against a Doppler config.
- `bn-doppler ci-token` mints a service token with a confirmation prompt.
- `bn-doppler run -- <cmd...>` thin passthrough.
- Templates: `doppler-required.json`, `.github-actions-doppler-snippet.yml`.
