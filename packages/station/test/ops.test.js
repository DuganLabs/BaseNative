// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as ops from '../src/ops.js';
import { Queue, MemoryQueueDriver } from '../src/queue.js';

function jsonRes(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('ops.tunnelHealth', () => {
  it('reports ok on 200', async () => {
    const fetch = async () => jsonRes({ ok: true });
    const r = await ops.tunnelHealth('http://x', { fetch });
    assert.equal(r.ok, true);
    assert.equal(r.status, 200);
    assert.equal(typeof r.latencyMs, 'number');
  });

  it('reports !ok on 503', async () => {
    const fetch = async () => new Response('down', { status: 503 });
    const r = await ops.tunnelHealth('http://x', { fetch });
    assert.equal(r.ok, false);
  });

  it('returns error when url missing', async () => {
    const r = await ops.tunnelHealth('');
    assert.equal(r.ok, false);
    assert.match(r.error, /url required/);
  });

  it('reports timeout on AbortError', async () => {
    const fetch = (url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const e = new Error('aborted'); e.name = 'AbortError'; reject(e);
      });
    });
    const r = await ops.tunnelHealth('http://x', { fetch, timeoutMs: 5 });
    assert.equal(r.ok, false);
    assert.equal(r.error, 'timeout');
  });
});

describe('ops.modelHealth', () => {
  it('returns ok when expected model present', async () => {
    const fakeClient = {
      model: 'qwen',
      async ping() { return { ok: true, models: ['qwen'], hasExpectedModel: true }; },
    };
    const r = await ops.modelHealth(fakeClient);
    assert.equal(r.ok, true);
    assert.equal(r.expectedModel, 'qwen');
    assert.deepEqual(r.presentModels, ['qwen']);
  });

  it('returns !ok when expected model missing', async () => {
    const fakeClient = {
      model: 'qwen',
      async ping() { return { ok: true, models: ['other'], hasExpectedModel: false }; },
    };
    const r = await ops.modelHealth(fakeClient);
    assert.equal(r.ok, false);
  });

  it('returns error on invalid client', async () => {
    const r = await ops.modelHealth({});
    assert.equal(r.ok, false);
  });
});

describe('ops.gpuHealth', () => {
  it('reports ok when temp + mem are below thresholds', async () => {
    const fetch = async () => jsonRes({ tempC: 60, memUsedPct: 70 });
    const r = await ops.gpuHealth('http://x', { fetch });
    assert.equal(r.ok, true);
    assert.equal(r.tempC, 60);
  });

  it('reports !ok when overheating', async () => {
    const fetch = async () => jsonRes({ tempC: 90, memUsedPct: 50 });
    const r = await ops.gpuHealth('http://x', { fetch });
    assert.equal(r.ok, false);
  });

  it('marks stub:true on transport error', async () => {
    const fetch = async () => { throw new Error('net'); };
    const r = await ops.gpuHealth('http://x', { fetch });
    assert.equal(r.ok, false);
    assert.equal(r.stub, true);
  });
});

describe('ops.queueHealth', () => {
  it('reports ok on shallow queue', () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    q.enqueue({ venture: 'v', intent: 'docs', payload: {} });
    const r = ops.queueHealth(q);
    assert.equal(r.ok, true);
    assert.equal(r.queued, 1);
  });

  it('handles missing queue', () => {
    const r = ops.queueHealth(null);
    assert.equal(r.ok, false);
  });
});

describe('ops.summary', () => {
  it('aggregates the four checks', async () => {
    const q = new Queue({ driver: new MemoryQueueDriver() });
    const client = {
      model: 'qwen',
      async ping() { return { ok: true, models: ['qwen'], hasExpectedModel: true }; },
    };
    // Stub fetch globally for the tunnel/gpu hits inside summary.
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => jsonRes({ ok: true });
    try {
      const r = await ops.summary({ tunnelUrl: 'http://x', client, queue: q });
      assert.equal(r.ok, true);
      assert.equal(r.tunnel.ok, true);
      assert.equal(r.model.ok, true);
      assert.equal(r.queue.ok, true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
