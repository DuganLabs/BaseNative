# @basenative/cli Changelog

## 0.4.2

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

## 0.4.1

### Patch Changes

- 99561f7: Fix file-system TOCTOU races (CodeQL `js/file-system-race`) in `bn generate`, `bn prd init`, `bn speckit plan/tasks`, and the template renderer used by scaffolding commands: an `existsSync` check followed by a separate read/write let a file created in between the two calls be silently overwritten. Writes that must not clobber an existing file now use an exclusive create (`{ flag: 'wx' }`) and handle `EEXIST` instead, which is atomic. No user-visible behavior change.

## 0.4.0

### Minor Changes

- 3ce5feb: `bn` CLI overhaul: new on-disk `bn create` templates (webapp / worker / library / t4bs), spec-driven `bn prd` and `bn speckit` workflows, idempotent `bn gh sync|board|automate`, smarter `bn dev` package-manager detection, Doppler-aware `bn deploy`, and a `bn doctor` health check.
- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — 0.3.0 — CLI overhaul

### Added

- `bn create` — new on-disk templates: `webapp`, `worker`, `library`, `t4bs`. Each
  ships with `@basenative/eslint-config`, `@basenative/tsconfig`,
  `@basenative/wrangler-preset` references, `.nvmrc`, `.prettierrc`, sample
  `wrangler.toml`, and a `.github/workflows/deploy.yml` that calls
  reusable workflows from `DuganLabs/.github`.
- `bn prd init|edit|sync` — scaffold and sync `docs/PRD.md` (matching the
  t4bs format) and emit `.bn/prd-issues.json` for downstream tooling.
- `bn speckit init|spec|plan|tasks|validate` — spec-driven workflow
  compatible with [github/spec-kit](https://github.com/github/spec-kit).
  Outputs `.bn/speckit-tasks.json` consumable by `bn gh sync`.
- `bn gh sync|board|automate` — idempotent GitHub milestone/issue creation
  via the `gh` CLI, project-board verification, and a check that
  `deploy.yml` references DuganLabs reusable workflows.
- `bn nx [...]` — passthrough to Nx using the detected package manager,
  with `--task <t> [--affected]` shortcut.
- `bn dev` — now detects pnpm/npm/yarn/bun and prefers a project's `dev`
  script before falling back to `node --watch` or `wrangler dev`.
- `bn deploy --prod|--preview` — Wrangler-based deploy, wrapped in
  `doppler run --` when Doppler is installed.
- `bn doctor` — validates Node version, `.nvmrc`, `packageManager` pin,
  `eslint.config.js` + `tsconfig.json` extends, `doppler-required.json`,
  and `.github/workflows/deploy.yml`.
- `manifest.json` — machine-readable enumeration of every command and flag,
  for shell completion + downstream tooling.
- `.specify/` — dogfood SpecKit scaffold for the CLI itself.
- ANSI color helper (`src/lib/colors.js`) — NO_COLOR aware, branchless
  on disabled.
- Tiny template engine (`src/lib/template.js`) — `{{token}}` interpolation
  in file contents and paths, `.tmpl` suffix stripping, traversal-safe.
- Sync wrappers for `git` (`src/lib/git.js`) and `gh` (`src/lib/gh.js`).
- Package-manager detection (`src/lib/pkg-manager.js`).
- "Did you mean…?" suggestion on unknown commands (Levenshtein-based).
- Easter-egg banner: every `src/**/*.js` carries
  `// Built with BaseNative — basenative.dev`.

### Changed

- `src/index.js` — new dispatcher with banner, lazy command imports,
  per-command help, suggestion on typo. Cold-start `bn --help` measured
  <100ms locally.
- `bn create` — disk-backed templates render via `src/lib/template.js`.
  Legacy `minimal`, `enterprise`, `api` templates preserved as in-memory
  generators so existing tests still pass.
- `bn deploy` — `--prod`/`--preview` switch to Wrangler mode; legacy cloud
  flow remains for back-compat.

### Notes

- Zero new runtime dependencies.
- All commands accept `--help`. Mutating commands accept `--dry-run`. Data
  commands accept `--json`.
