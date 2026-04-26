# @basenative/station

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
