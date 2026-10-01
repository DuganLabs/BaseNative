// Built with BaseNative — basenative.dev

import type { OpenAICompatClient } from './client.js';
import type { Queue, QueueDepth } from './queue.js';

export function tunnelHealth(
  url: string,
  opts?: { fetch?: typeof globalThis.fetch; timeoutMs?: number }
): Promise<{ ok: boolean; status?: number; latencyMs?: number; error?: string }>;
export function modelHealth(client: OpenAICompatClient): Promise<{
  ok: boolean;
  expectedModel: string;
  presentModels: string[];
  raw: unknown;
}>;
export function gpuHealth(
  url: string,
  opts?: { fetch?: typeof globalThis.fetch; timeoutMs?: number }
): Promise<{ ok: boolean; tempC?: number; memUsedPct?: number; stub?: boolean; error?: string }>;
export function queueHealth(queue: Queue): { ok: boolean } & QueueDepth;
export function summary(args: {
  tunnelUrl: string;
  client: OpenAICompatClient;
  gpuUrl?: string;
  queue?: Queue;
}): Promise<{ ok: boolean; tunnel: unknown; model: unknown; gpu: unknown; queue: unknown }>;
