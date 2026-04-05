import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResource, createMutation, createCache, fetchJson } from './index.js';

describe('createResource', () => {
  it('fetches data immediately by default', async () => {
    const resource = createResource(async () => ({ items: [1, 2, 3] }));
    // Wait for async fetch to complete
    await new Promise(r => setTimeout(r, 10));
    assert.deepEqual(resource.data(), { items: [1, 2, 3] });
    assert.equal(resource.loading(), false);
    assert.equal(resource.error(), null);
    assert.equal(resource.status(), 'success');
  });

  it('respects immediate: false', () => {
    const resource = createResource(async () => 'data', { immediate: false });
    assert.equal(resource.data(), null);
    assert.equal(resource.status(), 'idle');
  });

  it('handles fetch errors', async () => {
    const resource = createResource(async () => { throw new Error('fail'); });
    await new Promise(r => setTimeout(r, 10));
    assert.equal(resource.error().message, 'fail');
    assert.equal(resource.status(), 'error');
  });

  it('supports manual refetch', async () => {
    let count = 0;
    const resource = createResource(async () => ++count, { immediate: false });
    await resource.fetch();
    assert.equal(resource.data(), 1);
    await resource.refetch();
    assert.equal(resource.data(), 2);
  });

  it('supports optimistic mutation', async () => {
    const resource = createResource(async () => [1, 2, 3]);
    await new Promise(r => setTimeout(r, 10));
    resource.mutate(prev => [...prev, 4]);
    assert.deepEqual(resource.data(), [1, 2, 3, 4]);
  });

  it('uses initialData', () => {
    const resource = createResource(async () => 'fetched', { immediate: false, initialData: 'initial' });
    assert.equal(resource.data(), 'initial');
  });
});

describe('createMutation', () => {
  it('performs mutation and returns result', async () => {
    const mutation = createMutation(async (data) => ({ ...data, id: 1 }));
    const result = await mutation.mutate({ name: 'Alice' });
    assert.deepEqual(result, { name: 'Alice', id: 1 });
    assert.equal(mutation.status(), 'success');
  });

  it('handles mutation errors', async () => {
    const mutation = createMutation(async () => { throw new Error('fail'); });
    await mutation.mutate();
    assert.equal(mutation.status(), 'error');
    assert.equal(mutation.error().message, 'fail');
  });

  it('calls onSuccess callback', async () => {
    let called = false;
    const mutation = createMutation(async () => 'ok', {
      onSuccess: () => { called = true; },
    });
    await mutation.mutate();
    assert.ok(called);
  });

  it('resets state', async () => {
    const mutation = createMutation(async () => 'data');
    await mutation.mutate();
    assert.equal(mutation.status(), 'success');
    mutation.reset();
    assert.equal(mutation.status(), 'idle');
  });
});

describe('createCache', () => {
  it('stores and retrieves data', () => {
    const cache = createCache();
    cache.set('key1', { value: 42 });
    assert.deepEqual(cache.get('key1'), { value: 42 });
  });

  it('returns undefined for missing keys', () => {
    const cache = createCache();
    assert.equal(cache.get('missing'), undefined);
  });

  it('expires entries', async () => {
    const cache = createCache({ maxAge: 10 });
    cache.set('key1', 'data');
    assert.ok(cache.has('key1'));
    await new Promise(r => setTimeout(r, 20));
    assert.ok(!cache.has('key1'));
  });

  it('invalidates specific key', () => {
    const cache = createCache();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.invalidate('a');
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
  });

  it('invalidates all keys', () => {
    const cache = createCache();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.invalidate();
    assert.equal(cache.size, 0);
  });

  it('evicts oldest when maxSize exceeded', () => {
    const cache = createCache({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('c'), 3);
  });
});

// --- Additional tests ---

describe('createResource – extended', () => {
  it('passes params to fetcher', async () => {
    let received;
    const resource = createResource(
      async (params) => { received = params; return params; },
      { immediate: false },
    );
    await resource.fetch({ page: 2 });
    assert.deepEqual(received, { page: 2 });
  });

  it('mutate with direct value replaces data', async () => {
    const resource = createResource(async () => 'original', { immediate: false });
    await resource.fetch();
    resource.mutate('replaced');
    assert.equal(resource.data(), 'replaced');
  });

  it('status is idle before first fetch when immediate is false', () => {
    const resource = createResource(async () => 'x', { immediate: false });
    assert.equal(resource.status(), 'idle');
  });

  it('error is cleared on subsequent successful fetch', async () => {
    let shouldFail = true;
    const resource = createResource(async () => {
      if (shouldFail) throw new Error('temporary');
      return 'recovered';
    }, { immediate: false });
    await resource.fetch();
    assert.equal(resource.status(), 'error');
    shouldFail = false;
    await resource.fetch();
    assert.equal(resource.status(), 'success');
    assert.equal(resource.error(), null);
  });

  it('loading signal is true while fetching', async () => {
    let resolveIt;
    const resource = createResource(
      () => new Promise((res) => { resolveIt = res; }),
      { immediate: false },
    );
    const fetchPromise = resource.fetch();
    assert.equal(resource.loading(), true);
    resolveIt('done');
    await fetchPromise;
    assert.equal(resource.loading(), false);
  });

  it('refetch returns fresh data', async () => {
    let n = 0;
    const resource = createResource(async () => ++n, { immediate: false });
    await resource.fetch();
    const v1 = resource.data();
    await resource.refetch();
    const v2 = resource.data();
    assert.ok(v2 > v1);
  });
});

describe('createMutation – extended', () => {
  it('calls onError callback on failure', async () => {
    let errorReceived;
    const mutation = createMutation(
      async () => { throw new Error('boom'); },
      { onError: (err) => { errorReceived = err; } },
    );
    await mutation.mutate('input');
    assert.equal(errorReceived.message, 'boom');
  });

  it('onSuccess receives result and params', async () => {
    let cbResult, cbParams;
    const mutation = createMutation(
      async (p) => ({ ...p, id: 99 }),
      {
        onSuccess: (result, params) => {
          cbResult = result;
          cbParams = params;
        },
      },
    );
    await mutation.mutate({ name: 'X' });
    assert.deepEqual(cbResult, { name: 'X', id: 99 });
    assert.deepEqual(cbParams, { name: 'X' });
  });

  it('loading is true while mutation is in-flight', async () => {
    let resolveIt;
    const mutation = createMutation(() => new Promise((res) => { resolveIt = res; }));
    const p = mutation.mutate();
    assert.equal(mutation.loading(), true);
    resolveIt('ok');
    await p;
    assert.equal(mutation.loading(), false);
  });

  it('reset clears data and error', async () => {
    const mutation = createMutation(async () => { throw new Error('e'); });
    await mutation.mutate();
    assert.equal(mutation.status(), 'error');
    mutation.reset();
    assert.equal(mutation.data(), null);
    assert.equal(mutation.error(), null);
    assert.equal(mutation.status(), 'idle');
  });

  it('mutate returns null on error', async () => {
    const mutation = createMutation(async () => { throw new Error('oops'); });
    const result = await mutation.mutate();
    assert.equal(result, null);
  });
});

describe('createCache – extended', () => {
  it('has() returns false for missing keys', () => {
    const cache = createCache();
    assert.equal(cache.has('nope'), false);
  });

  it('has() returns false for expired entries', async () => {
    const cache = createCache({ maxAge: 5 });
    cache.set('x', 1);
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(cache.has('x'), false);
  });

  it('size reflects current count', () => {
    const cache = createCache();
    assert.equal(cache.size, 0);
    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.size, 2);
  });

  it('set overwrites existing value', () => {
    const cache = createCache();
    cache.set('k', 'first');
    cache.set('k', 'second');
    assert.equal(cache.get('k'), 'second');
  });
});

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ hello: 'world' }),
    });
    try {
      const data = await fetchJson('https://example.com/api');
      assert.deepEqual(data, { hello: 'world' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws with status message on non-ok response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    try {
      await assert.rejects(
        () => fetchJson('https://example.com/missing'),
        (err) => {
          assert.ok(err.message.includes('404'));
          assert.equal(err.status, 404);
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('passes custom headers to fetch', async () => {
    const originalFetch = globalThis.fetch;
    let capturedInit;
    globalThis.fetch = async (_url, init) => {
      capturedInit = init;
      return { ok: true, json: async () => ({}) };
    };
    try {
      await fetchJson('https://example.com/api', {
        headers: { Authorization: 'Bearer tok' },
      });
      assert.equal(capturedInit.headers.Authorization, 'Bearer tok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('serialises body to JSON string', async () => {
    const originalFetch = globalThis.fetch;
    let capturedInit;
    globalThis.fetch = async (_url, init) => {
      capturedInit = init;
      return { ok: true, json: async () => ({}) };
    };
    try {
      await fetchJson('https://example.com/api', {
        method: 'POST',
        body: { key: 'val' },
      });
      assert.equal(capturedInit.body, JSON.stringify({ key: 'val' }));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sets Content-Type: application/json by default', async () => {
    const originalFetch = globalThis.fetch;
    let capturedInit;
    globalThis.fetch = async (_url, init) => {
      capturedInit = init;
      return { ok: true, json: async () => ({}) };
    };
    try {
      await fetchJson('https://example.com/api');
      assert.equal(capturedInit.headers['Content-Type'], 'application/json');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not set body when body option is absent', async () => {
    const originalFetch = globalThis.fetch;
    let capturedInit;
    globalThis.fetch = async (_url, init) => {
      capturedInit = init;
      return { ok: true, json: async () => ({}) };
    };
    try {
      await fetchJson('https://example.com/api', { method: 'GET' });
      assert.equal(capturedInit.body, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('createResource — abort handling', () => {
  it('AbortError is silently ignored and does not update error signal', async () => {
    const resource = createResource(async () => {
      const err = new DOMException('aborted', 'AbortError');
      throw err;
    }, { immediate: false });
    await resource.fetch();
    // AbortError must not propagate to error signal
    assert.equal(resource.error(), null);
  });

  it('fetcher receives signal as second argument', async () => {
    let receivedSignal;
    const resource = createResource(async (_params, opts) => {
      receivedSignal = opts?.signal;
      return 'done';
    }, { immediate: false });
    await resource.fetch();
    assert.ok(receivedSignal instanceof AbortSignal);
  });
});

describe('createCache — additional', () => {
  it('multiple sets to same key do not grow the cache beyond 1 entry', () => {
    const cache = createCache({ maxSize: 5 });
    for (let i = 0; i < 10; i++) {
      cache.set('same', i);
    }
    assert.equal(cache.size, 1);
    assert.equal(cache.get('same'), 9);
  });

  it('get returns undefined for expired entry', async () => {
    const cache = createCache({ maxAge: 5 });
    cache.set('temp', 'value');
    await new Promise(r => setTimeout(r, 15));
    assert.equal(cache.get('temp'), undefined);
  });

  it('invalidate with no args clears all entries', () => {
    const cache = createCache();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.invalidate();
    assert.equal(cache.size, 0);
  });
});

describe('createResource — status signal', () => {
  it('status is "success" after successful fetch', async () => {
    const resource = createResource(async () => 'data', { immediate: false });
    await resource.fetch();
    assert.equal(resource.status(), 'success');
  });

  it('status is "error" after failed fetch', async () => {
    const resource = createResource(async () => {
      throw new Error('fail');
    }, { immediate: false });
    await resource.fetch();
    assert.equal(resource.status(), 'error');
  });

  it('status is "idle" when no data and no error', () => {
    const resource = createResource(async () => 'data', { immediate: false });
    assert.equal(resource.status(), 'idle');
  });
});

describe('createMutation — status signal', () => {
  it('status is "success" after successful mutation', async () => {
    const m = createMutation(async () => 'done');
    await m.mutate();
    assert.equal(m.status(), 'success');
  });

  it('status is "error" after failed mutation', async () => {
    const m = createMutation(async () => { throw new Error('fail'); });
    await m.mutate();
    assert.equal(m.status(), 'error');
  });

  it('status is "idle" initially', () => {
    const m = createMutation(async () => 'ok');
    assert.equal(m.status(), 'idle');
  });
});

describe('fetchJson — additional', () => {
  it('custom headers override Content-Type when provided', async () => {
    const originalFetch = globalThis.fetch;
    let capturedInit;
    globalThis.fetch = async (_url, init) => {
      capturedInit = init;
      return { ok: true, json: async () => ({}) };
    };
    try {
      await fetchJson('https://example.com/api', {
        headers: { 'X-Custom': 'value', 'Content-Type': 'text/plain' },
      });
      // User headers override the default Content-Type
      assert.equal(capturedInit.headers['Content-Type'], 'text/plain');
      assert.equal(capturedInit.headers['X-Custom'], 'value');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('error includes statusText in message', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 503, statusText: 'Service Unavailable' });
    try {
      await assert.rejects(
        () => fetchJson('https://example.com/api'),
        (err) => {
          assert.ok(err.message.includes('503'));
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
