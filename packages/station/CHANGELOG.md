# @basenative/station

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

## 0.2.0

### Minor Changes

- 12aa2c0: Initial release of `@basenative/station` — queue-driven local-inference primitive that drives an OpenAI-compatible local tower (or any OpenAI-compat endpoint) with an SQLite-backed job queue, iteration-loop runtime, Workers AI fallback, and a registry of five pre-built job templates (`tests-from-todos`, `docstring-coverage`, `lint-bankruptcy`, `refactor-migration`, `fsm-classifier`). Ships with the `bn-station` CLI and full TypeScript declarations.

All notable changes to `@basenative/station` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-04-26

### Added

- Initial release. Queue-driven local-inference primitive specified in
  `DUGANLABS_ORCHESTRATOR_SPEC.md` §9.
- `defineStation({ tunnelUrl, queueDb, fallback })` — single-call factory wiring
  the client, queue, and runner together.
- `OpenAICompatClient` (alias `Client`) — `fetch`-only HTTP client targeting any
  OpenAI-compatible chat-completion endpoint (vLLM behind cloudflared, Workers
  AI, etc.). 30-second hard timeout, automatic Workers AI fallback on primary
  failure, throws `StationUnavailable` on both-down.
- `Queue` — SQLite-schema-compatible job store with iteration history. Ships
  with an in-memory driver; production deployments inject `better-sqlite3` via
  `createQueue({ path, betterSqlite3 })`.
- `Runner` — the loop runtime. `runOnce(job)` does one model iteration and
  applies the template's success check; `run(opts)` drains the queue under
  per-job `maxIterations` caps and escalates stalled jobs per their
  `escalateTo` policy.
- Five job templates: `tests-from-todos`, `docstring-coverage`,
  `lint-bankruptcy`, `refactor-migration`, `fsm-classifier` (Greenput intake).
- `ops` — `tunnelHealth`, `modelHealth`, `gpuHealth`, `queueHealth`, `summary`.
- `bn-station` CLI: `enqueue`, `list`, `run`, `ops`, `drain`.
- TypeScript declarations.
- Node `--test` suite covering every public API (~50 tests across runner,
  queue, client, templates, ops).
