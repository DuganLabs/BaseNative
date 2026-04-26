// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Runner, runOnce, run } from '../src/runner.js';
import { Queue, MemoryQueueDriver } from '../src/queue.js';

/**
 * Mock client that returns whatever text the test queues up.
 */
class MockClient {
  constructor(responses) {
    this.responses = [...responses];
    this.calls = [];
  }
  async chat(req) {
    this.calls.push(req);
    if (this.responses.length === 0) throw new Error('mock exhausted');
    const next = this.responses.shift();
    if (next instanceof Error) throw next;
    return { text: next, usage: null, latencyMs: 1, source: 'primary' };
  }
}

const passingTemplate = Object.freeze({
  name: 't-pass',
  description: 'always succeeds',
  buildPrompt: () => 'prompt',
  successCheck: () => true,
  maxIterations: 3,
  escalateTo: 'sonnet',
});

const failingTemplate = Object.freeze({
  name: 't-fail',
  description: 'always fails',
  buildPrompt: () => 'prompt',
  successCheck: () => false,
  maxIterations: 5,
  escalateTo: 'sonnet',
});

describe('Runner constructor', () => {
  it('requires client/queue/templates', () => {
    assert.throws(() => new Runner({}));
    assert.throws(() => new Runner({ client: {} }));
    assert.throws(() => new Runner({ client: {}, queue: {} }));
  });
});

describe('Runner.runOnce', () => {
  it('completes a job whose successCheck returns true', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient(['ok']);
    const runner = new Runner({ client, queue, templates: { docs: passingTemplate } });
    const id = queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const job = queue.claim();
    const r = await runner.runOnce(job);
    assert.equal(r.ok, true);
    assert.equal(queue.list({ status: 'done' })[0].id, id);
  });

  it('records iteration history on success', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient(['hello']);
    const runner = new Runner({ client, queue, templates: { docs: passingTemplate } });
    const id = queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const job = queue.claim();
    await runner.runOnce(job);
    const iters = queue.iterationsFor(id);
    assert.equal(iters.length, 1);
    assert.equal(iters[0].success, 1);
  });

  it('marks unknown intent as failed', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const runner = new Runner({ client: new MockClient([]), queue, templates: {} });
    const id = queue.enqueue({ venture: 'v', intent: 'mystery', payload: {} });
    const job = queue.claim();
    const r = await runner.runOnce(job);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'unknown-intent');
    assert.equal(queue.list()[0].status, 'failed');
    assert.ok(id);
  });

  it('records failed iteration when successCheck returns false', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient(['bad']);
    const runner = new Runner({ client, queue, templates: { docs: failingTemplate } });
    const id = queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const job = queue.claim();
    const r = await runner.runOnce(job);
    assert.equal(r.ok, false);
    const iters = queue.iterationsFor(id);
    assert.equal(iters.length, 1);
    assert.equal(iters[0].success, 0);
  });

  it('escalates after stallThreshold consecutive failures', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient(['x', 'y', 'z']);
    const runner = new Runner({ client, queue, templates: { docs: failingTemplate } });
    const id = queue.enqueue({
      venture: 'v', intent: 'docs', payload: {}, stallThreshold: 3, maxIterations: 10,
    });
    const job = queue.claim();
    // run three failing iterations
    await runner.runOnce({ ...job, iterations: 0 });
    await runner.runOnce({ ...job, iterations: 1 });
    const r = await runner.runOnce({ ...job, iterations: 2 });
    assert.equal(r.escalated, true);
    assert.equal(queue.list()[0].status, 'escalated');
    assert.ok(id);
  });

  it('records ERROR text and remains running on transport failure', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient([new Error('net down')]);
    const runner = new Runner({ client, queue, templates: { docs: passingTemplate } });
    queue.enqueue({ id: 'j', venture: 'v', intent: 'docs', payload: {} });
    const job = queue.claim();
    const r = await runner.runOnce(job);
    assert.equal(r.ok, false);
    const iters = queue.iterationsFor('j');
    assert.match(iters[0].response, /^ERROR:/);
  });
});

describe('Runner.escalate', () => {
  it('moves job to escalated and stamps reason', () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const runner = new Runner({ client: new MockClient([]), queue, templates: {} });
    const id = queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    runner.escalate({ id, escalateTo: 'opus' }, 'because');
    const [row] = queue.list();
    assert.equal(row.status, 'escalated');
    assert.match(row.lastError, /opus/);
    assert.match(row.lastError, /because/);
  });
});

describe('Runner.run loop', () => {
  it('drains a queue of mixed-outcome jobs', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient(['ok', 'ok']);
    const runner = new Runner({ client, queue, templates: { docs: passingTemplate } });
    queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const counters = await runner.run({ maxJobs: 10 });
    assert.equal(counters.processed, 2);
    assert.equal(counters.completed, 2);
  });

  it('respects maxJobs', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient(['ok', 'ok']);
    const runner = new Runner({ client, queue, templates: { docs: passingTemplate } });
    queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const counters = await runner.run({ maxJobs: 1 });
    assert.equal(counters.processed, 1);
  });

  it('counts escalations in counters', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    const client = new MockClient(['x', 'y', 'z']);
    const runner = new Runner({ client, queue, templates: { docs: failingTemplate } });
    queue.enqueue({ venture: 'v', intent: 'docs', payload: {}, stallThreshold: 3, maxIterations: 10 });
    const counters = await runner.run({ maxJobs: 1 });
    assert.equal(counters.escalated, 1);
  });
});

describe('runOnce / run free-standing exports', () => {
  it('runOnce works as a function', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    queue.enqueue({ id: 'j', venture: 'v', intent: 'docs', payload: {} });
    const job = queue.claim();
    const r = await runOnce({
      client: new MockClient(['ok']),
      queue,
      templates: { docs: passingTemplate },
      job,
    });
    assert.equal(r.ok, true);
  });

  it('run works as a function', async () => {
    const queue = new Queue({ driver: new MemoryQueueDriver() });
    queue.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const counters = await run({
      client: new MockClient(['ok']),
      queue,
      templates: { docs: passingTemplate },
      maxJobs: 1,
    });
    assert.equal(counters.completed, 1);
  });
});
