// Built with BaseNative — basenative.dev

import type { OpenAICompatClient } from './client.js';
import type { Queue } from './queue.js';
import type { Runner } from './runner.js';
import type { JobTemplate } from './templates.js';

export { Runner, runOnce, run, escalate } from './runner.js';
export { Queue, createQueue, MemoryQueueDriver } from './queue.js';
export { Client, OpenAICompatClient, StationUnavailable, StationTimeout } from './client.js';
export { templates } from './templates.js';
export * as ops from './ops.js';

export type {
  StationJobIntent,
  StationJobStatus,
  EscalateTo,
  StationJob,
  StationJobInput,
  StationIteration,
  QueueDepth,
} from './queue.js';
export type { ChatRequest, ChatResponse, ClientOptions } from './client.js';
export type { JobTemplate } from './templates.js';
export type { RunnerOptions, RunResult, RunCounters } from './runner.js';

export interface DefineStationOptions {
  tunnelUrl: string;
  model?: string;
  queueDb?: string;
  fallback?: { url: string; model?: string };
  templates?: Readonly<Record<string, JobTemplate>>;
}

export interface Station {
  client: OpenAICompatClient;
  queue: Queue;
  runner: Runner;
  templates: Readonly<Record<string, JobTemplate>>;
}

export function defineStation(opts: DefineStationOptions): Station;
