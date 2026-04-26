# @basenative/cli Changelog

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
