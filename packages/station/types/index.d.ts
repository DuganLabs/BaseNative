// Built with BaseNative — basenative.dev

export type StationJobIntent =
  | 'docs'
  | 'tests'
  | 'lint-fix'
  | 'one-file-refactor'
  | 'classification'
  | 'fsm-transition'
  | 'docstring-coverage'
  | 'tests-from-todos'
  | 'lint-bankruptcy'
  | 'refactor-migration'
  | 'fsm-classifier';

export type StationJobStatus =
  | 'queued'
  | 'running'
  | 'stalled'
  | 'done'
  | 'escalated'
  | 'failed';

export type EscalateTo = 'sonnet' | 'opus' | 'haiku' | 'human';

export interface StationJob {
  id: string;
  venture: string;
  intent: StationJobIntent | string;
  status: StationJobStatus;
  payload: Record<string, unknown>;
  createdAt: number;
  iterations: number;
  maxIterations: number;
  stallThreshold: number;
  escalateTo: EscalateTo;
  lastIterationAt: number | null;
  lastError: string | null;
}

export interface StationJobInput {
  id?: string;
  venture: string;
  intent: StationJobIntent | string;
  payload?: Record<string, unknown>;
  createdAt?: number;
  maxIterations?: number;
  stallThreshold?: number;
  escalateTo?: EscalateTo;
}

export interface StationIteration {
  id: string;
  job_id: string;
  iteration: number;
  prompt: string;
  response: string;
  applied_diff: string | null;
  success: 0 | 1;
  ran_at: number;
}

export interface ChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

export interface ChatResponse {
  text: string;
  usage: object | null;
  latencyMs: number;
  source: 'primary' | 'fallback';
}

export interface ClientOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  fallbackUrl?: string;
  fallbackModel?: string;
  fallbackApiKey?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

export class OpenAICompatClient {
  constructor(opts: ClientOptions);
  baseUrl: string;
  model: string;
  fallbackUrl: string | null;
  timeoutMs: number;
  chat(req: ChatRequest): Promise<ChatResponse>;
  ping(): Promise<{ ok: boolean; status?: number; models?: string[]; hasExpectedModel?: boolean; error?: string }>;
  health(): Promise<{ ok: boolean; status?: number; error?: string }>;
}

export const Client: typeof OpenAICompatClient;

export class StationUnavailable extends Error {
  primary?: unknown;
  fallback?: unknown;
}

export class StationTimeout extends Error {}

export interface QueueDepth {
  queued: number;
  running: number;
  oldestQueuedAgeMs: number;
}

export class Queue {
  enqueue(job: StationJobInput): string;
  claim(): StationJob | null;
  recordIteration(
    jobId: string,
    args: {
      iteration: number;
      prompt: string;
      response: string;
      appliedDiff?: string | null;
      success: boolean;
    }
  ): void;
  complete(jobId: string): void;
  escalate(jobId: string, reason?: string): void;
  fail(jobId: string, reason?: string): void;
  list(filters?: { status?: StationJobStatus; venture?: string }): StationJob[];
  iterationsFor(jobId: string): StationIteration[];
  depth(): QueueDepth;
}

export class MemoryQueueDriver {}

export function createQueue(opts?: { path?: string; betterSqlite3?: unknown }): Queue;

export interface JobTemplate {
  name: string;
  description: string;
  buildPrompt(payload: Record<string, unknown>): string;
  successCheck(diffOrResponse: string, payload: Record<string, unknown>): boolean;
  maxIterations: number;
  escalateTo: EscalateTo;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export const templates: Readonly<Record<string, JobTemplate>>;

export interface RunnerOptions {
  client: OpenAICompatClient;
  queue: Queue;
  templates: Readonly<Record<string, JobTemplate>>;
  applyDiff?: (args: {
    jobId: string;
    iteration: number;
    prompt: string;
    response: string;
  }) => Promise<{ appliedDiff?: string | null; success: boolean }>;
  log?: (msg: string, ctx?: object) => void;
}

export interface RunResult {
  ok?: boolean;
  iteration?: number;
  success?: boolean;
  escalated?: boolean;
  failed?: boolean;
  reason?: string;
}

export interface RunCounters {
  processed: number;
  completed: number;
  escalated: number;
  failed: number;
}

export class Runner {
  constructor(opts: RunnerOptions);
  client: OpenAICompatClient;
  queue: Queue;
  runOnce(job: StationJob): Promise<RunResult>;
  run(opts?: { maxJobs?: number; maxIterations?: number }): Promise<RunCounters>;
  escalate(job: StationJob, reason: string): void;
}

export function runOnce(args: RunnerOptions & { job: StationJob }): Promise<RunResult>;
export function run(args: RunnerOptions & { maxJobs?: number; maxIterations?: number }): Promise<RunCounters>;
export function escalate(args: { queue: Queue; job: StationJob; reason: string }): void;

export namespace ops {
  function tunnelHealth(
    url: string,
    opts?: { fetch?: typeof globalThis.fetch; timeoutMs?: number }
  ): Promise<{ ok: boolean; status?: number; latencyMs?: number; error?: string }>;
  function modelHealth(client: OpenAICompatClient): Promise<{
    ok: boolean;
    expectedModel: string;
    presentModels: string[];
    raw: unknown;
  }>;
  function gpuHealth(
    url: string,
    opts?: { fetch?: typeof globalThis.fetch; timeoutMs?: number }
  ): Promise<{ ok: boolean; tempC?: number; memUsedPct?: number; stub?: boolean; error?: string }>;
  function queueHealth(queue: Queue): { ok: boolean } & QueueDepth;
  function summary(args: {
    tunnelUrl: string;
    client: OpenAICompatClient;
    gpuUrl?: string;
    queue?: Queue;
  }): Promise<{ ok: boolean; tunnel: unknown; model: unknown; gpu: unknown; queue: unknown }>;
}

export interface DefineStationOptions {
  tunnelUrl: string;
  model?: string;
  queueDb?: string;
  fallback?: { url: string; model?: string; apiKey?: string };
  templates?: Readonly<Record<string, JobTemplate>>;
}

export interface Station {
  client: OpenAICompatClient;
  queue: Queue;
  runner: Runner;
  templates: Readonly<Record<string, JobTemplate>>;
}

export function defineStation(opts: DefineStationOptions): Station;
