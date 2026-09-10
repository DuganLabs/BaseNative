# @basenative/station

> Queue-driven local-inference primitive — drives a cloudflared-tunneled vLLM tower (or any OpenAI-compatible endpoint) with an SQLite-backed job queue, an iteration loop runtime, fallback to Workers AI, and reusable job templates.

## Overview

`@basenative/station` is the runtime for a single local-inference "station": a queue of jobs, a loop runner that drives each job through a model until a template-defined success check passes (or the job stalls/fails), an OpenAI-compatible HTTP client with automatic fallback to a secondary endpoint (e.g. Workers AI), and a small registry of pre-built job templates for common loop-pattern workloads (writing tests from TODOs, adding docstrings, fixing lint warnings, mechanical refactors, FSM classification). Both Node and Workers runtimes are supported: the runner is portable (no `node:fs` in the hot path), the client is fetch-only, and the queue defaults to an in-memory driver, upgrading to `better-sqlite3` when one is supplied. Applying a model's diff to a worktree is deliberately left to the caller — the runner only records a structured `applied_diff` row per iteration.

## Installation

```bash
npm install @basenative/station
```

## Quick Start

```js
import { defineStation } from '@basenative/station';

const station = defineStation({
  tunnelUrl: 'https://tower.example.cloudflareaccess.com',
  model: 'qwen2.5-coder-7b-instruct',
  queueDb: ':memory:', // or a file path when better-sqlite3 is available
  fallback: { url: 'https://api.cloudflare.com/.../workers-ai', model: 'gpt-oss-120b' },
});

station.queue.enqueue({
  venture: 'greenput',
  intent: 'docstring-coverage',
  payload: { filePath: 'src/foo.js', fileContents: '...', exportName: 'foo', exportKind: 'function' },
});

const counters = await station.runner.run({ maxIterations: 10 });
console.log(counters); // { processed, completed, escalated, failed }
```

## API Reference

### Root (`@basenative/station`)

The root entry re-exports everything below — `Runner`, `runOnce`, `run`, `escalate` from `./runner`; `Queue`, `createQueue`, `MemoryQueueDriver` from `./queue`; `Client`, `OpenAICompatClient`, `StationUnavailable`, `StationTimeout` from `./client`; `templates` from `./templates`; `ops` as a namespace from `./ops`; and `defineStation`.

#### defineStation(opts = {})

Single-call factory that wires a `Client`, a `Queue`, and a `Runner` together with sane defaults, returning a frozen struct rather than a class instance. The orchestrator reaches into the returned object and uses pieces individually — e.g. `enqueue` from one process, `run` from a separate long-lived worker.

**Parameters:**
- `opts.tunnelUrl` — primary OpenAI-compatible endpoint base URL. **Required**; throws if omitted.
- `opts.model` — primary model id; default `'qwen2.5-coder-7b-instruct'`
- `opts.queueDb` — file path passed through to `createQueue`, or `':memory:'`; default `':memory:'`
- `opts.fallback` — `{ url, model? }`; when set, configures the client's fallback endpoint
- `opts.templates` — override the template registry; default the built-in `templates` export

**Returns:** `Object.freeze({ client, queue, runner, templates })`

---

### Runner (`./runner`)

The loop runtime. For each queued job it looks up the template for the job's `intent`, builds a prompt via `template.buildPrompt(payload)`, calls the model through the configured client, runs `template.successCheck(diff, payload)` against the result, and records the iteration. On repeated failures (`stallThreshold` consecutive failed iterations) the job escalates per its `escalateTo` policy (`sonnet` | `opus` | `human`); on `maxIterations` the job is failed instead.

#### Runner

Class wrapping one client + queue + template registry.

**Constructor:** `new Runner({ client, queue, templates, applyDiff, log })`
- `client` — an `OpenAICompatClient` (or compatible). **Required.**
- `queue` — a `Queue` instance. **Required.**
- `templates` — a `Record<string, Template>` keyed by intent. **Required.**
- `applyDiff` — `(args: { jobId, iteration, prompt, response }) => Promise<{ appliedDiff?, success }>`; optional, defaults to a no-op that passes the model response through unchanged and reports `success: false`. Real consumers replace this with a sandboxed worktree writer.
- `log` — `(msg, ctx?) => void`; optional, defaults to a no-op.

**Methods:**
- `runOnce(job)` — runs a single iteration of one job (caller must have already `claim()`ed it, i.e. `status === 'running'`). Looks up the template, builds the prompt, calls `client.chat(...)`, runs `applyDiff`, then `successCheck`, and records the iteration via `queue.recordIteration`. On success calls `queue.complete`; on a stall (last `stallThreshold` iterations all failed) calls `escalate`; on reaching `maxIterations` calls `queue.fail`. Returns `{ ok, iteration, success? , escalated?, failed?, reason? }`.
- `run(opts = {})` — drives the full loop: `claim()` → inner `runOnce` loop until done/escalated/failed or the per-job iteration cap → repeat, bounded by `opts.maxJobs` (default `Infinity`). `opts.maxIterations` is a soft per-job cap (templates may set tighter ones via `tpl.maxIterations`). Returns aggregate counters: `{ processed, completed, escalated, failed }`.
- `escalate(job, reason)` — moves a job from `running` to `escalated` per its `escalateTo` policy, calling `queue.escalate(job.id, ...)`. Throws if `job.id` is missing.

---

#### runOnce({ client, queue, templates, job, applyDiff, log })

Free-standing convenience wrapper: constructs a one-off `Runner` and calls `.runOnce(job)` on it.

**Parameters:** same shape as the `Runner` constructor plus `job` — the job object to run.

**Returns:** `Promise` resolving to the same result shape as `Runner#runOnce`.

---

#### run({ client, queue, templates, applyDiff, log, ...opts })

Free-standing convenience wrapper: constructs a one-off `Runner` and calls `.run(opts)` on it, where `opts` is everything besides `client`/`queue`/`templates`/`applyDiff`/`log` (e.g. `maxJobs`, `maxIterations`).

**Returns:** `Promise<{ processed, completed, escalated, failed }>`

---

#### escalate({ queue, job, reason })

Free-standing helper that escalates a job directly against a queue, without constructing a `Runner`: calls `queue.escalate(job.id, \`${reason} -> ${job.escalateTo ?? 'sonnet'}\`)`.

---

### Queue (`./queue`)

An SQLite-backed job store, exposed behind a driver interface so the same `Queue` facade works against an in-memory driver (tests, Workers) or a `better-sqlite3` driver (Node production). Tracks two logical tables: `station_jobs` (one row per job, including status, iteration count, and escalation policy) and `station_iterations` (one row per model call against a job).

#### createQueue({ path = ':memory:', betterSqlite3 } = {})

Driver auto-selection factory. Always returns a `Queue` backed by `MemoryQueueDriver` unless a `betterSqlite3` constructor is supplied — station does not bundle `better-sqlite3` itself (so Workers-side consumers don't pull native deps into their bundle); the host application passes it in. If `path !== ':memory:'` but no `betterSqlite3` is provided, `createQueue` logs a warning and falls back to the in-memory driver rather than throwing.

**Parameters:**
- `path` — file path for the SQLite database, or `':memory:'`; default `':memory:'`
- `betterSqlite3` — a `better-sqlite3` database constructor (not an instance); when supplied and `path !== ':memory:'`, a real SQLite-backed queue is created and the schema (`station_jobs`, `station_iterations`, indices) is installed with `CREATE TABLE IF NOT EXISTS`.

**Returns:** `Queue`

---

#### Queue

Facade over a driver (`{ insertJob, updateJob, getJob, selectQueued, list, insertIteration, iterationsFor }`). Constructed with `new Queue({ driver })`, but most consumers get one from `createQueue`.

**Methods:**
- `enqueue(job)` — inserts a new job with `status: 'queued'`. `job.id` is used if provided, otherwise a random id is generated; `job.venture`, `job.intent`, `job.payload` (JSON-serialized), `job.maxIterations` (default `10`), `job.stallThreshold` (default `3`), `job.escalateTo` (default `'sonnet'`), and `job.createdAt` (default `Date.now()`) are stored. Throws if a job with the same `id` already exists — enqueue is intentionally not idempotent-by-overwrite, so callers dedupe upstream. Returns the job `id`.
- `claim()` — claims the oldest `queued` job (by `created_at`), flips its status to `running`, and returns the decoded job object, or `null` if the queue is empty.
- `recordIteration(jobId, { iteration, prompt, response, appliedDiff, success })` — inserts a row into `station_iterations` and updates the job's `iterations` count and `last_iteration_at`. Throws if `jobId` is unknown.
- `complete(jobId)` — sets the job's status to `'done'`. Throws if unknown.
- `escalate(jobId, reason)` — sets status to `'escalated'` and stores `reason` (stringified) as `last_error`. Throws if unknown.
- `fail(jobId, reason)` — sets status to `'failed'` and stores `reason` as `last_error`. Throws if unknown.
- `list(filters = {})` — returns decoded jobs, optionally filtered by `{ status, venture }`, ordered by `created_at`.
- `iterationsFor(jobId)` — returns all iteration rows recorded for a job.
- `depth()` — returns `{ queued, running, oldestQueuedAgeMs }`; used by `ops.queueHealth`.

Decoded job objects have camelCase fields: `{ id, venture, intent, status, payload (parsed), createdAt, iterations, maxIterations, stallThreshold, escalateTo, lastIterationAt, lastError }`.

---

#### MemoryQueueDriver

In-memory driver implementation — full-featured, used in tests and as the automatic fallback when `better-sqlite3` isn't supplied. Stores jobs in a `Map` and iterations in an array; implements the same driver surface (`insertJob`, `updateJob`, `getJob`, `selectQueued`, `list`, `insertIteration`, `iterationsFor`) consumed by `Queue`. Not typically constructed directly — use `createQueue()`, which selects it automatically.

---

#### QUEUE_STATUSES

Frozen array of every valid job status: `['queued', 'running', 'stalled', 'done', 'escalated', 'failed']`.

---

### Client (`./client`)

A fetch-only HTTP client targeting any OpenAI-compatible chat-completion endpoint (a vLLM tower behind cloudflared, Workers AI in fallback mode, etc). Worker-runtime safe — no `node:fs`/`node:net`/`node:http`, only `globalThis.fetch` (or an injected `fetch`). Enforces a hard per-call timeout (default 30s) via `AbortController`.

#### OpenAICompatClient

**Constructor:** `new OpenAICompatClient(opts)`
- `opts.baseUrl` — primary endpoint base URL. **Required**; throws if omitted.
- `opts.model` — primary model id. **Required**; throws if omitted.
- `opts.apiKey` — bearer token sent as `Authorization: Bearer <apiKey>`; optional.
- `opts.fallbackUrl` / `opts.fallbackModel` / `opts.fallbackApiKey` — secondary endpoint used only if the primary call throws; `fallbackModel` defaults to `opts.model` when a `fallbackUrl` is set.
- `opts.timeoutMs` — per-call abort timeout; default `30000`.
- `opts.fetch` — injectable fetch implementation; defaults to `globalThis.fetch`, and throws at construction time if neither is available.

**Methods:**
- `chat({ messages, temperature, maxTokens, stop })` — `POST <baseUrl>/v1/chat/completions`. On failure, retries once against the fallback endpoint if configured; if both fail (or the primary fails with no fallback configured), throws `StationUnavailable`. Returns `{ text, usage?, latencyMs, source: 'primary' | 'fallback' }`.
- `ping()` — `GET <baseUrl>/v1/models`; returns `{ ok, status, models: string[], hasExpectedModel }` (or `{ ok: false, error }` on network failure). Used by `ops.modelHealth`.
- `health()` — `GET <baseUrl>/health`; returns `{ ok, status }` (or `{ ok: false, error }`). This is the tunnel/L7 health check, not vLLM-specific.

Each fetch is wrapped with the configured `timeoutMs`; an aborted request surfaces as `StationTimeout`, not a generic `AbortError`.

---

#### Client

`export const Client = OpenAICompatClient;` — an alias for the spec-mandated public name. Identical to `OpenAICompatClient`; prefer importing `Client` in application code, `OpenAICompatClient` when you need the concrete class name (e.g. `instanceof` checks).

---

#### StationUnavailable

`Error` subclass (`name: 'StationUnavailable'`) thrown by `OpenAICompatClient#chat` when both the primary and (if configured) fallback endpoint calls fail. Carries `{ primary, fallback }` — the underlying errors from each attempt — as properties.

---

#### StationTimeout

`Error` subclass (`name: 'StationTimeout'`) thrown when a request exceeds `timeoutMs`, in place of the generic `AbortError` that would otherwise surface.

---

### Templates (`./templates`)

A registry of pre-built job templates, each shaped `{ name, description, buildPrompt(payload), successCheck(diffOrResponse, payload), maxIterations, escalateTo, temperature?, maxTokens? }`. `buildPrompt` renders the model prompt from the job's `payload`; `successCheck` is a pure, synchronous function the `Runner` calls against the applied diff (or raw response, if `applyDiff` didn't produce one) to decide whether the iteration succeeded.

#### templates

`Object.freeze({ ... })` mapping job `intent` strings to templates, with each template reachable under two or three aliases (e.g. both `'tests'` and `'tests-from-todos'` resolve to the same template object):

```
tests, tests-from-todos          → testsFromTodos
docs, docstring-coverage         → docstringCoverage
lint-fix, lint-bankruptcy        → lintBankruptcy
one-file-refactor, refactor-migration → refactorMigration
fsm-transition, classification, fsm-classifier → fsmClassifier
```

This is the default registry passed to `Runner`/`defineStation` unless overridden.

---

#### testsFromTodos

Generates one test per iteration for a file containing `// TODO: test X` markers — knocks off one TODO per iteration. `payload`: `{ filePath, fileContents, todoLine, todoText, testFramework?, targetSymbol? }`. `successCheck` requires the response to contain an `it(...)`/`test(...)` call and to mention the target symbol or a TODO keyword. `maxIterations: 5`, `escalateTo: 'sonnet'`.

---

#### docstringCoverage

Writes a single JSDoc block for one undocumented export. `payload`: `{ filePath, fileContents, exportName, exportSignature?, exportKind }`. `successCheck` requires the response to be wrapped in `/** ... */` and (absent an `exportSignature`) to mention `exportName`. `maxIterations: 3`, `escalateTo: 'haiku'`.

---

#### lintBankruptcy

Fixes exactly one lint warning per iteration, as a unified diff (or an `eslint-disable-next-line` waiver when a fix isn't appropriate). `payload`: `{ filePath, fileContents, ruleId, line, column?, message, linter? }`. `successCheck` requires either diff-shaped output or an explicit disable comment mentioning the rule id. `maxIterations: 4`, `escalateTo: 'sonnet'`.

---

#### refactorMigration

Applies one mechanical rename/refactor step to a single file per iteration, as a unified diff. `payload`: `{ filePath, fileContents, migration: { from, to, kind }, notes? }`. `successCheck` accepts an empty diff when the file doesn't contain `migration.from`; otherwise requires a diff that removes the old name and includes the new one. `maxIterations: 5`, `escalateTo: 'sonnet'`.

---

#### fsmClassifier

Classifies an inbound Greenput SMS reply into a validated FSM transition plus extracted slot values. `payload`: `{ message, currentState, allowedTransitions, contextHints? }`. Expects a strict JSON response `{ transition, confidence, fields }`; `successCheck` parses it (tolerating an accidental ` ```json ` fence), and requires `transition` to be one of `allowedTransitions` and `confidence` to be a number in `[0, 1]`. `maxIterations: 2`, `escalateTo: 'sonnet'`, `temperature: 0.0`.

---

### Ops (`./ops`)

Pure health-check functions (imported as `import { ops } from '@basenative/station'` at the root, or individually from `./ops`) consumed by the orchestrator's `station-ops` agent and the `bn-station ops` CLI command. Each returns a structured `{ ok, ...details }` result rather than a string, so a TUI can render it directly.

#### tunnelHealth(url, { fetch = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {})

`GET <url>/health` with a 30s default timeout. Returns `{ ok, status?, latencyMs?, error? }`; `error` is `'timeout'` on abort, `'url required'` if `url` is falsy.

---

#### modelHealth(client)

Verifies the expected model is present at the primary endpoint by calling `client.ping()`. Returns `{ ok, expectedModel, presentModels, raw }`, where `ok` requires both `res.ok` and `res.hasExpectedModel`. Returns `{ ok: false, error: 'invalid client' }` if `client` has no `ping` method.

---

#### gpuHealth(url, { fetch = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {})

Optional remote GPU stat probe against `<url>/gpu`, which is expected to return `{ tempC, memUsedPct }`. Considered `ok` when `tempC < 85` and `memUsedPct < 95`. Marked `stub: true` in most non-2xx/error paths since production deployments must expose this endpoint themselves over the tunnel — station does not implement a GPU agent.

---

#### queueHealth(queue)

Pure, synchronous check against an in-process `Queue`'s `depth()`. Returns `{ ok, queued, running, oldestQueuedAgeMs }`; `ok` is `false` once `queued >= 100` or the oldest queued job has waited more than one hour. Returns `{ ok: false, error: 'invalid queue' }` if `queue` has no `depth` method.

---

#### summary({ tunnelUrl, client, gpuUrl, queue })

Composite check run by `bn-station ops`: runs `tunnelHealth`, `modelHealth`, and (if `gpuUrl` given) `gpuHealth` concurrently via `Promise.all`, plus `queueHealth` if `queue` is given. Returns `{ ok, tunnel, model, gpu, queue }` where the top-level `ok` is the logical AND of all four.

## Integration

`defineStation` is the primary entry point for the orchestrator's station-dispatcher: it enqueues jobs from one process and runs `station.runner.run(...)` from a separate long-lived worker, sharing the same `Queue` instance (or the same SQLite file, once a `better-sqlite3` driver is wired in). `ops.summary` backs the `bn-station ops` CLI command and the orchestrator's TUI health panel.

## License

Apache-2.0
