// Built with BaseNative — basenative.dev
/**
 * @basenative/station — queue-driven local-inference primitive.
 *
 * Public surface (per DUGANLABS_ORCHESTRATOR_SPEC §9):
 *
 *   Runner          — the loop runtime (runOnce, run, escalate)
 *   Queue           — SQLite-backed job store with iteration history
 *   Client          — OpenAI-compatible HTTP client w/ Workers AI fallback
 *   templates       — pre-built job-template registry
 *   ops             — health-check helpers (tunnel, model, gpu, queue)
 *   defineStation   — top-level factory that wires the pieces together
 *
 * Types:
 *   StationJob, StationJobIntent, StationJobStatus
 *
 * Both Node and Workers runtimes are supported. The runner is portable
 * (no node:fs in the hot path), the client is fetch-only, the queue
 * defaults to in-memory and upgrades to better-sqlite3 if available.
 */

export { Runner, runOnce, run, escalate } from './runner.js';
export { Queue, createQueue, MemoryQueueDriver } from './queue.js';
export {
  Client,
  OpenAICompatClient,
  StationUnavailable,
  StationTimeout,
} from './client.js';
export { templates } from './templates/index.js';
export * as ops from './ops.js';
export { defineStation } from './define-station.js';
