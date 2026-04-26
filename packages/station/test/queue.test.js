// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Queue, createQueue, MemoryQueueDriver, QUEUE_STATUSES } from '../src/queue.js';

describe('createQueue', () => {
  it('returns an in-memory Queue when no path is given', () => {
    const q = createQueue();
    assert.ok(q instanceof Queue);
  });

  it('falls back to memory driver when better-sqlite3 is missing', () => {
    const q = createQueue({ path: '/tmp/nope.db' });
    assert.ok(q instanceof Queue);
  });
});

describe('Queue.enqueue', () => {
  it('returns the generated id', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const id = q.enqueue({ venture: 'basenative', intent: 'docstring-coverage', payload: {} });
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
  });

  it('persists payload as JSON, decodes on read', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const id = q.enqueue({ venture: 'gp', intent: 'fsm-classifier', payload: { foo: 1 } });
    const [row] = q.list();
    assert.equal(row.id, id);
    assert.deepEqual(row.payload, { foo: 1 });
  });

  it('rejects duplicate ids', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    q.enqueue({ id: 'a', venture: 'v', intent: 'docs', payload: {} });
    assert.throws(() => q.enqueue({ id: 'a', venture: 'v', intent: 'docs', payload: {} }));
  });

  it('applies maxIterations / stallThreshold / escalateTo defaults', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const id = q.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const [row] = q.list();
    assert.equal(row.maxIterations, 10);
    assert.equal(row.stallThreshold, 3);
    assert.equal(row.escalateTo, 'sonnet');
    assert.equal(row.id, id);
  });
});

describe('Queue.claim', () => {
  it('returns null when empty', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    assert.equal(q.claim(), null);
  });

  it('claims oldest queued and flips status to running', async () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    q.enqueue({ id: 'older', venture: 'v', intent: 'docs', payload: {}, createdAt: 1 });
    q.enqueue({ id: 'newer', venture: 'v', intent: 'docs', payload: {}, createdAt: 2 });
    const claimed = q.claim();
    assert.equal(claimed.id, 'older');
    assert.equal(claimed.status, 'running');
  });
});

describe('Queue.recordIteration / complete / escalate / fail', () => {
  it('records iterations and advances counter', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const id = q.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    q.recordIteration(id, { iteration: 1, prompt: 'p', response: 'r', success: false });
    const iters = q.iterationsFor(id);
    assert.equal(iters.length, 1);
    assert.equal(iters[0].iteration, 1);
    assert.equal(iters[0].success, 0);
  });

  it('complete flips status to done', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const id = q.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    q.complete(id);
    assert.equal(q.list()[0].status, 'done');
  });

  it('escalate flips status to escalated and stores reason', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const id = q.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    q.escalate(id, 'stalled');
    const [row] = q.list();
    assert.equal(row.status, 'escalated');
    assert.equal(row.lastError, 'stalled');
  });

  it('fail flips status to failed', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const id = q.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    q.fail(id, 'boom');
    assert.equal(q.list()[0].status, 'failed');
  });

  it('throws on unknown ids', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    assert.throws(() => q.complete('nope'));
    assert.throws(() => q.escalate('nope'));
    assert.throws(() => q.fail('nope'));
    assert.throws(() => q.recordIteration('nope', { iteration: 1, prompt: '', response: '' }));
  });
});

describe('Queue.list', () => {
  it('filters by status and venture', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    q.enqueue({ id: 'a', venture: 'gp', intent: 'docs', payload: {} });
    q.enqueue({ id: 'b', venture: 'bn', intent: 'docs', payload: {} });
    q.complete('b');
    assert.equal(q.list({ status: 'queued' }).length, 1);
    assert.equal(q.list({ venture: 'gp' }).length, 1);
    assert.equal(q.list({ status: 'done', venture: 'bn' }).length, 1);
  });
});

describe('Queue.depth', () => {
  it('returns counts and oldest-queued age', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const t = Date.now() - 5000;
    q.enqueue({ id: 'old', venture: 'v', intent: 'docs', payload: {}, createdAt: t });
    const d = q.depth();
    assert.equal(d.queued, 1);
    assert.equal(d.running, 0);
    assert.ok(d.oldestQueuedAgeMs >= 5000);
  });

  it('reports zero depth when empty', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    assert.deepEqual(q.depth(), { queued: 0, running: 0, oldestQueuedAgeMs: 0 });
  });
});

describe('QUEUE_STATUSES', () => {
  it('exposes the canonical status set', () => {
    assert.ok(QUEUE_STATUSES.includes('queued'));
    assert.ok(QUEUE_STATUSES.includes('escalated'));
    assert.ok(QUEUE_STATUSES.includes('done'));
  });
});
