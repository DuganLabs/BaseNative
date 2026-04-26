# @basenative/station

> Queue-driven local-inference primitive — drives a cloudflared-tunneled vLLM tower (or any OpenAI-compatible endpoint) with an SQLite-backed job queue, an iteration-loop runtime, automatic Workers AI fallback, and a registry of pre-built job templates.

Part of the [BaseNative](https://github.com/DuganLabs/BaseNative) ecosystem. Specified in `DUGANLABS_ORCHESTRATOR_SPEC.md` §9.

## What Station is

A small, opinionated software primitive for running **loop-pattern** workloads against a **local 7B-class coder model** behind an OpenAI-compatible HTTP endpoint (in our reference stack: an RTX 5070 box serving Qwen2.5-Coder-7B INT4 via vLLM, exposed over a cloudflared tunnel).

It is **not** the tower hardware. It is the software that drives the tower.

## How it differs from frontier inference

The cost-model from spec §9, restated:

| Tier | Per-token marginal cost | Quality on novel code | Quality on loop-pattern code |
|---|---|---|---|
| **Frontier** (Sonnet 4.6 / Opus 4.7) | Posted Anthropic rates | Excellent | Excellent — wasted |
| **Workers AI** (gpt-oss-120b free tier) | Free up to 10K Neurons/day | Good | Good — capped throughput |
| **Station** (local 7B INT4) | $0 above electricity (~$5–10/mo) | Poor one-shot | Acceptable on narrow templated iteration |

Idle tower: ~20W × 24h × $0.30/kWh × 30d ≈ **$4.30/mo**.
Bursty inference: ~$5–10/mo all-in.
Sonnet-equivalent for 5K Station iterations on docstring-coverage: ~$15–25.

**Breakeven is roughly 50K tokens/day.** Above that, Station wins on cost. Below it, just use Sonnet.

## When to use Station

Use Station for tasks where:

- The per-iteration stakes are low.
- The template is narrow and the success check is deterministic.
- You're going to do this a lot (≥hundreds of iterations).

Concrete fits:

- Write one test for one TODO, mark done, advance.
- Add one JSDoc to one undocumented export.
- Fix one lint warning.
- Apply one mechanical refactor step in one file.
- Classify one inbound SMS into one FSM transition (Greenput intake).

**Do not** use Station for: planner tasks (Opus), novel implementer code (Sonnet), PR review (Opus), or anything that touches BaseNative axioms (frontier-only — drift is unrecoverable).

## Install

```bash
pnpm add @basenative/station
# Optional, for production persistence:
pnpm add better-sqlite3
```

## Quick start

```js
import { defineStation } from '@basenative/station';

const station = defineStation({
  tunnelUrl: 'https://tower.your-account.cloudflareaccess.com',
  model: 'qwen2.5-coder-7b-instruct',
  queueDb: '/var/lib/dugan/station.db',
  fallback: {
    url: 'https://api.cloudflare.com/client/v4/accounts/<id>/ai/run',
    model: 'gpt-oss-120b',
  },
});

// Enqueue a job
const id = station.queue.enqueue({
  venture: 'basenative',
  intent: 'docstring-coverage',
  payload: {
    filePath: 'packages/runtime/src/signal.js',
    fileContents: '/* ... */',
    exportName: 'createSignal',
    exportKind: 'function',
  },
});

// Drain the queue (runs all queued jobs to completion or escalation)
const counters = await station.runner.run({ maxJobs: 50 });
console.log(counters);
// { processed: 50, completed: 47, escalated: 2, failed: 1 }
```

## API

### `defineStation(opts)`

Returns `{ client, queue, runner, templates }`. The four pieces are also exported individually if you want to wire them differently (e.g. enqueue from a Worker, run from a Node daemon).

### `Client` / `OpenAICompatClient`

```js
import { OpenAICompatClient } from '@basenative/station';

const client = new OpenAICompatClient({
  baseUrl: 'https://tower.example.com',
  model: 'qwen2.5-coder-7b-instruct',
  fallbackUrl: 'https://api.cloudflare.com/.../ai/run',
});

const { text, latencyMs, source } = await client.chat({
  messages: [{ role: 'user', content: 'Write one JSDoc for foo.' }],
  temperature: 0.2,
  maxTokens: 400,
});
// source === 'primary' | 'fallback'
```

**Fallback behavior:** every `chat()` call hits the primary first. On any failure (HTTP error, malformed response, timeout) it retries on the fallback. If both fail, throws `StationUnavailable` with both error chains attached. **30-second hard timeout** per call.

### `Queue`

SQLite-schema-compatible (see `src/queue.js` for the DDL). Default driver is in-memory; pass `betterSqlite3` to `createQueue` for persistence:

```js
import Database from 'better-sqlite3';
import { createQueue } from '@basenative/station';
const queue = createQueue({ path: './station.db', betterSqlite3: Database });
```

API: `enqueue`, `claim`, `recordIteration`, `complete`, `escalate`, `fail`, `list`, `iterationsFor`, `depth`.

### `Runner`

The loop runtime. Per iteration it:

1. Looks up the job's template by `intent`.
2. Builds a prompt via `template.buildPrompt(payload)`.
3. Calls the model.
4. (Consumer hook) Applies the response as a diff in a sandboxed worktree.
5. Runs `template.successCheck(diff, payload)`.
6. Records the iteration; advances or stalls.

Stall threshold and `maxIterations` are per-job; `escalateTo` is the upstream tier the orchestrator should route the job to when it stalls.

### `templates`

Pre-built, frozen registry. Each template has `name`, `description`, `buildPrompt`, `successCheck`, `maxIterations`, `escalateTo`. The five included templates are:

- `tests-from-todos`
- `docstring-coverage`
- `lint-bankruptcy`
- `refactor-migration`
- `fsm-classifier`

You can add your own — `defineStation({ ..., templates: { ...templates, mine } })`.

### `ops`

Health-check helpers consumed by the orchestrator's `station-ops` agent:

- `tunnelHealth(url)` — GET `/health`
- `modelHealth(client)` — `GET /v1/models`, verifies expected model present
- `gpuHealth(url)` — optional GET `/gpu` probe (stubbed; tower-side endpoint TBD)
- `queueHealth(queue)` — depth + oldest-queued age
- `summary({ tunnelUrl, client, queue, gpuUrl })` — composite

## CLI

```
bn-station enqueue <intent> [--venture x] [--payload @file.json]
bn-station list    [--status queued|running|done|escalated|failed]
bn-station run     [--max-iterations N] [--max-jobs N]
bn-station ops
bn-station drain
```

Reads config from `STATION_TUNNEL_URL`, `STATION_MODEL`, `STATION_QUEUE_DB`, `STATION_FALLBACK_URL`.

## Ops loop

The intended deployment shape, per spec §5.5:

1. A cron / systemd timer runs `bn-station ops` every 60s on the dispatcher host.
2. On `tunnel.ok === false`, the station-ops agent flips the queue's effective fallback to Workers AI, posts to the TUI, and writes an incident.
3. On `queue.oldestQueuedAgeMs > 1h`, escalate the oldest queued job per its `escalateTo` policy.
4. On power/ISP outage, all in-flight jobs are escalated and surfaced to the user.

## Worker-runtime support

`Client` and `templates` are pure `fetch` + pure functions and run unmodified in Cloudflare Workers. The default `Queue` driver is in-memory (Workers have no filesystem) — if you need durable queueing in a Worker, persist to D1/KV at a higher layer and call `enqueue`/`claim` from there.

`Runner` is portable and runs in either Node or a Worker.

## License

Apache-2.0.
