# @basenative/claude-config

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

- 99561f7: Fix file-system TOCTOU races (CodeQL `js/file-system-race`) in the installer: template, `settings.json`, and `CLAUDE.md` writes now use an exclusive create or a read-based existence check instead of `existsSync` followed by a separate write, closing the window where a file created in between could be silently overwritten. Also fixes an incomplete sanitization (CodeQL `js/incomplete-sanitization`): the glob-to-extension conversion used `.replace('*', '')`, which only strips the first `*`; now uses `.replaceAll('*', '')`. No user-visible behavior change.

## 0.2.0

### Minor Changes

- 3ce5feb: Initial release: bundled Claude Code subagents, skills, slash commands, hooks, and settings template for DuganLabs / BaseNative projects, plus a `bn-claude install` CLI for idempotent project setup.
