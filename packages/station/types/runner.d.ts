// Built with BaseNative — basenative.dev

import type { OpenAICompatClient } from './client.js';
import type { Queue, StationJob } from './queue.js';
import type { JobTemplate } from './templates.js';

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
  templates: Readonly<Record<string, JobTemplate>>;
  runOnce(job: StationJob): Promise<RunResult>;
  run(opts?: { maxJobs?: number; maxIterations?: number }): Promise<RunCounters>;
  escalate(job: StationJob, reason: string): void;
}

export function runOnce(args: RunnerOptions & { job: StationJob }): Promise<RunResult>;
export function run(args: RunnerOptions & { maxJobs?: number; maxIterations?: number }): Promise<RunCounters>;
export function escalate(args: { queue: Queue; job: StationJob; reason: string }): void;
