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

export interface QueueDepth {
  queued: number;
  running: number;
  oldestQueuedAgeMs: number;
}

export class Queue {
  constructor(opts: { driver: MemoryQueueDriver });
  driver: MemoryQueueDriver;
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

/** In-memory driver. Rows use the snake_case column names of the SQLite schema. */
export class MemoryQueueDriver {
  jobs: Map<string, Record<string, any>>;
  iterations: Record<string, any>[];
  insertJob(row: Record<string, any>): void;
  updateJob(id: string, patch: Record<string, any>): boolean;
  getJob(id: string): Record<string, any> | null;
  selectQueued(limit?: number): Record<string, any>[];
  list(filters?: { status?: StationJobStatus; venture?: string }): Record<string, any>[];
  insertIteration(row: Record<string, any>): void;
  iterationsFor(jobId: string): Record<string, any>[];
}

export function createQueue(opts?: { path?: string; betterSqlite3?: unknown }): Queue;

/** Every status a job can be in. */
export const QUEUE_STATUSES: readonly StationJobStatus[];
