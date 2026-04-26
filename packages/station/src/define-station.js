// Built with BaseNative — basenative.dev
/**
 * defineStation — single-call factory that wires Client + Queue + Runner
 * with sane defaults.
 *
 * Returns a struct, not a class. The orchestrator's station-dispatcher
 * reaches in and uses pieces individually (e.g. enqueue from one place,
 * run from another long-lived process).
 *
 * Usage:
 *
 *   const station = defineStation({
 *     tunnelUrl:  'https://tower.example.cloudflareaccess.com',
 *     queueDb:    '/var/lib/dugan/station.db', // or ':memory:' for tests
 *     fallback:   { url: 'https://api.cloudflare.com/.../workers-ai', model: 'gpt-oss-120b' },
 *   });
 *
 *   await station.queue.enqueue({ id, venture, intent, payload });
 *   await station.runner.run({ maxIterations: 10 });
 */

import { OpenAICompatClient } from './client.js';
import { createQueue } from './queue.js';
import { Runner } from './runner.js';
import { templates } from './templates/index.js';

/**
 * @param {object} opts
 * @param {string} opts.tunnelUrl                  — primary OpenAI-compatible endpoint
 * @param {string} [opts.model]                    — primary model id (default qwen2.5-coder-7b)
 * @param {string} [opts.queueDb]                  — file path or ':memory:'
 * @param {{url: string, model?: string}} [opts.fallback]
 * @param {object} [opts.templates]                — override template registry
 */
export function defineStation(opts = {}) {
  const {
    tunnelUrl,
    model = 'qwen2.5-coder-7b-instruct',
    queueDb = ':memory:',
    fallback,
    templates: tpl = templates,
  } = opts;

  if (!tunnelUrl) {
    throw new Error('defineStation: tunnelUrl is required');
  }

  const client = new OpenAICompatClient({
    baseUrl: tunnelUrl,
    model,
    ...(fallback ? { fallbackUrl: fallback.url, fallbackModel: fallback.model } : {}),
  });

  const queue = createQueue({ path: queueDb });
  const runner = new Runner({ client, queue, templates: tpl });

  return Object.freeze({ client, queue, runner, templates: tpl });
}
