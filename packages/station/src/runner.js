// Built with BaseNative — basenative.dev
/**
 * Runner — the loop runtime.
 *
 * For each queued job, the runner:
 *   1. Looks up the template for the job's intent.
 *   2. Builds a prompt via `template.buildPrompt(payload)`.
 *   3. Calls the model via the OpenAI-compat client.
 *   4. Runs `template.successCheck(diff, payload)` against the response.
 *   5. Records the iteration; advances or stalls.
 *
 * On stall (repeated failures up to `stallThreshold`) the job escalates
 * to its `escalateTo` policy (sonnet | opus | human). On `maxIterations`
 * the job is failed.
 *
 * Spec note: applying diffs to a worktree is the *consumer's* job.
 * Station emits a structured `applied_diff` row per iteration; the
 * orchestrator-side dispatcher persists, sandboxes, and writes.
 */

const DEFAULT_MAX_ITERATIONS = 10;
const DEFAULT_STALL_THRESHOLD = 3;

export class Runner {
  /**
   * @param {object} opts
   * @param {import('./client.js').OpenAICompatClient} opts.client
   * @param {import('./queue.js').Queue} opts.queue
   * @param {Record<string, any>} opts.templates
   * @param {(args: {jobId: string, iteration: number, prompt: string, response: string})
   *          => Promise<{appliedDiff?: string, success: boolean}>} [opts.applyDiff]
   * @param {(msg: string, ctx?: object) => void} [opts.log]
   */
  constructor(opts) {
    if (!opts?.client) throw new Error('Runner: client is required');
    if (!opts?.queue) throw new Error('Runner: queue is required');
    if (!opts?.templates) throw new Error('Runner: templates is required');
    this.client = opts.client;
    this.queue = opts.queue;
    this.templates = opts.templates;
    this.applyDiff = opts.applyDiff ?? defaultApplyDiff;
    this.log = opts.log ?? (() => {});
  }

  /**
   * Run a single iteration of one job. Caller is responsible for
   * having claimed the job from the queue (status === 'running').
   */
  async runOnce(job) {
    if (!job) throw new Error('Runner.runOnce: job is required');
    const tpl = this.templates[job.intent];
    if (!tpl) {
      this.queue.fail(job.id, `unknown intent '${job.intent}'`);
      return { ok: false, reason: 'unknown-intent' };
    }

    const iteration = (job.iterations ?? 0) + 1;
    const prompt = tpl.buildPrompt(job.payload);
    let response;
    let appliedDiff = null;
    let success;

    try {
      const messages = [
        { role: 'system', content: tpl.systemPrompt ?? defaultSystemPrompt(tpl) },
        { role: 'user', content: prompt },
      ];
      const res = await this.client.chat({
        messages,
        temperature: tpl.temperature ?? 0.2,
        maxTokens: tpl.maxTokens ?? 1024,
      });
      response = res.text;

      const applied = await this.applyDiff({
        jobId: job.id,
        iteration,
        prompt,
        response,
      });
      appliedDiff = applied?.appliedDiff ?? null;

      // successCheck: pure function, runs in-process. Returns boolean.
      success = !!tpl.successCheck(appliedDiff ?? response, job.payload);
    } catch (err) {
      response = `ERROR: ${err.message}`;
      success = false;
      this.log('runOnce.error', { jobId: job.id, iteration, error: err.message });
    }

    this.queue.recordIteration(job.id, {
      iteration,
      prompt,
      response,
      appliedDiff,
      success,
    });

    if (success) {
      this.queue.complete(job.id);
      return { ok: true, iteration, success: true };
    }

    const maxIter = tpl.maxIterations ?? job.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    const stallThreshold = job.stallThreshold ?? DEFAULT_STALL_THRESHOLD;

    // Stall detection: count consecutive failed iterations.
    const recent = this.queue
      .iterationsFor(job.id)
      .slice(-stallThreshold);
    const allFailed =
      recent.length >= stallThreshold && recent.every((r) => r.success === 0);
    if (allFailed) {
      const escalateTo = tpl.escalateTo ?? job.escalateTo ?? 'sonnet';
      this.escalate({ ...job, escalateTo }, `stalled after ${stallThreshold} attempts`);
      return { ok: false, escalated: true, iteration };
    }

    if (iteration >= maxIter) {
      this.queue.fail(job.id, `exceeded maxIterations (${maxIter})`);
      return { ok: false, failed: true, iteration };
    }

    // Otherwise: leave running; next pass through the loop will pick it up.
    // (We don't auto-requeue; the run() loop decides whether to retry now.)
    return { ok: false, iteration, success: false };
  }

  /**
   * Drive the loop: claim → runOnce → repeat. Bounded by `opts.maxJobs`
   * (total jobs processed) and `opts.maxIterations` (per job, soft cap
   * — templates may set tighter ones).
   *
   * Returns aggregate counters for ops/observability.
   */
  async run(opts = {}) {
    const maxJobs = opts.maxJobs ?? Infinity;
    const counters = { processed: 0, completed: 0, escalated: 0, failed: 0 };

    while (counters.processed < maxJobs) {
      const job = this.queue.claim();
      if (!job) break;

      // Per-job inner loop: keep running until done/escalated/failed
      // or job's max iterations reached.
      let iter = 0;
      const cap = opts.maxIterations ?? job.maxIterations ?? DEFAULT_MAX_ITERATIONS;
      while (iter < cap + 1) {
        iter += 1;
        const refreshed = { ...job, iterations: this.queue.list({}).find((j) => j.id === job.id)?.iterations ?? job.iterations };
        const r = await this.runOnce(refreshed);
        if (r.ok) { counters.completed += 1; break; }
        if (r.escalated) { counters.escalated += 1; break; }
        if (r.failed) { counters.failed += 1; break; }
        if (iter >= cap) {
          this.queue.fail(job.id, `exceeded maxIterations (${cap})`);
          counters.failed += 1;
          break;
        }
      }
      counters.processed += 1;
    }

    return counters;
  }

  /**
   * Move a job from 'running' to 'escalated' per its `escalateTo` policy.
   * The dispatcher upstream watches for `status === 'escalated'` and
   * routes those jobs to Sonnet / Opus / human queue.
   */
  escalate(job, reason) {
    if (!job?.id) throw new Error('Runner.escalate: job.id required');
    this.queue.escalate(job.id, `${reason} -> ${job.escalateTo ?? 'sonnet'}`);
    this.log('runner.escalate', { jobId: job.id, escalateTo: job.escalateTo, reason });
  }
}

// ────────────────────────────────────────────────────────────────────
// Free-standing exports for the spec's named API surface.

export async function runOnce({ client, queue, templates, job, applyDiff, log }) {
  const r = new Runner({ client, queue, templates, applyDiff, log });
  return r.runOnce(job);
}

export async function run({ client, queue, templates, applyDiff, log, ...opts }) {
  const r = new Runner({ client, queue, templates, applyDiff, log });
  return r.run(opts);
}

export function escalate({ queue, job, reason }) {
  queue.escalate(job.id, `${reason} -> ${job.escalateTo ?? 'sonnet'}`);
}

// ────────────────────────────────────────────────────────────────────

function defaultSystemPrompt(tpl) {
  return [
    'You are Station, a tightly-scoped local-inference loop worker.',
    'Make the smallest correct change. Output ONLY the requested artifact (a unified diff, a single test, a single docstring).',
    'No prose, no markdown fences unless the template asks for them.',
    `Template: ${tpl.name}. ${tpl.description ?? ''}`,
  ].join(' ');
}

/**
 * Default applyDiff is a no-op: it passes the model response through
 * unchanged as the "applied diff." Real consumers (the orchestrator's
 * station-dispatcher) replace this with a sandboxed worktree writer.
 *
 * Keeping the default a pure function makes the runner testable in
 * Workers contexts that have no filesystem.
 */
async function defaultApplyDiff({ response }) {
  return { appliedDiff: response, success: false };
}
